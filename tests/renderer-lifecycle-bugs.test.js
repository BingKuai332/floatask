'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }
const flush = () => new Promise(setImmediate);
function fixture(filename, overrides = {}) {
  const elements = new Map(), subscriptions = {}, timers = new Map(); let timerId = 0;
  class Element {
    constructor() {
      this.children = []; this.parentNode = null; this.listeners = new Map(); this.attributes = new Map(); this.selectors = new Map();
      this.dataset = {}; this.style = {setProperty() {}}; this.value = ''; this.textContent = ''; this.className = ''; this.hidden = false;
      this.scrollHeight = 100; this.clientHeight = 100; this.scrollTop = 0;
      const classes = new Set(); this.classList = {add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,enabled) { if(enabled ?? !classes.has(c)) classes.add(c); else classes.delete(c); }};
    }
    append(...nodes) { for(const node of nodes) this.appendChild(node); }
    appendChild(node) { node.remove(); this.children.push(node); node.parentNode=this; return node; }
    replaceChildren(...nodes) { for(const child of this.children) child.parentNode=null; this.children=[]; this.append(...nodes); }
    remove() { if(this.parentNode) { const parent=this.parentNode; parent.children=parent.children.filter(child=>child!==this); this.parentNode=null; } }
    set innerHTML(html) { this.html=html; this.replaceChildren(); this.selectors.clear(); }
    get innerHTML() { return this.html || ''; }
    addEventListener(type, callback) { this.listeners.set(type,callback); }
    fire(type, event={}) { return this.listeners.get(type)?.(event); }
    querySelector(selector) { if(!this.selectors.has(selector)) this.selectors.set(selector,new Element()); return this.selectors.get(selector); }
    querySelectorAll() { return []; }
    setAttribute(name,value) { this.attributes.set(name,value); }
    removeAttribute(name) { this.attributes.delete(name); if(name==='src') delete this.src; }
    focus() {}
  }
  function element(id) { if(!elements.has(id)) elements.set(id,new Element()); return elements.get(id); }
  const restore = deferred();
  const api = {
    getResultState:()=>restore.promise, getFont:async()=>({}),
    listHistory:async()=>({ok:true,records:[]}), getHistoryRecord:async()=>({ok:true,record:null}),
    setHistoryFavorite:async()=>({ok:true}), deleteHistoryRecord:async()=>({ok:true}), clearHistory:async()=>({ok:true}),
    ...overrides
  };
  for(const name of ['onHistoryUpdated','onHistoryShowRecord','onFontUpdated','onResultInit','onResultEvent']) api[name]=callback=>{subscriptions[name]=callback;};
  const window = {
    floatask:api, FloatAskI18n:{language:'en',t:key=>key}, FloatAskI18N:{LOCALES:{en:{}}},
    FloatAskMarkdown:{render:s=>s,escapeHtml:s=>String(s)}, FloatAskFont:{apply(){}}, FloatAskI18nReady:new Promise(()=>{})
  };
  const context = vm.createContext({window, document:{getElementById:element,createElement:()=>new Element(),querySelector:selector=>element(selector),addEventListener(){},documentElement:{style:{setProperty(){}}}},
    setTimeout(callback,delay) {const id=++timerId; timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),URL,console});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/renderer',filename),'utf8'),context);
  return {api,context,element,subscriptions,timers,restore,read:expression=>vm.runInContext(expression,context)};
}
const record = id => ({id,title:id,updatedAt:1,messages:[],sources:[]});

test('history refresh never switches back over a newer pending user selection', async()=>{
  const pending=[], refresh=deferred();
  const app=fixture('history.js',{getHistoryRecord:id=>{const request=deferred();pending.push({id,...request});return request.promise;},listHistory:()=>refresh.promise});
  let selection=app.read('select("a")');pending[0].resolve({ok:true,record:record('a')});await selection;
  const update=app.subscriptions.onHistoryUpdated();
  selection=app.read('select("b")');
  refresh.resolve({ok:true,records:[record('a'),record('b')]});await update;
  assert.deepEqual(pending.map(p=>p.id),['a','b']);
  pending[1].resolve({ok:true,record:record('b')});await selection;
  assert.equal(app.read('selected.id'),'b');
});

