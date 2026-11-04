'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function runtime() {
  const windows = [], handlers = new Map(), timers = [], registered = new Set(), streams = [];
  const config = {showBubble:false, hotkey:'Alt+Q', fontFamily:'system', fontScope:'all'};
  let releases = 0;
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.options=options; this.visible=false; this.destroyed=false;
      this.children=[]; options.parent?.children.push(this); windows.push(this);
      this.webContents = new EventEmitter();
      this.webContents.setWindowOpenHandler=()=>{};
      this.webContents.getURL=()=>this.filename || '';
      this.webContents.send=()=>{};
      this.webContents.isDestroyed=()=>this.destroyed;
      this.webContents.executeJavaScript=()=>Promise.resolve();
    }
    loadFile(filename) { this.filename=filename; return new Promise((resolve,reject)=>{this.finish=resolve;this.fail=reject;}); }
    isDestroyed() {return this.destroyed;}
    isVisible() {if(this.destroyed)throw Error('Object has been destroyed');return this.visible;}
    show() {if(this.destroyed)throw Error('Object has been destroyed');this.visible=true;}
    showInactive() {this.show();}
    focus() {if(this.destroyed)throw Error('Object has been destroyed');}
    hide() {this.visible=false;this.emit('hide');}
    destroy() {if(this.destroyed)return;this.destroyed=true;this.children.forEach(child=>child.destroy());this.emit('closed');}
    close() {const event={prevented:false,preventDefault(){this.prevented=true;}};this.emit('close',event);if(!event.prevented)this.destroy();}
    setMenuBarVisibility() {} setAlwaysOnTop() {} setVisibleOnAllWorkspaces() {} setPosition() {} setBounds() {}
    getPosition() {return [100,100];}
  }
  const display = {workArea:{x:0,y:0,width:1280,height:900},bounds:{x:0,y:0,width:1280,height:900}};
  const app = {setName(){},setPath(){},getPath:()=>path.join(__dirname,'mock-user-data'),requestSingleInstanceLock:()=>false,quit(){}};
  const ipcMain = {on:(key,fn)=>handlers.set(key,fn),handle:(key,fn)=>handlers.set(key,fn)};
  const electron = {app,BrowserWindow:Window,ipcMain,protocol:{registerSchemesAsPrivileged(){}},
    globalShortcut:{unregisterAll:()=>registered.clear(),register:key=>{registered.add(key);return true;}},
    screen:{getCursorScreenPoint:()=>({x:100,y:100}),getDisplayNearestPoint:()=>display,getPrimaryDisplay:()=>display,getAllDisplays:()=>[display]},
    Notification:{isSupported:()=>false},nativeImage:{createFromBuffer:()=>({}),createEmpty:()=>({})},Menu:{buildFromTemplate:()=>({})}};
  const modules = {'electron':electron,'./store':{getConfig:()=>config,setBubblePosition(){}},'../shared/presets':{PRESETS:{}},
    './i18n':{t:key=>key},'../shared/i18n':{normalizeLocale:value=>value},'./history':{release:()=>releases++,list:()=>[],get:()=>null},
    './model-config':{TASKS:['initial','followup','vision']},'../shared/hotkeys':{},'./updater':{},'./capture':{},'./powershell':{},'./search':{},
    './ai':{streamChat:args=>new Promise((resolve,reject)=>streams.push({...args,resolve,reject}))},'./prompt':{}};
  const mockFs = {...fs,mkdirSync(){},accessSync(){},readFileSync:()=>Buffer.alloc(0)};
  const context = {require:name=>name==='fs'?mockFs:modules[name] || require(name),console,
    __dirname:path.resolve(__dirname,'../src/main'),process:{...process,on(){}},AbortController,
    setTimeout(fn,ms){const timer={fn,ms,active:true,unref(){}};timers.push(timer);return timer;},
    clearTimeout(timer){if(timer)timer.active=false;}};
  const source=fs.readFileSync(path.resolve(__dirname,'../src/main/main.js'),'utf8');
  vm.runInNewContext(source+`\nglobalThis.control={openSettings,openFontWindow,openHistory,ensureResultWindow,refreshBubble,runStream,sendResult,
    setSession:value=>{session=value;resultState={model:'default',selectionText:'selection'};},
    state:()=>({settingsWin,fontWin,historyWin,resultWin,bubbleWin}),recording:()=>Boolean(recordingTimer)};`,context);
  return {control:context.control,handlers,windows,config,timers,registered,streams,releases:()=>releases};
}

