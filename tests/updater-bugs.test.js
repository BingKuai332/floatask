'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { createUpdater } = require('../src/main/updater');

async function fixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-updater-bugs-'));
  const bytes = Buffer.from('verified update fixture');
  const name = 'FloatAsk-v0.4.0-win32-x64.zip';
  const base = 'https://github.com/BingKuai332/floatask/releases/download/v0.4.0/';
  const release = {tag_name:'v0.4.0',assets:[{name,size:bytes.length,browser_download_url:base+name},{name:name+'.sha256',browser_download_url:base+name+'.sha256'}]};
  const app = {getVersion:()=>'0.3.0',getPath:()=>directory,isPackaged:true};
  const executable = path.join(directory,'FloatAsk.exe');
  fs.writeFileSync(executable,'existing executable');
  const request = async url => url.includes('/releases/latest') ? Response.json(release) : new Response(url.endsWith('.sha256') ? crypto.createHash('sha256').update(bytes).digest('hex')+'  '+name+'\n' : bytes);
  try { await run({directory,app,executable,request,name}); }
  finally { if (path.dirname(directory)===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-updater-bugs-')) fs.rmSync(directory,{recursive:true,force:true}); }
}

test('a partial-file cleanup failure does not reject the download or lock future update checks', async () => fixture(async options => {
  const updater=createUpdater({...options,platform:'win32'});
  await updater.check();
  const original=fs.promises.rm;
  fs.promises.rm=async filename=>{if(filename.endsWith('.part'))throw Object.assign(new Error('temporary lock'),{code:'EPERM'});return original(filename,{force:true});};
  try { assert.equal((await updater.download()).phase,'ready'); }
  finally { fs.promises.rm=original; }
  // Download remains callable after cleanup failures instead of returning forever busy.
  assert.equal((await updater.download()).phase,'ready');
}));

test('installation waits for helper readiness before telling the app to quit', async () => fixture(async options => {
  let child, acknowledged=false;
  const updater=createUpdater({...options,platform:'win32',launch:(_command,args,spawnOptions)=>{
    assert.equal(spawnOptions.windowsHide,true);
    const task=JSON.parse(fs.readFileSync(args[args.indexOf('-TaskFile')+1],'utf8'));
    child=new EventEmitter();child.exitCode=null;child.unref=()=>{};child.kill=()=>{};
    process.nextTick(()=>child.emit('spawn'));
    setTimeout(()=>{acknowledged=true;fs.writeFileSync(task.readyFile,'{"ready":true}');},30);
    return child;
  }});
  await updater.check();await updater.download();
  assert.deepEqual(await updater.install(),{ok:true});
  assert.equal(acknowledged,true);
  assert.equal(updater.getState().phase,'installing');
}));

test('an early helper exit fails installation without allowing the application to quit', async () => fixture(async options => {
  let killed=false;
  const updater=createUpdater({...options,platform:'win32',launch:()=>{
    const child=new EventEmitter();child.exitCode=null;child.unref=()=>{};child.kill=()=>{killed=true;};
    process.nextTick(()=>{child.emit('spawn');child.exitCode=1;});
    return child;
  }});
  await updater.check();await updater.download();
  assert.deepEqual(await updater.install(),{ok:false});
  assert.equal(updater.getState().error,'update.installFailed');
  assert.equal(killed,true);
}));