test('clearing history invalidates an already requested record response', async()=>{
  const pending=deferred();const app=fixture('history.js',{getHistoryRecord:()=>pending.promise});
  const selection=app.read('select("removed")');
  await app.element('clearBtn').onclick();await app.element('clearBtn').onclick();
  pending.resolve({ok:true,record:record('removed')});await selection;
  assert.equal(app.read('selected'),null);
});

test('deleting one record does not clear another selection made while deletion is pending',async()=>{
  const deletion=deferred();const app=fixture('history.js',{getHistoryRecord:async id=>({ok:true,record:record(id)}),deleteHistoryRecord:()=>deletion.promise});
  await app.read('select("a")');
  await app.element('detail').children[2].children[3].fire('click');
  const deleting=app.element('detail').children[2].children[3].fire('click');
  await Promise.resolve();await app.read('select("b")');
  deletion.resolve({ok:true});await deleting;
  assert.equal(app.read('selected.id'),'b');
});

test('obsolete history search failures do not surface after a newer query',async()=>{
  const pending=deferred();const app=fixture('history.js',{listHistory:()=>pending.promise});
  const refresh=app.read('refresh()');
  app.element('searchInput').fire('input',{target:{value:'new query'}});
  pending.reject(new Error('obsolete search failed'));await assert.doesNotReject(refresh);
  assert.equal(app.element('toast').textContent,'');
});

test('late result snapshot cannot reset a newer result initialization and stream',async()=>{
  const app=fixture('result.js');
  app.subscriptions.onResultInit({selectionText:'new selection',status:'ready'});
  app.subscriptions.onResultEvent({type:'start',mode:'initial'});app.subscriptions.onResultEvent({type:'delta',text:'new answer'});
  app.restore.resolve({init:{selectionText:'old selection',status:'ready'},busy:false});await flush();
  assert.equal(app.read('state.selectionText'),'new selection');assert.equal(app.read('state.currentAnswer'),'new answer');assert.equal(app.read('state.busy'),true);
});

test('stream events received during normal reload replay after restoring prior messages',async()=>{
  const app=fixture('result.js');
  app.subscriptions.onResultEvent({type:'start',mode:'followup'});app.subscriptions.onResultEvent({type:'delta',text:'live answer'});
  app.restore.resolve({init:{selectionText:'saved selection',status:'ready',messages:[{role:'assistant',content:'prior answer'}]},busy:true});
  await flush();
  assert.equal(app.read('state.selectionText'),'saved selection');assert.equal(app.read('state.currentAnswer'),'live answer');
  assert.equal(app.element('messages').children.length,2);
});

test('events already reflected by the snapshot never append a duplicate completed answer',async()=>{
  const app=fixture('result.js');
  app.subscriptions.onResultEvent({type:'start',mode:'initial',revision:1});
  app.subscriptions.onResultEvent({type:'delta',text:'completed answer',revision:2});
  app.subscriptions.onResultEvent({type:'done',text:'completed answer',sources:[],revision:3});
  app.restore.resolve({revision:3,init:{selectionText:'saved',status:'ready',messages:[{role:'assistant',content:'completed answer'}]},busy:false});await flush();
  assert.equal(app.element('messages').children.length,1);
  assert.equal(app.read('state.busy'),false);
});

