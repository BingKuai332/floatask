'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { resolveModel } = require('../src/main/model-config');

test('screenshot override inherits the global endpoint, key and parameters rather than the text task service', () => {
  const config = {
    provider:'default', baseUrl:'https://default.test/v1', apiKey:'default-key', model:'default-model',
    temperature:0.4, maxTokens:1200, vision:true,
    modelProfiles:{
      initial:{enabled:true, customService:true, provider:'custom', baseUrl:'https://text.test/v1', apiKey:'text-key', model:'text-model', temperature:0.1, maxTokens:512, vision:true},
      vision:{enabled:true, customService:false, model:'vision-model', vision:true}
    }
  };
  const text = resolveModel(config,'initial',false);
  const image = resolveModel(config,'initial',true);
  assert.equal(text.baseUrl,'https://text.test/v1');
  assert.equal(text.apiKey,'text-key');
  assert.equal(image.baseUrl,'https://default.test/v1');
  assert.equal(image.apiKey,'default-key');
  assert.equal(image.provider,'default');
  assert.equal(image.model,'vision-model');
  assert.equal(image.temperature,0.4);
  assert.equal(image.maxTokens,1200);
  config.modelProfiles.vision.model = '';
  assert.equal(resolveModel(config,'initial',true).model,'default-model');
});

function withStore(initial, run) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'floatask-model-bugs-'));
  try {
    const filename=path.resolve(__dirname,'../src/main/store.js');
    const actualRequire=createRequire(filename);
    const disk={...fs};
    if(initial!==undefined)fs.writeFileSync(path.join(directory,'config.json'),initial);
    const electron={app:{getPath:()=>directory,getLocale:()=>'en'},safeStorage:{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()}};
    const context={require:name=>name==='electron'?electron:name==='fs'?disk:actualRequire(name),module:{exports:{}},console};
    vm.runInNewContext(fs.readFileSync(filename,'utf8'),context);
    run(context.module.exports,disk,directory);
  } finally {
    if(path.dirname(directory)===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-model-bugs-'))fs.rmSync(directory,{recursive:true,force:true});
  }
}

test('valid JSON with an invalid configuration shape recovers defaults instead of crashing startup', () => {
  for(const initial of ['null','[]','1','true','"text"']) withStore(initial,store=>{
    assert.equal(store.getConfig().provider,'deepseek');
    assert.equal(store.getConfig().hotkey,'Alt+Q');
    assert.equal(store.getConfig().apiKey,'');
  });
});

test('font application scope is actually persisted when changed', () => withStore(undefined,(store,_disk,directory)=>{
  store.save({fontScope:'reading'});
  assert.equal(store.getConfig().fontScope,'reading');
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'config.json'),'utf8')).fontScope,'reading');
  store.save({fontScope:'all'});
  assert.equal(store.getConfig().fontScope,'all');
}));

test('failed position and onboarding writes do not leave an unsaved in-memory configuration', () => withStore(undefined,(store,disk)=>{
  store.save({onboarded:false});
  disk.renameSync=()=>{throw new Error('Disk write failed');};
  assert.throws(()=>store.setBubblePosition(100,200),/Disk write failed/);
  assert.equal(store.getConfig().bubblePosition,null);
  assert.throws(()=>store.markOnboarded(),/Disk write failed/);
  assert.equal(store.getConfig().onboarded,false);
}));
