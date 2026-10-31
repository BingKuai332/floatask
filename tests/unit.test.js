'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { LOCALES, createT, normalizeLocale } = require('../src/shared/i18n');

test('locales have complete keys and matching interpolation parameters',()=>{
 assert.deepEqual(Object.keys(LOCALES.en).sort(),Object.keys(LOCALES['zh-CN']).sort());
 for(const [key,text] of Object.entries(LOCALES.en)) {
  const params = s => [...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(params(text), params(LOCALES['zh-CN'][key]),key);
 }
 assert.equal(normalizeLocale('en-US'),'en');
 assert.equal(createT('en')('result.charCount',{n:5}),'5 chars');
});

function withHistory(seed,fn) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'floatask-unit-'));
 try {
  if(seed)fs.writeFileSync(path.join(directory,'history.json'),JSON.stringify({records:seed}));
  const context={require:name=>name==='electron'?{app:{getPath:()=>directory}}:require(name),module:{exports:{}},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/history.js'),'utf8'),context);
  fn(context.module.exports,directory);
 } finally { if(path.dirname(directory)===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-unit-'))fs.rmSync(directory,{recursive:true,force:true}); }
}
test('history upserts, excludes secrets and images, and keeps favorites when clearing',()=>{
 withHistory(null,(history,dir)=>{
  const session={selectionText:'A term',imageDataUrl:'data:image/png;base64,PRIVATE',apiKey:'PRIVATE_KEY',history:[{role:'system',content:'PRIVATE_SYSTEM'},{role:'user',content:'Explain'},{role:'assistant',content:'Answer'}]};
  const record=history.record(session,{model:'mock'});
  history.setFavorite(record.id,true);
  session.history.push({role:'user',content:'Next'},{role:'assistant',content:'Next answer'});
  history.record(session);
  assert.equal(history.list().length,1);assert.equal(history.get(record.id).messages.length,4);
  const saved=fs.readFileSync(path.join(dir,'history.json'),'utf8');
  assert(!saved.includes('PRIVATE'));
  assert.equal(history.clear(),0);assert.equal(history.get(record.id).favorite,true);
  assert.equal(history.clear(false),1);assert.equal(history.get(record.id),null);
 });
});
test('history capacity preserves favorites and drops oldest non-favorites',()=>{
 const seed=Array.from({length:501},(_,i)=>({id:'h'+i,updatedAt:i,favorite:i===0,messages:[{role:'assistant',content:'Answer'}]}));
 withHistory(seed,history=>{
  history.record({history:[{role:'assistant',content:'New answer'}]});
  assert.equal(history.list().length,500);assert(history.get('h0'));assert.equal(history.get('h1'),null);
 });
});
test('all favorites survive capacity and write failures surface to callers',()=>{
 const seed=Array.from({length:501},(_,i)=>({id:'h'+i,updatedAt:i,favorite:true,messages:[{role:'assistant',content:'Answer'}]}));
 withHistory(seed,(history,dir)=>{
  history.record({history:[{role:'assistant',content:'New answer'}]});
  assert.equal(history.list().length,501);assert(history.get('h0'));
  fs.mkdirSync(path.join(dir,'history.json.tmp'));
  assert.throws(()=>history.setFavorite('h0',false));
 });
});

test('history retention purges only expired non-favorite records', () => withHistory([
 {id:'old-plain',createdAt:Date.now()-40*86400000,updatedAt:Date.now()-40*86400000,favorite:false,title:'old',messages:[{role:'user',content:'a'}]},
 {id:'old-fav',createdAt:Date.now()-60*86400000,updatedAt:Date.now()-60*86400000,favorite:true,title:'old fav',messages:[{role:'user',content:'b'}]},
 {id:'fresh',createdAt:Date.now()-86400000,updatedAt:Date.now()-86400000,favorite:false,title:'fresh',messages:[{role:'user',content:'c'}]}
],(history)=>{
 assert.equal(history.purge(30),1,'one expired non-favorite removed');
 const ids=[...history.list().map(r=>r.id)].sort();
 assert.deepEqual(ids,['fresh','old-fav'],'favorites and recent records survive');
 assert.equal(history.purge(0),0,'zero retention disables purging');
 assert.equal(history.purge(365),0,'nothing expires within a year');
}));

const { createSelectionGuard } = require('../src/main/selection-guard');
test('selection guard passes silently without a pending OCR correction', async () => {
 let rendererCalls = 0, nativeCalls = 0;
 const guard = createSelectionGuard({
  hasPendingCorrection: () => false,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => { rendererCalls += 1; return Promise.resolve(true); },
  askNative: () => { nativeCalls += 1; return Promise.resolve(true); }
 });
 assert.equal(await guard.confirm(), true);
 assert.equal(rendererCalls, 0);
 assert.equal(nativeCalls, 0);
});
test('selection guard asks the result window and honors both answers', async () => {
 let shown = 0;
 const accept = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => { shown += 1; },
  askRenderer: () => Promise.resolve(true),
  askNative: () => Promise.resolve(false)
 });
 assert.equal(await accept.confirm(), true);
 assert.equal(shown, 1, 'the result window is raised so the user sees the question');
 const decline = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => Promise.resolve(false),
  askNative: () => Promise.resolve(true)
 });
 assert.equal(await decline.confirm(), false);
});
test('selection guard aborts when the result window never replies', async () => {
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => new Promise(() => {}),
  askNative: () => Promise.resolve(true),
  timeoutMs: 25
 });
 assert.equal(await guard.confirm(), false, 'an unanswered guard must not allow discarding');
});
test('selection guard falls back to a native prompt without a result window', async () => {
 let nativeCalls = 0;
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => false,
  showResultWindow: () => {},
  askRenderer: () => Promise.resolve(true),
  askNative: () => { nativeCalls += 1; return Promise.resolve(true); }
 });
 assert.equal(await guard.confirm(), true);
 assert.equal(nativeCalls, 1);
});
test('selection guard treats a broken renderer reply as a refusal', async () => {
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => Promise.reject(new Error('contents gone')),
  askNative: () => Promise.resolve(true)
 });
 assert.equal(await guard.confirm(), false);
});
