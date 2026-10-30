'use strict';
// Runs the real main process, preload, IPC and renderer pages against a local AI.
const { app, BrowserWindow, ipcMain, globalShortcut, nativeTheme } = require('electron');
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
  if (payload.messages.at(-1).content==='Long stream test') {
   res.writeHead(200, {'Content-Type':'text/event-stream'});
   let n=0;
   const timer=setInterval(()=>{
    n++;
    res.write('data: '+JSON.stringify({choices:[{delta:{content:'第'+n+'段 这一段内容足够长用来撑开回答视口的高度。'}}]})+'\n\n');
    if(n>=50){clearInterval(timer);res.end('data: [DONE]\n\n');}
   },25);
   return;
  }
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
   // Onboarding wizard (task 9): three steps, back/forward, failure keeps inputs, resume.
   const preWizard=await js(settings,'(async()=>{const s=await window.floatask.getSettings();return {provider:s.provider,baseUrl:s.baseUrl,model:s.model}})()');
   await waitFor(()=>js(settings,"document.getElementById('onboarding') && !document.getElementById('onboarding').hidden"),'onboarding wizard shows on first run');
   assert.equal(await js(settings,"document.getElementById('onboarding').dataset.step"),'1','wizard starts at step 1');
   assert.equal(await js(settings,"document.querySelectorAll('#obSteps .ob-step').length"),3,'three steps indicated');
   await js(settings,"document.getElementById('obNext').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').dataset.step"),'1','missing key stays on step 1');
   assert.ok((await js(settings,"document.getElementById('obError').textContent")).length>0,'the failure explains itself');
   await js(settings,"document.querySelector('[data-ob-provider=ollama]').click();true");
   await js(settings,"document.getElementById('obNext').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').dataset.step"),'2','ollama proceeds without a key');
   assert.ok((await js(settings,"document.getElementById('obOcrNote').textContent")).includes('OCR'),'step 2 explains local OCR');
   await js(settings,"document.getElementById('obBack').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').dataset.step"),'1','back returns to step 1');
   assert.equal(await js(settings,"document.querySelector('[data-ob-provider].active')?.dataset.obProvider"),'ollama','provider choice survives going back');
   await js(settings,"document.getElementById('obNext').click();true");
   await js(settings,"document.getElementById('obNext').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').dataset.step"),'3','wizard reaches the ready step');
   assert.equal(await js(settings,"document.querySelectorAll('#onboarding .btn.primary:not([hidden])').length"),1,'ready step has exactly one primary action');
   assert.ok(await js(settings,"Boolean(document.getElementById('obStart') && document.getElementById('obFullSettings'))"),'start capture and full settings entries exist');
   await js(settings,"document.getElementById('obBack').click();true");
   await js(settings,"document.getElementById('obLater').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').hidden"),true,'later hides the wizard');
   settings.webContents.reload();
   await waitFor(()=>js(settings,"document.getElementById('providerGrid') && document.getElementById('providerGrid').children.length === 6"),'settings ready after reload');
   await waitFor(()=>js(settings,"document.getElementById('onboarding') && !document.getElementById('onboarding').hidden && document.getElementById('onboarding').dataset.step==='2'"),'wizard resumes at the unfinished step');
   await js(settings,"document.getElementById('obLater').click();true");
   assert.equal(await js(settings,"document.getElementById('onboarding').hidden"),true,'wizard stays dismissed for the remaining flows');
   // Extension fixture (task 13): one more provider and one more settings entry
   // must not break geometry, keyboard order or either theme.
   await js(settings,`(() => {
    const grid=document.getElementById('providerGrid');
    const card=document.createElement('button'); card.className='provider-card'; card.id='fixtureProvider';
    card.innerHTML='<b>Fixture Provider</b><small>fixture.example.com</small>';
    grid.appendChild(card);
    const nav=document.querySelector('.settings-nav');
    const item=document.createElement('button'); item.className='settings-nav-item'; item.id='fixtureNav'; item.dataset.panel='fixture'; item.textContent='Fixture';
    nav.appendChild(item);
    const section=document.createElement('section'); section.className='section'; section.id='fixtureSection'; section.dataset.panelSection='fixture';
    section.innerHTML='<div class="section-head"><div><h2>Fixture</h2></div></div><p>fixture body</p>';
    document.querySelector('.scroll-body').appendChild(section);
    document.getElementById('fixtureNav').addEventListener('click',()=>{
      for(const b of document.querySelectorAll('.settings-nav-item')) b.classList.toggle('active',b.dataset.panel==='fixture');
      for(const s of document.querySelectorAll('[data-panel-section]')) s.hidden=s.dataset.panelSection!=='fixture';
    });
    return true;
   })()`);
   assert.equal(await js(settings,"document.getElementById('providerGrid').children.length"),7,'fixture provider joins the grid');
   assert.ok(await js(settings,"document.getElementById('providerGrid').scrollWidth<=document.getElementById('providerGrid').clientWidth+1"),'the grid wraps instead of overflowing');
   assert.ok(await js(settings,"document.getElementById('fixtureNav').tabIndex===0"),'new nav entry stays in the tab order');
   await js(settings,"document.getElementById('fixtureNav').click();true");
   assert.equal(await js(settings,"document.getElementById('fixtureSection').hidden"),false,'new settings entry reaches an ordered panel');
   await js(settings,"window.floatask.saveSettings({theme:'light'})");
   await pause(250);
   const fixtureThemed=await js(settings,`(() => {
    const card=getComputedStyle(document.getElementById('fixtureProvider'));
    const nav=getComputedStyle(document.getElementById('fixtureNav'));
    return {cardBg:card.backgroundColor, navColor:nav.color};
   })()`);
   assert.equal(fixtureThemed.cardBg,'rgb(250, 249, 244)','fixture card follows the light surface token');
   assert.equal(fixtureThemed.navColor,'rgb(80, 107, 146)','the active fixture nav item uses the light accent selection color');
   await js(settings,"window.floatask.saveSettings({theme:'dark'})");
   await pause(250);
   assert.equal(await js(settings,"getComputedStyle(document.getElementById('fixtureNav')).color"),'rgb(143, 166, 201)','the active fixture nav item follows the dark accent');
   await js(settings,"document.getElementById('fixtureProvider').remove();document.getElementById('fixtureNav').remove();document.getElementById('fixtureSection').remove();document.querySelector('.settings-nav-item[data-panel=model]').click();true");
   assert.equal(await js(settings,"document.getElementById('providerGrid').children.length"),6,'fixture data removed');
   await js(settings,'window.floatask.saveSettings({provider:'+JSON.stringify(preWizard.provider)+',baseUrl:'+JSON.stringify(preWizard.baseUrl)+',model:'+JSON.stringify(preWizard.model)+',onboardingStep:1,keepOnboarding:true})');
   assert.equal(await js(settings,"typeof window.FloatAskI18n.t"),'function');
   // Settings navigation (task 8): six fixed sections, appearance preview, unified save semantics.
   const navItems=await js(settings,"[...document.querySelectorAll('.settings-nav-item')].map(b=>b.textContent)");
   assert.deepEqual(navItems,['模型服务','联网检索','通用与快捷键','历史与隐私','外观与阅读','更新与关于'],'six fixed nav entries in design order');
   assert.equal(await js(settings,"document.querySelector('.settings-nav-item.active')?.dataset.panel"),'model','model section starts active');
   await js(settings,"document.querySelector('.settings-nav-item[data-panel=appearance]').click();true");
   const panelVisibility=await js(settings,`(() => {
    const vis=name=>{const s=document.querySelector('[data-panel-section="'+name+'"]');return Boolean(s&&s.offsetParent!==null);};
    return {model:vis('model'),web:vis('web'),appearance:vis('appearance')};
   })()`);
   assert.ok(panelVisibility.appearance,'appearance panel shows after nav click');
   assert.ok(!panelVisibility.model && !panelVisibility.web,'other panels hide');
   await js(settings,"document.getElementById('themeOption-light').click();true");
   assert.equal(await js(settings,"document.documentElement.dataset.theme"),'light','theme preview applies before saving');
   await pause(250); // theme color transition (120 ms) must settle before sampling colors
   await js(settings,"document.getElementById('densityOption-compact').click();true");
   assert.equal(await js(settings,"document.getElementById('readingPreview').dataset.density"),'compact','density preview applies to the reading preview');
   const primaryCheck=await js(settings,`(() => {
    const btn=getComputedStyle(document.getElementById('saveBtn'));
    const token=getComputedStyle(document.documentElement).getPropertyValue('--fa-primary-button').trim();
    return {background:btn.backgroundColor, token};
   })()`);
   const hexToRgb=h=>{const n=parseInt(h.slice(1),16);return 'rgb('+[(n>>16)&255,(n>>8)&255,n&255].join(', ')+')';};
   assert.equal(primaryCheck.background,hexToRgb(primaryCheck.token),'save button uses the primary-button token');
   await js(settings,"document.getElementById('themeOption-system').click();true");
   await js(settings,"document.querySelector('.settings-nav-item[data-panel=model]').click();true");
   assert.equal(await js(settings,"document.getElementById('historyRetention')?.value"),'90','history retention defaults to 90 days');
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
   // Updates & about (task 10): install stays disabled before verification; about links and diagnostics.
   await js(settings,"document.querySelector('.settings-nav-item[data-panel=updates]').click();true");
   assert.equal(await js(settings,"document.getElementById('installUpdateBtn').hidden"),false,'install action stays visible');
   assert.equal(await js(settings,"document.getElementById('installUpdateBtn').disabled"),true,'install stays disabled before SHA-256 verification');
   const externalLinks=await js(settings,"[...document.querySelectorAll('[data-external]')].map(b=>b.dataset.external)");
   assert.equal(externalLinks.length,3,'about offers GitHub, release notes and license links');
   assert.ok(externalLinks.every(url=>url.startsWith('https://github.com/')),'external links point at the repository');
   assert.ok(await js(settings,"Boolean(document.getElementById('diagPreviewBtn') && document.getElementById('diagCopyBtn'))"),'diagnostics preview and copy actions exist');
   const diagnostics=await js(settings,'(async()=>window.floatask.getDiagnostics())()');
   assert.ok(diagnostics.includes('FloatAsk'),'diagnostics names the app');
   assert.ok(diagnostics.includes('OS:'),'diagnostics lists the OS');
   assert.ok(/Displays: \d+/.test(diagnostics),'diagnostics lists display configuration');
   assert.ok(!diagnostics.includes('sk-') && !diagnostics.includes('An isolated screenshot') && !diagnostics.includes('Term about databases'),'diagnostics never contains keys, OCR text or conversation');
   await js(settings,"document.getElementById('updatesSection').scrollIntoView({block:'start'})");
   await screenshot(settings,'updates-en');
   const history=require('../src/main/history');
   const record=history.record({selectionText:'Term about databases',windowInfo:{title:'Test window'},history:[{role:'user',content:'Explain'},{role:'assistant',content:'A rare searchable needle in a useful explanation.'}]},{model:'mock'});
   await js(settings,'window.floatask.openHistory()');
   const win=await waitFor(()=>page('history'),'history');
   await waitFor(()=>js(win,"document.querySelectorAll('.record').length===1"),'history list');
   await js(win,"document.querySelector('.record').click()");
   await waitFor(()=>js(win,"document.querySelectorAll('.history-message').length===2"),'detail');
   assert.equal(await js(win,"document.querySelector('#detail h2').textContent"),'Term about databases');
   await js(win,"document.querySelector('.detail-actions button').click()");
   await waitFor(()=>history.get(record.id).favorite,'favorite');
   await screenshot(win,'history-en');
   // Theme runtime: saving a theme broadcasts it to every open window without restart.
   const themeSaved=await js(settings,"window.floatask.saveSettings({theme:'light'})");
   assert.equal(themeSaved.settings.theme,'light');
   assert.equal(nativeTheme.themeSource,'light','nativeTheme follows the saved theme');
   await waitFor(()=>js(settings,"document.documentElement.dataset.theme==='light'"),'settings applies light theme');
   await waitFor(()=>js(win,"document.documentElement.dataset.theme==='light'"),'history follows light theme');
   const lightSurface=await js(settings,"getComputedStyle(document.documentElement).getPropertyValue('--fa-surface').trim()");
   assert.equal(lightSurface,'#F4F3ED','light theme swaps semantic variables only');
   await js(settings,"window.floatask.saveSettings({theme:'bogus'})");
   const invalidTheme=await js(settings,"(async()=>(await window.floatask.getSettings()).theme)()");
   assert.equal(invalidTheme,'system','invalid theme value falls back to system');
   await waitFor(()=>js(settings,"['dark','light'].includes(document.documentElement.dataset.theme)"),'system theme resolves to a concrete variant');
   await js(settings,"window.floatask.saveSettings({theme:'dark'})");
   await waitFor(()=>js(settings,"document.documentElement.dataset.theme==='dark' && getComputedStyle(document.documentElement).getPropertyValue('--fa-surface').trim()==='#171A20'"),'dark theme restores near-moon surface');
   await js(settings,"window.floatask.saveSettings({theme:'system'})");
   await js(win,"document.getElementById('searchInput').value='rare searchable needle';document.getElementById('searchInput').dispatchEvent(new Event('input'))");
   assert.equal(await js(win,"document.querySelectorAll('.record').length"),1);
   // History privacy operations (task 11): star sync, type filter, clear scope.
   await js(win,"document.getElementById('searchInput').value='';document.getElementById('searchInput').dispatchEvent(new Event('input'))");
   const typeFilters=await js(win,"[...document.querySelectorAll('[data-type-filter]')].map(b=>b.dataset.typeFilter)");
   assert.deepEqual(typeFilters,['all','capture','text','web'],'type filters offered');
   await js(win,"document.querySelector('[data-type-filter=web]').click();true");
   assert.equal(await js(win,"document.querySelectorAll('.record').length"),0,'the web filter hides a plain text record');
   await js(win,"document.querySelector('[data-type-filter=all]').click();true");
   assert.ok(await js(win,"Boolean(document.querySelector('.record .record-star'))"),'list rows expose a star toggle');
   assert.equal(await js(win,"document.querySelector('.record .record-star').getAttribute('tabindex')"),'0','the star is keyboard focusable');
   await js(win,"const s=document.querySelector('.record .record-star');s.focus();s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));true");
   await waitFor(()=>history.get(record.id).favorite===false,'keyboard Enter toggles the star');
   await waitFor(()=>js(win,"document.querySelector('.detail-actions button').textContent===window.FloatAskI18n.t('history.favorite')"),'detail star state syncs from the list');
   await js(win,"document.querySelector('.detail-actions button').click();true");
   await waitFor(()=>history.get(record.id).favorite===true,'detail star refavorites');
   assert.equal(await js(win,"document.querySelector('.record .record-star').classList.contains('on')"),true,'list star reflects the detail toggle');
   await js(win,"document.getElementById('clearBtn').click();true");
   assert.equal(await js(win,"document.getElementById('historyClearConfirm').hidden"),false,'clear offers an in-place confirm');
   assert.ok((await js(win,"document.getElementById('clearScope').textContent")).includes('1'),'clear shows the impact scope first');
   await js(win,"document.getElementById('historyClearCancel').click();true");
   assert.equal(await js(win,"document.getElementById('clearScope').hidden"),true,'cancel dismisses the confirm');
   assert.equal(history.list().length,1,'cancel keeps every record');
   await js(win,`window.floatask.resumeHistory(${JSON.stringify(record.id)})`);
   const result=await waitFor(()=>page('result'),'result');
   await waitFor(()=>js(result,"document.querySelectorAll('.message.assistant').length===1"),'restored messages');
   assert.equal(await js(result,"document.getElementById('statusText').textContent"),'Done');
   await screenshot(result,'result-en');
   // Shared controls (task 3): token-driven geometry, visible keyboard focus, menu discipline.
   const chipMetrics=await js(result,`(() => {
    const chip=document.querySelector('.quick-chip');
    const style=getComputedStyle(chip);
    return {radius:style.borderRadius,height:style.height,fontSize:style.fontSize};
   })()`);
   assert.equal(chipMetrics.radius,'8px','chips use the 8px radius token');
   assert.equal(chipMetrics.height,'28px','chips use the 28px height token');
   settings.focus();
   await pause(150);
   const focusRule=await js(settings,`(() => {
    const probe=document.createElement('button');
    probe.id='fixtureFocusProbe';
    document.body.appendChild(probe);
    probe.focus({focusVisible:true});
    const style=getComputedStyle(probe);
    const result={width:style.outlineWidth,offset:style.outlineOffset,style:style.outlineStyle};
    probe.remove();
    return result;
   })()`);
   assert.equal(focusRule.width,'2px','focus outline is 2px wide');
   assert.equal(focusRule.offset,'2px','focus outline has a 2px offset');
   assert.notEqual(focusRule.style,'none','focus outline is visible');
   const disabledSkipsTab=await js(settings,`(() => {
    const b=document.createElement('button');
    b.id='fixtureDisabledBtn'; b.disabled=true; b.className='fa-button';
    document.body.appendChild(b);
    b.focus();
    const result={skipped:document.activeElement!==b,cursor:getComputedStyle(b).cursor};
    b.remove();
    return result;
   })()`);
   assert.ok(disabledSkipsTab.skipped,'disabled controls stay out of the tab order');
   assert.equal(disabledSkipsTab.cursor,'not-allowed','disabled controls expose their state');
   const menuProbe=await js(settings,`(() => {
    if (typeof window.FloatAskFocus!=='object' || typeof window.FloatAskFocus.menu!=='function') return {missing:true};
    const trigger=document.createElement('button');
    trigger.id='fixtureMenuTrigger'; trigger.textContent='More';
    const menu=document.createElement('div');
    menu.id='fixtureMenu'; menu.className='fa-menu'; menu.hidden=true;
    menu.innerHTML="<button class='fa-menu-item' role='menuitem'>One</button><button class='fa-menu-item' role='menuitem'>Two</button>";
    document.body.append(trigger,menu);
    window.__fixtureMenu=window.FloatAskFocus.menu({trigger,menu});
    const itemStyle=getComputedStyle(menu.querySelector('.fa-menu-item'));
    return {missing:false,itemRadius:itemStyle.borderRadius,itemHeight:itemStyle.height};
   })()`);
   assert.ok(!menuProbe.missing,'focusMenu utility is exposed to pages');
   assert.equal(menuProbe.itemRadius,'10px','menu items use the 10px radius token');
   assert.equal(menuProbe.itemHeight,'36px','menu items use the 36px height token');
   await js(settings,"document.getElementById('fixtureMenuTrigger').click()");
   assert.equal(await js(settings,"document.getElementById('fixtureMenu').hidden"),false,'trigger opens the menu');
   assert.equal(await js(settings,"document.activeElement.textContent"),'One','focus enters the menu on open');
   await js(settings,"document.getElementById('fixtureMenu').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");
   assert.equal(await js(settings,"document.activeElement.textContent"),'Two','arrow keys move within the menu');
   await js(settings,"document.getElementById('fixtureMenu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
   assert.equal(await js(settings,"document.getElementById('fixtureMenu').hidden"),true,'Escape closes the menu');
   assert.equal(await js(settings,"document.activeElement.id"),'fixtureMenuTrigger','Escape returns focus to the trigger');
   await js(settings,"document.getElementById('fixtureMenuTrigger').click()");
   await js(settings,"document.body.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true}))");
   assert.equal(await js(settings,"document.getElementById('fixtureMenu').hidden"),true,'outside pointer closes the menu');
   assert.equal(await js(settings,"document.activeElement.id"),'fixtureMenuTrigger','outside close returns focus to the trigger');
   await js(settings,"window.__fixtureMenu.destroy();document.getElementById('fixtureMenuTrigger').remove();document.getElementById('fixtureMenu').remove()");
   await js(result,"document.getElementById('questionInput').value='Next question';document.getElementById('sendBtn').click()");
   await waitFor(()=>history.get(record.id).messages.length===4,'saved followup');
   assert.equal(calls.at(-1).model,'followup-reasoning');
   assert(calls.at(-1).messages.some(m=>m.content.includes('rare searchable needle')),'restored context sent');
   assert(calls.at(-1).messages[0].content.startsWith('You are'),'English model prompt');
   // Result window structure (task 4): compact 480x360, pinned sections, follow behavior.
   assert.deepEqual(result.getSize(),[480,360],'result window opens in the 480x360 compact state');
   assert.equal(await js(result,"document.body.dataset.mode"),'compact','compact mode is pinned on the document');
   await screenshot(result,'task4-compact-dark');
   assert.ok(['compact','standard','relaxed'].includes(await js(result,"document.documentElement.dataset.density")),'reading density attribute is set');
   assert.equal(await js(result,"document.querySelector('.scan-line')"),null,'scan-line decoration removed');
   const isolation=await js(result,`(() => {
    const doc=document.scrollingElement;
    return {docScroll:doc.scrollHeight-doc.clientHeight,messagesScroll:document.getElementById('messages').scrollHeight-document.getElementById('messages').clientHeight};
   })()`);
   assert.equal(isolation.docScroll,0,'the window itself never scrolls');
   const codeScroll=await js(result,`(() => {
    const probe=document.createElement('div');
    probe.className='md-body';
    probe.innerHTML='<pre><code>const x="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"</code></pre>';
    document.getElementById('messages').appendChild(probe);
    const style=getComputedStyle(probe.querySelector('pre'));
    const value=style.overflowX;
    probe.remove();
    return value;
   })()`);
   assert.equal(codeScroll,'auto','code blocks scroll horizontally inside the viewport');
   await js(result,"document.getElementById('expandBtn').click()");
   assert.equal(await js(result,"document.body.dataset.mode"),'expanded','expand switches the window mode');
   assert.deepEqual(result.getSize(),[560,640],'expanded state resizes the window');
   assert.equal(require('../src/main/store').getConfig().resultExpanded,true,'expanded state persists');
   await screenshot(result,'task4-expanded-dark');
   await js(result,"document.getElementById('expandBtn').click()");
   assert.deepEqual(result.getSize(),[480,360],'collapse restores the compact size');
   assert.equal(require('../src/main/store').getConfig().resultExpanded,false,'compact state persists');
   // Streaming follow: pinned at the bottom, pauses when reading up, resumes via the follow button.
   await js(result,"document.getElementById('liveRegion').textContent=''");
   await js(result,"document.getElementById('questionInput').value='Long stream test';document.getElementById('sendBtn').click()");
   await waitFor(()=>js(result,"document.getElementById('messages').scrollHeight>document.getElementById('messages').clientHeight*1.5"),'long stream overflows the viewport');
   const midLive=await js(result,"document.getElementById('liveRegion').textContent");
   assert.equal(midLive,'','streaming tokens are not announced');
   await js(result,"const m=document.getElementById('messages');m.scrollTop=0;m.dispatchEvent(new Event('scroll'))");
   await waitFor(()=>js(result,"!document.getElementById('followBtn').hidden"),'follow button appears while reading up');
   const pinnedTop=await js(result,"document.getElementById('messages').scrollTop");
   await pause(300);
   assert.ok(await js(result,"document.getElementById('messages').scrollTop")<60,'streaming pauses follow while reading up');
   assert.equal(await js(result,"document.getElementById('followBtn').hidden"),false,'follow stays offered while reading up');
   await js(result,"document.getElementById('followBtn').click()");
   await waitFor(()=>js(result,"(()=>{const m=document.getElementById('messages');return m.scrollHeight-m.scrollTop-m.clientHeight<8})()"),'follow button returns to the bottom');
   assert.equal(await js(result,"document.getElementById('followBtn').hidden"),true,'follow button hides at the bottom');
   await waitFor(()=>js(result,"document.getElementById('statusText').textContent==='Done'"),'long stream completes');
   await waitFor(()=>js(result,"document.getElementById('liveRegion').textContent.length>0"),'completion announced once');
   const announcement=await js(result,"document.getElementById('liveRegion').textContent");
   assert.equal(announcement,await js(result,"window.FloatAskI18n.t('result.announceDone')"),'live region announces completion, not tokens');
   await js(settings,"window.floatask.saveSettings({theme:'light'})");
   await waitFor(()=>js(result,"document.documentElement.dataset.theme==='light'"),'result follows light theme');
   await screenshot(result,'task4-compact-light');
   await js(settings,"window.floatask.saveSettings({theme:'dark'})");
   await waitFor(()=>js(result,"document.documentElement.dataset.theme==='dark'"),'result returns to dark theme');
   await js(result,"window.floatask.setLanguage('zh-CN')");
   await waitFor(()=>js(result,"document.documentElement.lang==='zh-CN'"),'switch back');
   assert.equal(await js(result,"document.getElementById('sendBtn').title"),'发送');
   assert.equal(await js(result,"document.getElementById('statusText').textContent"),'已完成');
   // OCR correction (task 5): raw/corrected stay distinguishable; correction never auto-resends.
   const ocrProbe=await js(result,`(async()=>{const s=await window.floatask.getResultState();return {raw:s.ocrRaw,corrected:s.ocrCorrected}})()`);
   assert.ok(ocrProbe.raw && ocrProbe.raw.length>0,'raw OCR exposed in result state');
   assert.equal(ocrProbe.corrected,null,'no correction applied yet');
   assert.ok(await js(result,"Boolean(document.getElementById('ocrEditBtn') && document.getElementById('localOnlyNote'))"),'context panel exposes the correction affordance and local-only note');
   const callsBeforeCorrection=calls.length;
   await js(result,"window.floatask.correctOcr('corrected needle')");
   await pause(400);
   assert.equal(calls.length,callsBeforeCorrection,'correction does not resend the model request');
   const ocrAfter=await js(result,`(async()=>{const s=await window.floatask.getResultState();return {raw:s.ocrRaw,corrected:s.ocrCorrected}})()`);
   assert.equal(ocrAfter.corrected,'corrected needle','corrected OCR is tracked');
   assert.equal(ocrAfter.raw,ocrProbe.raw,'raw OCR is untouched by the correction');
   await waitFor(()=>js(result,"!document.getElementById('ocrCorrectedBadge').hidden"),'corrected badge shows');
   assert.equal(await js(result,"document.getElementById('ocrText').textContent"),'corrected needle','context panel shows the corrected text');
   // Reverting restores the raw text and clears the correction.
   await js(result,"window.floatask.correctOcr('')");
   await waitFor(()=>js(result,"document.getElementById('ocrCorrectedBadge').hidden"),'badge clears on revert');
   const ocrReverted=await js(result,`(async()=>{const s=await window.floatask.getResultState();return {raw:s.ocrRaw,corrected:s.ocrCorrected}})()`);
   assert.equal(ocrReverted.corrected,null,'revert clears the correction');
   assert.equal(ocrReverted.raw,ocrProbe.raw,'revert keeps the raw OCR');
   assert.equal(await js(result,"document.getElementById('ocrText').textContent"),ocrProbe.raw,'context restores the raw text');
   await js(result,"window.floatask.correctOcr('corrected needle')");
   await waitFor(()=>js(result,"!document.getElementById('ocrCorrectedBadge').hidden"),'re-correction badge shows');
   await js(result,"document.getElementById('questionInput').value='Correction check';document.getElementById('sendBtn').click()");
   await waitFor(()=>calls.length>callsBeforeCorrection,'corrected followup sent');
   const correctedCall=calls.at(-1);
   assert.ok(correctedCall.messages[0].content.includes('corrected needle'),'system context uses the corrected OCR text');
   assert.ok(!correctedCall.messages[0].content.includes(ocrProbe.raw),'raw OCR text is no longer sent');
   // Re-selection must confirm before discarding the correction.
   await js(result,"window.__confirmCalled=false;window.confirm=()=>{window.__confirmCalled=true;return false};true");
   await js(result,"document.getElementById('newSelectBtn').click()");
   await pause(300);
   assert.equal(await js(result,"window.__confirmCalled"),true,'re-selection asks for confirmation while a correction exists');
   assert.equal(Boolean(page('selection')),false,'confirmation declined: no selection overlay opens');
   await js(result,"delete window.confirm");
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
   assert.equal(history.get(record.id).messages.length,8,'disabled history stays unchanged (6 + correction-check exchange)');
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
   assert(Array.isArray(calls.at(-1).messages.at(-1).content),'screenshot attached to vision model');
   assert.equal(requestPaths.at(-1),'/v1/chat/completions','vision inheritance uses default endpoint, not the initial override');
   const visionProbe=await js(result,`(async()=>{const s=await window.floatask.getResultState();return s.visionAttachment})()`);
   assert.equal(visionProbe.enabled,true,'vision attachment marked as sent');
   assert.ok(visionProbe.bytes>0,'vision attachment exposes its compressed size');
   assert.equal(visionProbe.width,200,'vision attachment exposes the selection width');
   assert.equal(visionProbe.height,100,'vision attachment exposes the selection height');
   assert.ok((await js(result,"document.getElementById('visionAttachmentNote').textContent")).includes('200'),'context panel shows the attachment dimensions');
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
   await pause(1100);
   const racedState = await js(result,'window.floatask.getResultState()');
   assert(racedState.init.selectionText.includes('new-capture'),'slow earlier capture must not replace the newer session');
   assert(!calls.slice(beforeCaptureRace).some(call=>call.messages[0].content.includes('old-capture')),'stale capture must not start an AI request');
   await js(settings,"window.floatask.setLanguage('en')");
   await waitFor(()=>js(font,"document.getElementById('importBtn').textContent==='＋ Import font file…'"),'font translated');
   await js(result,"document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
   assert.equal(result.isVisible(),false,'Escape closes the answer window at the top of its Esc hierarchy');
   await js(settings,'window.floatask.saveSettings({showBubble:true})');
   const bubble=await waitFor(()=>page('bubble'),'bubble');
   await waitFor(()=>js(bubble,"document.getElementById('askBtn').title.includes('Capture')"),'bubble translated');
   // Capsule toolbar (task 6): expanded capsule geometry and more-menu discipline.
   assert.deepEqual(bubble.getSize(),[348,72],'bubble window hosts the 328x52 expanded capsule plus its shadow padding');
   assert.equal(await js(bubble,"document.body.dataset.mode"),'expanded','capsule starts expanded');
   await js(bubble,"document.getElementById('moreBtn').click()");
   assert.equal(await js(bubble,"document.getElementById('moreMenu').hidden"),false,'more button opens the menu');
   const menuItems=await js(bubble,"[...document.querySelectorAll('#moreMenu .fa-menu-item')].map(b=>b.textContent)");
   assert.deepEqual(menuItems,['Settings','Hide toolbar','Quit FloatAsk'],'menu carries only settings, hide and quit');
   assert.equal(await js(bubble,"document.activeElement.textContent"),'Settings','focus enters the menu on open');
   await js(bubble,"document.getElementById('moreMenu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
   assert.equal(await js(bubble,"document.getElementById('moreMenu').hidden"),true,'Escape closes the menu');
   assert.equal(await js(bubble,"document.activeElement.id"),'moreBtn','Escape returns focus to the more button');
   await js(bubble,'window.floatask.startSelection()');
   const selection=await waitFor(()=>page('selection'),'selection');
   await waitFor(()=>js(selection,"document.documentElement.lang==='en' && !/[\u4e00-\u9fff]/.test(document.getElementById('hintText').textContent)"),'selection translated');
   // Selection overlay (task 7): restrained mask, viewfinder corners, size hint, Esc.
   const overlayMetrics=await js(selection,`(() => {
    const stage=document.getElementById('stage');
    const box=document.getElementById('box');
    return {
      mask:getComputedStyle(stage).backgroundColor,
      glow:getComputedStyle(box).boxShadow,
      corners:document.querySelectorAll('#box .corner').length
    };
   })()`);
   assert.equal(overlayMetrics.mask,'rgba(6, 8, 11, 0.72)','mask uses the overlay token');
   assert.equal(overlayMetrics.glow,'none','selection box carries no glow');
   assert.equal(overlayMetrics.corners,4,'viewfinder corners present');
   const dragSize=await js(selection,`(() => {
    const s=document.getElementById('stage');
    s.dispatchEvent(new PointerEvent('pointerdown',{clientX:120,clientY:120,button:0,bubbles:true}));
    s.dispatchEvent(new PointerEvent('pointermove',{clientX:320,clientY:220,bubbles:true}));
    return document.getElementById('size').textContent;
   })()`);
   assert.equal(dragSize,'200 × 100','size hint follows the drag');
   await js(selection,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
   await waitFor(()=>!page('selection'),'Escape closes the overlay');
   assert.deepEqual(errors,[],'no renderer errors');
   console.log('PASS: real Electron pages, bilingual UI, shortcut recording/conflict, per-task routing, profile testing, screenshot routing/fallback, update UI, history/privacy');
   app.exit(0);
  } catch(err) { console.error(err.stack); console.error('Renderer errors:',errors); app.exit(1); }
 }).catch(err=>{console.error(err);app.exit(1);});
});
setTimeout(()=>{console.error('Smoke test timed out');app.exit(1);},45000);