test('a busy snapshot preserves the full partial answer and only appends newer deltas',async()=>{
  const app=fixture('result.js');
  app.subscriptions.onResultEvent({type:'start',mode:'followup',revision:1});
  app.subscriptions.onResultEvent({type:'delta',text:'earlier ',revision:2});
  app.subscriptions.onResultEvent({type:'delta',text:'newer',revision:3});
  app.restore.resolve({revision:2,init:{selectionText:'saved',status:'ready',messages:[{role:'assistant',content:'prior answer'}]},busy:true,
    activeResponse:{mode:'followup',question:'follow-up',text:'earlier ',sources:[]}});await flush();
  assert.equal(app.read('state.currentAnswer'),'earlier newer');
  assert.equal(app.element('messages').children.length,3);
});

test('a terminal error reflected in the snapshot remains visible after queued events are deduplicated',async()=>{
  const app=fixture('result.js');
  const error={type:'error',message:'connection failed',retryable:false,revision:2};
  app.subscriptions.onResultEvent(error);
  app.restore.resolve({revision:2,init:{selectionText:'saved',status:'ready'},busy:false,terminalEvent:error});await flush();
  assert.equal(app.element('statusText').textContent,'result.error');
  assert.equal(app.element('messages').children.filter(node=>node.className==='error-card').length,1);
});

test('needs-input snapshots restore the manual panel rather than leaving an OCR spinner',async()=>{
  const app=fixture('result.js');const terminal={type:'needs-input',message:'Paste content',revision:2};
  app.subscriptions.onResultEvent(terminal);
  app.restore.resolve({revision:2,init:{selectionText:'',status:'ocr'},busy:false,terminalEvent:terminal});await flush();
  assert.equal(app.element('manualPanel').hidden,false);assert.equal(app.element('loadingCard').parentNode,null);
  assert.equal(app.element('manualInput').placeholder,'Paste content');
});

test('stopped snapshots restore the stopped status without duplicating the saved partial answer',async()=>{
  const app=fixture('result.js');const terminal={type:'stopped',text:'saved partial answer',revision:3};
  app.subscriptions.onResultEvent(terminal);
  app.restore.resolve({revision:3,init:{selectionText:'saved',status:'ready',messages:[{role:'assistant',content:'saved partial answer'}]},busy:false,terminalEvent:terminal});await flush();
  assert.equal(app.element('statusText').textContent,'result.stopped');
  assert.equal(app.element('messages').children.length,1);assert.equal(app.element('loadingCard').parentNode,null);
});

test('a stalled startup snapshot releases queued events and ignores a later stale response',async()=>{
  const app=fixture('result.js');
  app.subscriptions.onResultEvent({type:'start',mode:'initial',revision:1});
  app.subscriptions.onResultEvent({type:'delta',text:'current answer',revision:2});
  for(const timer of app.timers.values()) if(timer.delay===2000) timer.callback();
  assert.equal(app.read('queuedResultEvents.length'),0);assert.equal(app.read('state.currentAnswer'),'current answer');
  app.restore.resolve({revision:0,init:{selectionText:'stale',status:'ready'},busy:false});await flush();
  assert.equal(app.read('state.currentAnswer'),'current answer');
});

test('a new result closes the previous image preview and releases its image source',()=>{
  const app=fixture('result.js');app.element('lightbox').classList.add('open');app.element('lightboxImg').src='old capture';
  app.subscriptions.onResultInit({selectionText:'new selection',status:'ready'});
  assert.equal(app.element('lightbox').classList.contains('open'),false);assert.equal(app.element('lightboxImg').src,undefined);
});

test('a pending throttled render uses only the current session after reset',()=>{
  const app=fixture('result.js');app.subscriptions.onResultInit({selectionText:'old',status:'ready'});
  app.subscriptions.onResultEvent({type:'start',mode:'initial'});app.subscriptions.onResultEvent({type:'delta',text:'old answer'});
  app.subscriptions.onResultInit({selectionText:'new',status:'ready'});
  app.subscriptions.onResultEvent({type:'start',mode:'initial'});app.subscriptions.onResultEvent({type:'delta',text:'new answer'});
  for(const timer of app.timers.values()) if(timer.delay===80) timer.callback();
  assert.equal(app.read('state.current.content.innerHTML'),'new answer');
});