for (const [open,key] of [['openSettings','settingsWin'],['openFontWindow','fontWin'],['openHistory','historyWin'],['ensureResultWindow','resultWin']]) {
  test(`${key} ignores an aborted old load after closing and reopening`, async () => {
    const env=runtime();
    const first=env.control[open]();const old=env.control.state()[key];old.close();
    const second=env.control[open]();const current=env.control.state()[key];
    assert.notEqual(old,current);
    old.fail(new Error('ERR_ABORTED'));await first;
    assert.equal(env.control.state()[key],current);
    current.finish();await second;
    assert.equal(current.isDestroyed(),false);
    if(key!=='resultWin')assert.equal(current.isVisible(),true);
  });
}

test('concurrent settings opens share a window and wait for its renderer', async () => {
  const env=runtime();const first=env.control.openSettings();const second=env.control.openSettings();
  const window=env.control.state().settingsWin;
  assert.equal(env.windows.length,1);assert.equal(window.isVisible(),false);
  window.finish();await Promise.all([first,second]);assert.equal(window.isVisible(),true);
});

test('closing settings destroys loading children and restores a suspended shortcut', async () => {
  const env=runtime();const opening=env.control.openSettings();const settings=env.control.state().settingsWin;
  settings.finish();await opening;
  const recording=env.handlers.get('hotkey:recording');
  assert.equal(recording({sender:settings.webContents},true),true);assert.equal(env.control.recording(),true);
  const fontOpening=env.control.openFontWindow();const historyOpening=env.control.openHistory();
  const {fontWin,historyWin}=env.control.state();settings.close();
  fontWin.fail(new Error('ERR_ABORTED'));historyWin.fail(new Error('ERR_ABORTED'));
  await Promise.all([fontOpening,historyOpening]);
  assert.equal(env.control.state().fontWin,null);assert.equal(env.control.state().historyWin,null);
  assert.equal(env.control.recording(),false);assert(env.registered.has('Alt+Q'));
  assert.equal(recording({sender:settings.webContents},true),false,'closed renderer cannot suspend shortcuts again');
});

test('bubble disabled while loading is not shown by its stale completion', async () => {
  const env=runtime();env.config.showBubble=true;env.control.refreshBubble();
  const bubble=env.control.state().bubbleWin;env.config.showBubble=false;env.control.refreshBubble();bubble.finish();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(bubble.isVisible(),false);
});

test('history read without an open window schedules idle release', () => {
  const env=runtime();env.handlers.get('history:list')({},{});
  const timer=env.timers.find(timer=>timer.active && timer.ms===30000);assert(timer);
  timer.fn();assert.equal(env.releases(),1);
});

test('stream snapshots cover all deltas at their revision and clear live state after completion', async () => {
  const env=runtime();
  env.control.setSession({id:1,history:[],pendingSources:[],selectionText:'selection',webEnabled:false});
  const pending=env.control.runStream({mode:'followup',question:'Explain more',messages:[],requestConfig:{model:'fast',provider:'custom',vision:false}});
  const stream=env.streams[0];stream.onDelta('First ');
  // onDelta normally sends the delta after updating the live snapshot text.
  const first=env.handlers.get('session:state')();
  assert(Number.isSafeInteger(first.revision));assert.equal(first.activeResponse.text,'First ');
  assert.equal(first.activeResponse.question,'Explain more');
  stream.onDelta('second.');
  const next=env.handlers.get('session:state')();assert(next.revision>first.revision);assert.equal(next.activeResponse.text,'First second.');
  stream.resolve({text:'First second.'});await pending;
  const done=env.handlers.get('session:state')();assert.equal(done.activeResponse,null);assert(done.revision>next.revision);
  assert.equal(done.init.messages.length,2);assert.equal(done.init.messages[1].content,'First second.');
  env.control.sendResult({type:'error',message:'Test error'});
  const failed=env.handlers.get('session:state')();assert.equal(failed.terminalEvent.type,'error');assert.equal(failed.terminalEvent.revision,failed.revision);
});
