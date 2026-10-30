'use strict';
const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);
const md = window.FloatAskMarkdown;
const list = document.getElementById('recordList');
const detail = document.getElementById('detail');
let records = [], selected = null, favorites = false, query = '', generation = 0;
let clearArmed = false, deleteArmed = false, toastTimer;
let refreshGeneration = 0, searchTimer;
function toast(text) {
 const el=document.getElementById('toast'); el.textContent=text; el.className='show';
 clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.className='',2800);
}
function check(result) { if(!result?.ok) throw new Error(result?.message || tt('history.resumeFailed')); return result; }
function date(value) { return new Date(value).toLocaleString(window.FloatAskI18n.language); }
function button(key, action) {
 const el=document.createElement('button'); el.className='btn'; el.textContent=tt(key);
 el.addEventListener('click',()=>Promise.resolve().then(()=>action(el)).catch(err=>toast(err.message))); return el;
}
function renderList() {
 list.replaceChildren();
 const rows=records;
 if(!rows.length) { const el=document.createElement('p'); el.className='empty'; el.textContent=tt(query?'history.emptySearch':favorites?'history.emptyFav':'history.empty'); list.append(el); }
 for(const row of rows) {
  const el=document.createElement('button'); el.className='record'+(selected?.id===row.id?' selected':''); el.dataset.id=row.id;
  const title=document.createElement('strong'); title.textContent=(row.favorite?'★ ':'')+(row.title || tt('history.untitled'));
  const snippet=document.createElement('p'); snippet.textContent=row.snippet;
  const meta=document.createElement('small'); meta.textContent=date(row.updatedAt)+' · '+tt('history.msgCount',{n:row.messageCount});
  el.append(title,snippet,meta); el.addEventListener('click',()=>select(row.id)); list.append(el);
 }
}
async function select(id) {
 const version=++generation;
 try { const result=check(await api.getHistoryRecord(id)); if(version!==generation) return;
 selected=result.record; deleteArmed=false; renderDetail(); renderList();
 } catch(err) { toast(err.message); }
}
function renderDetail() {
 detail.replaceChildren();
 if(!selected) { const p=document.createElement('p'); p.className='empty'; p.textContent=tt('history.pick'); detail.append(p); return; }
 const record=selected;
 const title=document.createElement('h2'); title.textContent=record.title || tt('history.untitled');
 const meta=document.createElement('small'); meta.textContent=[date(record.updatedAt),record.windowTitle,record.model].filter(Boolean).join(' · ');
 const actions=document.createElement('div'); actions.className='detail-actions';
 actions.append(button(record.favorite?'history.unfavorite':'history.favorite', async()=>{
  check(await api.setHistoryFavorite(record.id,!record.favorite));
 }),button('history.resume',async()=>{check(await api.resumeHistory(record.id));}),
 button('history.copyAll',async()=>{await api.copyText([record.selectionText,...record.messages.map(m=>m.content)].filter(Boolean).join('\n\n')); toast(tt('history.copiedToast'));}),
 button(deleteArmed?'common.confirmDelete':'common.delete',async()=>{
  if(!deleteArmed) {deleteArmed=true; renderDetail(); return;}
  check(await api.deleteHistoryRecord(record.id)); selected=null; await refresh(); renderDetail(); toast(tt('history.deletedToast'));
 }));
 detail.append(title,meta,actions);
 if(record.hasImage) {const p=document.createElement('p');p.textContent=tt('history.readOnlyImage');detail.append(p);}
 if(record.selectionText) {const pre=document.createElement('pre');pre.className='capture-text';pre.textContent=record.selectionText;detail.append(pre);}
 for(const message of record.messages || []) {
  const el=document.createElement('div'); el.className='history-message '+message.role;
  if(message.role==='assistant') el.innerHTML=md.render(message.content); else el.textContent=message.content;
  detail.append(el);
 }
 if(record.sources?.length) {
  const head=document.createElement('h3'); head.textContent=tt('history.sourcesTitle',{n:record.sources.length}); detail.append(head);
  for(const source of record.sources) {const link=document.createElement('button');link.className='btn';link.textContent=source.title || source.url;link.onclick=()=>api.openExternal(source.url); detail.append(link);}
 }
}
async function refresh() {
 const version = ++refreshGeneration;
 const result = check(await api.listHistory({query, favorites}));
 if (version !== refreshGeneration) return;
 records = result.records; renderList();
}
function refreshSafely() { return refresh().catch(err=>toast(err.message)); }
document.getElementById('searchInput').addEventListener('input',event=>{
 query=event.target.value.trim().toLowerCase(); ++refreshGeneration;
 clearTimeout(searchTimer); searchTimer=setTimeout(refreshSafely,120);
});
for(const [id,value] of [['allBtn',false],['favBtn',true]]) document.getElementById(id).onclick=()=>{
 favorites=value; document.getElementById('allBtn').classList.toggle('active',!value);document.getElementById('favBtn').classList.toggle('active',value);refreshSafely();
};
document.getElementById('clearBtn').onclick=async()=>{
 try {
  if(!clearArmed) { clearArmed=true; document.getElementById('clearBtn').textContent=tt('history.clearBtnConfirm'); return; }
  check(await api.clearHistory(true)); clearArmed=false; selected=null; await refresh(); renderDetail();
  document.getElementById('clearBtn').textContent=tt('history.clearBtn'); toast(tt('history.clearedToast'));
 } catch(err) {toast(err.message);}
};
document.getElementById('closeBtn').onclick=()=>api.closeHistory();
document.addEventListener('keydown',e=>{if(e.key==='Escape')api.closeHistory();});
document.addEventListener('click',e=>{const a=e.target.closest('a[data-url]');if(a){e.preventDefault();api.openExternal(a.dataset.url);}});
document.addEventListener('floatask:language',()=>{renderList();renderDetail();});
api.onHistoryUpdated(()=>refresh().then(()=>selected?select(selected.id):null).catch(err=>toast(err.message)));
api.onHistoryShowRecord(({id})=>select(id));
api.onFontUpdated(font=>window.FloatAskFont.apply(font,{reading:true,ui:true}));
Promise.all([window.FloatAskI18nReady,api.getFont().then(font=>window.FloatAskFont.apply(font,{reading:true,ui:true}))]).then(refresh).catch(err=>toast(tt('history.loadFailed',{err:err.message})));
