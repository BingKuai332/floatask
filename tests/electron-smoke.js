'use strict';
// Runs the real main process, preload, IPC and renderer pages against a local AI.
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const root = path.join(__dirname, '..');
const data = process.env.FLOATASK_USER_DATA || fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-smoke-'));
process.env.FLOATASK_USER_DATA = data;
let calls = [], requestPaths = [], errors = [], slowSearch = false, rejectImages = false, captureDelay = 0, captureTag = "fixture";
const updaterModule = require('../src/main/updater');
const realCreateUpdater = updaterModule.createUpdater;
updaterModule.createUpdater = options => realCreateUpdater({ ...options, request: async () => Response.json({
  tag_name:'v999.0.0',assets:[{name:'FloatAsk-v999.0.0-win32-x64.zip',size:1,browser_download_url:'https://github.com/BingKuai332/floatask/releases/download/v999.0.0/FloatAsk-v999.0.0-win32-x64.zip'},
  {name:'FloatAsk-v999.0.0-win32-x64.zip.sha256',browser_download_url:'https://github.com/BingKuai332/floatask/releases/download/v999.0.0/FloatAsk-v999.0.0-win32-x64.zip.sha256'}]
}) });
const search = require('../src/main/search');
search.searchWeb = async () => {
 if (slowSearch) await new Promise(resolve => setTimeout(resolve, 400));
 return { results: [] };
};
const capture = require('../src/main/capture');
const powershell = require('../src/main/powershell');
capture.captureRegion = async () => {
 const tag = captureTag, milliseconds = captureDelay;
 if (milliseconds) await new Promise(resolve => setTimeout(resolve,milliseconds));
 return { pngPath: path.join(data,tag+'.png'), previewDataUrl: '', visionDataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
};
capture.cleanupCapture = () => {};
powershell.recognizeImage = async filename => ({text:'An isolated screenshot '+path.basename(filename,'.png')});
powershell.getForegroundInfo = async () => ({title:'Mock screenshot',process:'fixture'});
const server = http.createServer((req,res) => {
 let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
  const payload=JSON.parse(body); calls.push(payload); requestPaths.push(req.url);
  if (rejectImages && payload.messages.some(message => Array.isArray(message.content))) { res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'images not supported'}}));return; }
  if (!payload.stream) { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({model:payload.model,choices:[{message:{content:'OK'}}]})); return; }
  res.writeHead(200, {'Content-Type':'text/event-stream'});
  res.write('data: '+JSON.stringify({choices:[{delta:{content:'A useful explanation with enough text to save.'}}]})+'\n\n');
  setTimeout(()=>res.end('data: [DONE]\n\n'),120);
 });
});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn, label) {
 const deadline=Date.now()+12000;
 while(Date.now()<deadline) { const value=await fn(); if(value) return value; await pause(80); }
 throw new Error('Timed out: '+label);
}
const page = name => BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/'+name+'.html'));
const js=(w,code)=>w.webContents.executeJavaScript(code);
async function screenshot(win,name) {
 if (!process.env.FLOATASK_TEST_SHOTS) return;
 await pause(300); // Wait for transitions and the compositor to paint.
 fs.mkdirSync(process.env.FLOATASK_TEST_SHOTS,{recursive:true});
 fs.writeFileSync(path.join(process.env.FLOATASK_TEST_SHOTS,name+'.png'),(await win.webContents.capturePage()).toPNG());
}
app.on('web-contents-created', (_event,wc)=> {
 wc.on('console-message', event=>{if(event.level==='error' || event.level===3)errors.push(event.message);});
 wc.on('preload-error',(_event,_path,error)=>errors.push(error.message));
});
server.listen(0,'127.0.0.1',()=>{
 fs.writeFileSync(path.join(data,'config.json'),JSON.stringify({language:'zh-CN',provider:'custom',baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'mock',webEnabled:false,showBubble:false,onboarded:false,saveHistory:true}));
 require('../src/main/main');
 app.whenReady().then(async()=> {
  try {
   const settings=await waitFor(()=>page('settings'),'settings');
   await waitFor(()=>js(settings,"document.getElementById('providerGrid').children.length === 6"),'settings ready');
   assert.equal(await js(settings,"typeof window.FloatAskI18n.t"),'function');
   await js(settings,"document.getElementById('language').value='en';document.getElementById('language').dispatchEvent(new Event('change'))");
   await waitFor(()=>js(settings,"document.documentElement.lang==='en'"),'language switch');
   assert.equal(await js(settings,"document.querySelector('.brand-title').textContent"),'FloatAsk Settings');
   await screenshot(settings,'settings-en');
   await js(settings,"document.getElementById('recordHotkeyBtn').click()");
   await waitFor(()=>js(settings,'window.FloatAskAdvanced.recording'),'recorder starts');
   await js(settings,"document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',ctrlKey:true,altKey:true,shiftKey:true,bubbles:true}))");
   await waitFor(()=>js(settings,"document.getElementById('hotkey').value==='Ctrl+Alt+Shift+K' && !window.FloatAskAdvanced.recording"),'shortcut recorded');
   await js(settings,"(async()=>{const base=await window.floatask.getSettings(); for(const [task,model] of [['initial','initial-fast'],['followup','followup-reasoning'],['vision','vision-model']]){document.getElementById('profile-'+task+'-enabled').checked=true;document.getElementById('profile-'+task+'-enabled').dispatchEvent(new Event('change'));document.getElementById('profile-'+task+'-model').value=model;}document.getElementById('profile-initial-customService').checked=true;document.getElementById('profile-initial-customService').dispatchEvent(new Event('change'));document.getElementById('profile-initial-baseUrl').value=base.baseUrl.replace('/v1','/initial-service/v1');document.getElementById('profile-initial-test').click();})()");
   await waitFor(()=>js(settings,"document.getElementById('profile-initial-result').textContent.includes('Connected')"),'profile connection test');
   const advancedSaved=await js(settings,"window.floatask.saveSettings({...window.FloatAskAdvanced.collect(),hotkey:document.getElementById('hotkey').value})");
   assert.equal(advancedSaved.ok,true,advancedSaved.message);
   assert.equal(advancedSaved.settings.hotkey,'Ctrl+Alt+Shift+K');
   const priorBase = advancedSaved.settings.baseUrl;
   await js(settings,"window.floatask.saveSettings({baseUrl:'https://example.invalid/v1',apiKey:'deletion-fixture-key'})");
   const cleared = await js(settings,"window.floatask.saveSettings({clearApiKey:true,modelProfiles:{followup:{enabled:true,customService:false,model:'followup-reasoning'},vision:{enabled:true,customService:false,model:'vision-model'}}})");
   assert.equal(cleared.ok,true,'explicit credential deletion must be saved even for enabled inherited profiles');
   assert.equal(cleared.settings.hasApiKey,false);
   await js(settings,'window.floatask.saveSettings({baseUrl:'+JSON.stringify(priorBase)+'})');
   const register=globalShortcut.register.bind(globalShortcut);
   globalShortcut.register=(key,fn)=>key==='Ctrl+Alt+F11'?false:register(key,fn);
   const conflict=await js(settings,"window.floatask.saveSettings({hotkey:'Ctrl+Alt+F11'})");
   globalShortcut.register=register;assert.equal(conflict.ok,false);
   assert.equal(require('../src/main/store').getConfig().hotkey,'Ctrl+Alt+Shift+K');
   await js(settings,"document.getElementById('taskModelsSection').scrollIntoView({block:'start'})");
   await screenshot(settings,'task-models-en');
   await js(settings,"document.getElementById('checkUpdatesBtn').click()");
   await waitFor(()=>js(settings,"document.getElementById('updateStatus').textContent.includes('999.0.0')"),'updates UI');
   assert.equal(await js(settings,"document.getElementById('downloadUpdateBtn').hidden"),true,'source builds cannot download updates');
   await js(settings,"document.getElementById('updatesSection').scrollIntoView({block:'start'})");
   await screenshot(settings,'updates-en');
   const history=require('../src/main/history');
   const record=history.record({selectionText:'Term about databases',windowInfo:{title:'Test window'},history:[{role:'user',content:'Explain'},{role:'assistant',content:'A rare searchable needle in a useful explanation.'}]},{model:'mock'});
   const originalGetHistory = history.get; let detailReads = 0;
   history.get = (...args) => { detailReads++; return originalGetHistory(...args); };
   await js(settings,'window.floatask.openHistory()');
   const win=await waitFor(()=>page('history'),'history');
   await waitFor(()=>js(win,"document.querySelectorAll('.record').length===1"),'history list');
   assert.equal(detailReads,0,'history list must not load full conversations');
   await js(win,"document.querySelector('.record').click()");
   await waitFor(()=>js(win,"document.querySelectorAll('.history-message').length===2"),'detail');
   assert.equal(await js(win,"document.querySelector('#detail h2').textContent"),'Term about databases');
   await js(win,"document.querySelector('.detail-actions button').click()");
   await waitFor(()=>history.get(record.id).favorite,'favorite');
   await screenshot(win,'history-en');
   await js(win,"document.getElementById('searchInput').value='rare searchable needle';document.getElementById('searchInput').dispatchEvent(new Event('input'))");
   await waitFor(()=>js(win,"document.querySelectorAll('.record').length===1"),'full text search');
   await js(win,"document.getElementById('searchInput').value='no-such-conversation';document.getElementById('searchInput').dispatchEvent(new Event('input'))");
   await waitFor(()=>js(win,"document.querySelectorAll('.record').length===0"),'non matching search');
   await js(win,`window.floatask.resumeHistory(${JSON.stringify(record.id)})`);
   let result=await waitFor(()=>page('result'),'result');
   await waitFor(()=>js(result,"document.querySelectorAll('.message.assistant').length===1"),'restored messages');
   assert.equal(await js(result,"document.getElementById('statusText').textContent"),'Done');
   await screenshot(result,'result-en');
   await js(result,"document.getElementById('questionInput').value='Next question';document.getElementById('sendBtn').click()");
   await waitFor(()=>history.get(record.id).messages.length===4,'saved followup');
   assert.equal(calls.at(-1).model,'followup-reasoning');
   assert(calls.at(-1).messages.some(m=>m.content.includes('rare searchable needle')),'restored context sent');
   assert(calls.at(-1).messages[0].content.startsWith('You are'),'English model prompt');
   await js(result,"window.floatask.setLanguage('zh-CN')");
   await waitFor(()=>js(result,"document.documentElement.lang==='zh-CN'"),'switch back');
   assert.equal(await js(result,"document.getElementById('sendBtn').title"),'发送');
   assert.equal(await js(result,"document.getElementById('statusText').textContent"),'已完成');
   await js(result,"window.floatask.openFontWindow()");
   const font=await waitFor(()=>page('font'),'font');
   await waitFor(()=>js(font,"document.querySelector('.brand-title')?.textContent==='字体与阅读'"),'font ready');
   await screenshot(font,'font-zh');
   slowSearch=true;
   await js(result,"window.floatask.setWebEnabled(true);document.getElementById('questionInput').value='Search test';document.getElementById('sendBtn').click()");
   await pause(100);
   const before=calls.length;
   await js(result,'window.floatask.stop()');
   await pause(600);
   assert.equal(calls.length,before,'stopped search never starts AI');
   assert.equal(await js(result,'(async () => (await window.floatask.getResultState()).busy)()'),false);
   await js(settings,'window.floatask.saveSettings({saveHistory:false})');
   await js(result,"window.floatask.setWebEnabled(false);document.getElementById('questionInput').value='Private followup';document.getElementById('sendBtn').click()");
   await waitFor(()=>calls.length>before,'private request'); await pause(350);
   assert.equal(history.get(record.id).messages.length,4,'disabled history stays unchanged');
   // Reload storage from disk; favorites and text survive a process restart.
   delete require.cache[require.resolve('../src/main/history')];
   assert.equal(require('../src/main/history').get(record.id).favorite,true);
   await js(settings,'window.floatask.saveSettings({saveHistory:true})');
   await js(result,`window.floatask.deleteHistoryRecord(${JSON.stringify(record.id)})`);
   await js(result,"document.getElementById('questionInput').value='After deletion';document.getElementById('sendBtn').click()");
   await pause(400);
   assert.equal(history.list().length,0,'deleted active history does not reappear');
   await js(result,"window.floatask.setManualText('Initial model routing test')");
   await waitFor(()=>calls.at(-1)?.model==='initial-fast','initial task model');
   assert.equal(requestPaths.at(-1),'/initial-service/v1/chat/completions','initial override uses its endpoint');
   await waitFor(()=>js(result,"document.getElementById('statusText').textContent==='已完成'"),'initial model done');
   await js(settings,"window.floatask.saveSettings({vision:true})");
   await js(result,'window.floatask.startSelection()');
   const screenshotSelection=await waitFor(()=>page('selection'),'mock screenshot selection');
   await js(screenshotSelection,'window.floatask.finishSelection({x:20,y:20,width:200,height:100})');
   await waitFor(()=>calls.at(-1)?.model==='vision-model','vision task model');
   result = await waitFor(()=>page('result'),'recreated result');
   assert(Array.isArray(calls.at(-1).messages.at(-1).content),'screenshot attached to vision model');
   assert.equal(requestPaths.at(-1),'/v1/chat/completions','vision inheritance uses default endpoint, not the initial override');
   await waitFor(()=>js(result,"document.getElementById('statusText').textContent==='已完成'"),'vision model done');
   rejectImages = true;
   await js(result,"document.getElementById('questionInput').value='Followup with unsupported image';document.getElementById('sendBtn').click()");
   await waitFor(()=>calls.at(-1)?.model==='followup-reasoning' && calls.at(-1)?.messages.at(-1).content==='Followup with unsupported image','followup image fallback');
   await waitFor(()=>js(result,"document.getElementById('statusText').textContent==='已完成'"),'followup fallback completed');
   assert.equal(typeof calls.at(-1).messages.at(-1).content,'string');
   await js(result,'window.floatask.startSelection()');
   const fallbackSelection=await waitFor(()=>page('selection'),'initial fallback selection');
   await js(fallbackSelection,'window.floatask.finishSelection({x:20,y:20,width:200,height:100})');
   await waitFor(()=>calls.at(-1)?.model==='initial-fast','initial image fallback');
   result = await waitFor(()=>page('result'),'recreated result');
   await waitFor(()=>js(result,"document.getElementById('statusText').textContent==='已完成'"),'initial fallback completed');
   await js(settings,"window.floatask.saveSettings({vision:false})");
   captureDelay = 1000; captureTag = 'old-capture';
   const beforeCaptureRace = calls.length;
   await js(result,'window.floatask.startSelection()');
   const oldSelection = await waitFor(()=>page('selection'),'old race selection');
   await js(oldSelection,'window.floatask.finishSelection({x:20,y:20,width:200,height:100})');
   await pause(250);
   captureDelay = 0; captureTag = 'new-capture';
   await js(settings,'window.floatask.startSelection()');
   const newSelection = await waitFor(()=>page('selection'),'new race selection');
   await js(newSelection,'window.floatask.finishSelection({x:20,y:20,width:200,height:100})');
   await waitFor(()=>calls.length>beforeCaptureRace && calls.at(-1).messages[0].content.includes('new-capture'),'new capture answer');
   result = await waitFor(()=>page('result'),'recreated result');
   await pause(1100);
   const racedState = await js(result,'window.floatask.getResultState()');
   assert(racedState.init.selectionText.includes('new-capture'),'slow earlier capture must not replace the newer session');
   assert(!calls.slice(beforeCaptureRace).some(call=>call.messages[0].content.includes('old-capture')),'stale capture must not start an AI request');
   await js(settings,"window.floatask.setLanguage('en')");
   await waitFor(()=>js(font,"document.getElementById('importBtn').textContent==='＋ Import font file…'"),'font translated');
   await js(result,'window.floatask.closeResult()');
   await js(settings,'window.floatask.saveSettings({showBubble:true})');
   const bubble=await waitFor(()=>page('bubble'),'bubble');
   await waitFor(()=>js(bubble,"document.getElementById('askBtn').title.includes('Capture')"),'bubble translated');
   await js(bubble,'window.floatask.startSelection()');
   const selection=await waitFor(()=>page('selection'),'selection');
   await waitFor(()=>js(selection,"document.documentElement.lang==='en' && !/[\u4e00-\u9fff]/.test(document.getElementById('hintText').textContent)"),'selection translated');
   await js(selection,'window.floatask.cancelSelection()');
   await js(settings,'window.floatask.closeFontWindow()');
   await waitFor(()=>!page('font'),'font renderer released');
   await js(settings,'window.floatask.closeSettings()');
   await waitFor(()=>!page('settings'),'settings renderer released');
   await waitFor(()=>!page('result'),'result renderer released');
   await js(bubble,'window.floatask.openSettings()');
   const reopenedSettings=await waitFor(()=>page('settings'),'reopened settings');
   await waitFor(()=>js(reopenedSettings,"document.getElementById('hotkey').value==='Ctrl+Alt+Shift+K'"),'settings restored after releasing renderer');
   await js(reopenedSettings,'window.floatask.closeSettings()');
   await waitFor(()=>!page('settings'),'reopened renderer released');
   assert.deepEqual(errors,[],'no renderer errors');
   console.log('PASS: real Electron pages, bilingual UI, shortcut recording/conflict, per-task routing, profile testing, screenshot routing/fallback, update UI, history/privacy');
   app.exit(0);
  } catch(err) { console.error(err.stack); console.error('Renderer errors:',errors); app.exit(1); }
 }).catch(err=>{console.error(err);app.exit(1);});
});
setTimeout(()=>{console.error('Smoke test timed out');app.exit(1);},45000);
