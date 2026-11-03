'use strict';
const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);
const md = window.FloatAskMarkdown;
const list = document.getElementById('recordList');
const detail = document.getElementById('detail');
let records = [], selected = null, favorites = false, query = '', generation = 0;
let typeFilter = 'all', deleteArmed = false, toastTimer;
const texts = new Map();
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
function typeOf(row) {
 if (Number(row.sourceCount) > 0) return 'web';
 if (row.hasImage || row.source === 'selection') return 'capture';
 return 'text';
}
function renderList() {
 list.replaceChildren();
 document.querySelector('.history-header small')?.setAttribute('data-term-count',tt('history.termCount',{count:records.length}));
 const rows=records.filter(r=>(!favorites || r.favorite) && (typeFilter==='all' || typeOf(r)===typeFilter) && (!query || texts.get(r.id)?.includes(query)));
 if(!rows.length) { const el=document.createElement('p'); el.className='empty'; el.textContent=tt(query?'history.emptySearch':favorites?'history.emptyFav':'history.empty'); list.append(el); }
 for(const row of rows) {
  const el=document.createElement('button'); el.className='record'+(selected?.id===row.id?' selected':''); el.dataset.id=row.id;
  const star=document.createElement('span'); star.className='record-star'+(row.favorite?' on':''); star.textContent='★'; star.setAttribute('role','button'); star.setAttribute('tabindex','0'); star.setAttribute('aria-label',tt(row.favorite?'history.unfavorite':'history.favorite'));
  star.addEventListener('click',(event)=>{event.stopPropagation();toggleFavorite(row);});
  star.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();toggleFavorite(row);}});
  const title=document.createElement('strong'); title.textContent=row.title || tt('history.untitled');
  const hash=document.createElement('span'); hash.className='record-hash'; hash.textContent=window.FloatAskShortHash.shortHash(row.id);
  const snippet=document.createElement('p'); snippet.textContent=row.snippet;
  const meta=document.createElement('small'); meta.textContent=date(row.updatedAt)+' · '+tt('history.msgCount',{n:row.messageCount});
  meta.append(hash); el.append(star,title,snippet,meta); el.addEventListener('click',()=>select(row.id)); list.append(el);
 }
}
async function toggleFavorite(row) {
 try {
  check(await api.setHistoryFavorite(row.id,!row.favorite));
  const target=records.find(r=>r.id===row.id); if(target) target.favorite=!row.favorite;
  if(selected?.id===row.id) selected.favorite=!row.favorite;
  renderList(); renderDetail();
 } catch(err) { toast(err.message); }
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
  const target=records.find(r=>r.id===record.id); if(target) target.favorite=!record.favorite;
  selected.favorite=!record.favorite; renderList(); renderDetail();
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
 const result=check(await api.listHistory()); records=result.records;
 texts.clear();
 // Full text is indexed locally; no queries leave this device.
 await Promise.all(records.map(async r=>{
  const result=check(await api.getHistoryRecord(r.id)); const record=result.record;
  texts.set(r.id,[r.title,r.windowTitle,record?.selectionText,...(record?.messages || []).map(m=>m.content)].join(' ').toLowerCase());
 }));
 renderList();
}
document.getElementById('searchInput').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();renderList();});
for(const [id,value] of [['allBtn',false],['favBtn',true]]) document.getElementById(id).onclick=()=>{
 favorites=value; document.getElementById('allBtn').classList.toggle('active',!value);document.getElementById('favBtn').classList.toggle('active',value);renderList();
};
for(const btn of document.querySelectorAll('[data-type-filter]')) btn.onclick=()=>{
 typeFilter=btn.dataset.typeFilter;
 for(const other of document.querySelectorAll('[data-type-filter]')) other.classList.toggle('active',other===btn);
 renderList();
};
const clearScope=document.getElementById('clearScope');
document.getElementById('clearBtn').onclick=()=>{
 const total=records.length, kept=records.filter(r=>r.favorite).length;
 document.getElementById('clearScopeText').textContent=tt('history.clearScope',{remove:total-kept,keep:kept});
 clearScope.hidden=false;
};
document.getElementById('historyClearCancel').onclick=()=>{ clearScope.hidden=true; };
document.getElementById('historyClearConfirm').onclick=async()=>{
 try {
  check(await api.clearHistory(true)); selected=null; clearScope.hidden=true; await refresh(); renderDetail();
  toast(tt('history.clearedToast'));
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
