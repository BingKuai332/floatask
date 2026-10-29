'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { createRequire } = require('module');
const { normalizeHotkey, fromKeyboard } = require('../src/shared/hotkeys');
const { resolveModel } = require('../src/main/model-config');
const { createUpdater, releaseInfo, isNewer } = require('../src/main/updater');
function temporary(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-config-'));
  const cleanup = () => { if (path.dirname(directory) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-config-')) fs.rmSync(directory, {recursive:true,force:true}); };
  try { const result = fn(directory); if (result?.then) return result.finally(cleanup); cleanup(); return result; } catch(error) {cleanup();throw error;}
}
test('custom shortcuts normalize physical keys and reject invalid/reserved combinations', () => {
 assert.equal(normalizeHotkey('Alt+Ctrl+Shift+K'),'Ctrl+Alt+Shift+K');
 assert.equal(normalizeHotkey('Ctrl+F12'),'Ctrl+F12');
 for (const key of ['Shift+A','A','Alt+Tab','Alt+F4','Ctrl+Ctrl+X','Meta+Q','Ctrl+X+Y']) assert.equal(normalizeHotkey(key),null,key);
 assert.equal(fromKeyboard({key:'K',code:'KeyK',ctrlKey:true,shiftKey:true}),'Ctrl+Shift+K');
 assert.equal(fromKeyboard({key:'q',code:'KeyQ',ctrlKey:true,isComposing:true}),null);
});
test('task models route images only with consent and never inherit keys across independent endpoints', () => {
 const config={provider:'default',baseUrl:'https://default.test',model:'default',apiKey:'default-secret',vision:true,modelProfiles:{
  initial:{enabled:true,model:'fast',vision:true},followup:{enabled:true,model:'reasoning',vision:false},
  vision:{enabled:true,model:'vision',customService:true,baseUrl:'https://vision.test',apiKey:'vision-secret',vision:true}
 }};
 assert.equal(resolveModel(config,'initial').model,'fast');
 assert.equal(resolveModel(config,'followup',true).model,'reasoning');
 assert.equal(resolveModel(config,'followup',true).vision,false);
 assert.equal(resolveModel(config,'initial',true).apiKey,'vision-secret');
 assert.equal(resolveModel({...config,vision:false},'initial',true).model,'fast');
 assert.equal(resolveModel({...config,modelProfiles:{initial:{enabled:true,customService:true,model:'custom',baseUrl:'https://other.test'}}},'initial').apiKey,'');
 assert.equal(config.model,'default');
});
test('store persists custom shortcut and encrypted profile keys; public settings never expose credentials', () => temporary(directory => {
 const filename=path.resolve(__dirname,'../src/main/store.js');
 const actualRequire=createRequire(filename);
 const electron={app:{getPath:()=>directory,getLocale:()=>'en'},safeStorage:{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()}};
 const context={require:name=>name==='electron'?electron:actualRequire(name),module:{exports:{}},console};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),context);const store=context.module.exports;
 store.save({apiKey:'global-secret',hotkey:'Ctrl+Alt+Shift+K',modelProfiles:{initial:{enabled:true,model:'fast',customService:true,baseUrl:'https://other.test',apiKey:'profile-secret'}}});
 assert.equal(store.getConfig().hotkey,'Ctrl+Alt+Shift+K');
 assert.equal(store.getConfig().modelProfiles.initial.apiKey,'profile-secret');
 const raw=fs.readFileSync(store.getConfigPath(),'utf8');assert(!raw.includes('profile-secret'));assert(!raw.includes('global-secret'));
 const exposed=JSON.stringify(store.publicSettings());assert(!exposed.includes('apiKeyEnc'));assert(!exposed.includes('profile-secret'));assert(!exposed.includes('global-secret'));
 store.save({modelProfiles:{initial:{apiKey:''}}});assert.equal(store.getConfig().modelProfiles.initial.apiKey,'profile-secret');
 store.save({modelProfiles:{initial:{clearApiKey:true}}});assert.equal(store.getConfig().modelProfiles.initial.apiKey,'');
}));
const bytes=Buffer.from('mock update archive');
const zipName='FloatAsk-v0.4.0-win32-x64.zip';
const zipUrl='https://github.com/BingKuai332/floatask/releases/download/v0.4.0/'+zipName;
const release={tag_name:'v0.4.0',assets:[{name:zipName,size:bytes.length,browser_download_url:zipUrl},{name:zipName+'.sha256',browser_download_url:zipUrl+'.sha256'}]};
test('release metadata excludes prereleases, downgrades and untrusted assets', () => {
 assert(isNewer('v0.10.0','0.3.0')); assert(!isNewer('0.2.9','0.3.0'));
 assert.equal(releaseInfo({...release,prerelease:true},'0.3.0'),null);
 assert.throws(()=>releaseInfo({...release,assets:[]},'0.3.0'),/noPackage/);
 assert.throws(()=>releaseInfo({...release,assets:[{...release.assets[0],browser_download_url:'https://evil.test/x'},release.assets[1]]},'0.3.0'),/invalidSource/);
});
test('updater downloads verified bytes, rejects corruption and prevents duplicate checks', async () => temporary(async directory => {
 let corrupt=false,calls=0;
 const request=async url=> {
  calls++;
  if(url.includes('/releases/latest')) {await new Promise(resolve=>setTimeout(resolve,10));return Response.json(release);}
  if(url.endsWith('.sha256')) return new Response((corrupt?'0'.repeat(64):crypto.createHash('sha256').update(bytes).digest('hex'))+'  '+zipName+'\n');
  return new Response(bytes);
 };
 const options={app:{getVersion:()=>'0.3.0',getPath:()=>directory,isPackaged:true},platform:'win32',request};
 const updater=createUpdater(options);
 await Promise.all([updater.check(),updater.check()]);assert.equal(calls,1);
 assert.equal(updater.getState().phase,'available');
 assert.equal((await updater.download()).phase,'ready');
 assert.deepEqual(fs.readFileSync(path.join(directory,'updates',zipName)),bytes);
 corrupt=true;const bad=createUpdater(options);await bad.check();
 assert.equal((await bad.download()).error,'update.checksum');
 assert.equal(fs.existsSync(path.join(directory,'updates',zipName+'.part')),false);
 assert.equal((await bad.install()).ok,false);
}));
test('development builds check releases but do not install or download', async () => temporary(async directory => {
 const updater=createUpdater({app:{getVersion:()=>'0.3.0',getPath:()=>directory,isPackaged:false},request:async()=>Response.json(release)});
 await updater.check();assert.equal(updater.getState().canInstall,false);
 assert.equal((await updater.download()).error,'update.devOnly');
}));
