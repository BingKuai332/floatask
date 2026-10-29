'use strict';

const api = window.floatask;
const els = {
  compareBtn: document.getElementById('compareBtn'),
  closeBtn: document.getElementById('closeBtn'),
  previewImg: document.getElementById('previewImg'),
  sourceText: document.getElementById('sourceText'),
  ocrMeta: document.getElementById('ocrMeta'),
  translationText: document.getElementById('translationText'),
  translationStatus: document.getElementById('translationStatus'),
  targetChip: document.getElementById('targetChip'),
  copyBtn: document.getElementById('copyBtn'),
  retryBtn: document.getElementById('retryBtn'),
  searchBtn: document.getElementById('searchBtn'),
  closeFooterBtn: document.getElementById('closeFooterBtn'),
  searchPanel: document.getElementById('searchPanel'),
  searchQuery: document.getElementById('searchQuery'),
  searchStatus: document.getElementById('searchStatus'),
  searchResults: document.getElementById('searchResults'),
  searchClose: document.getElementById('searchClose'),
  toast: document.getElementById('toast')
};

const state = {
  target: 'zh',
  text: '',
  preview: '',
  translation: '',
  busy: false,
  searchSource: 'translation',
  toastTimer: null
};

function toast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.className = 'toast show';
  state.toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2200);
}

function setTarget(target) {
  state.target = target === 'en' ? 'en' : 'zh';
  els.targetChip.textContent = state.target === 'en' ? 'English' : '中文';
  for (const button of document.querySelectorAll('.lang-btn')) {
    button.classList.toggle('active', button.dataset.target === state.target);
  }
}

function setBusy(busy) {
  state.busy = Boolean(busy);
  els.retryBtn.disabled = state.busy;
  els.copyBtn.disabled = !state.translation;
}

function setStatus(text, error = false) {
  els.translationStatus.textContent = text || '';
  els.translationStatus.classList.toggle('error-box', Boolean(error));
}

function setTranslation(text) {
  state.translation = text || '';
  els.translationText.textContent = state.translation || '';
  els.copyBtn.disabled = !state.translation;
}

function setSearchSource(source) {
  state.searchSource = source === 'source' ? 'source' : 'translation';
  for (const button of els.searchPanel.querySelectorAll('[data-search-source]')) {
    button.classList.toggle('active', button.dataset.searchSource === state.searchSource);
  }
}

function openSearch(source = state.searchSource) {
  const text = source === 'source' ? state.text : state.translation;
  if (!String(text || '').trim()) {
    toast(source === 'source' ? '没有可检索的原文' : '译文还没有生成，稍后再试');
    return;
  }
  setSearchSource(source);
  els.searchPanel.hidden = false;
  els.searchQuery.textContent = '查询：' + String(text).replace(/\s+/g, ' ').slice(0, 160);
  els.searchStatus.textContent = '正在检索…';
  els.searchResults.replaceChildren();
  api.searchTranslation(text);
}

function renderSearchResults(payload) {
  els.searchStatus.textContent = payload.results?.length
    ? `找到 ${payload.results.length} 条结果 · 点击打开来源`
    : '没有找到结果，换个关键词或检查搜索设置';
  els.searchResults.replaceChildren();
  if (!payload.results?.length) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = '可以切换到“检索原文”，或用更短的关键词再试一次。';
    els.searchResults.appendChild(empty);
    return;
  }
  for (const item of payload.results) {
    const link = document.createElement('a');
    link.className = 'search-item';
    link.href = '#';
    link.dataset.url = item.url || '';
    const title = document.createElement('span');
    title.className = 'search-item-title';
    title.textContent = item.title || item.url || '未命名结果';
    const url = document.createElement('span');
    url.className = 'search-item-url';
    url.textContent = item.url || '';
    const snippet = document.createElement('span');
    snippet.className = 'search-item-snippet';
    snippet.textContent = String(item.snippet || item.content || '').slice(0, 260);
    link.append(title, url, snippet);
    els.searchResults.appendChild(link);
  }
}

function resetView(payload) {
  state.text = payload?.text || '';
  state.preview = payload?.preview || '';
  state.translation = '';
  setTarget(payload?.target || 'zh');
  els.previewImg.src = state.preview;
  els.sourceText.textContent = state.text || '（未识别到文字，正在尝试直接理解截图）';
  els.ocrMeta.textContent = state.text ? `${state.text.replace(/\s+/g, '').length} 字` : '无 OCR 文字';
  els.translationText.innerHTML = '<div class="waiting"><span class="spinner"></span>正在翻译…</div>';
  els.compareBtn.classList.add('active');
  document.body.classList.remove('single');
  els.searchPanel.hidden = true;
  setBusy(true);
  setStatus('正在连接模型…');
}

function handleEvent(payload) {
  if (!payload || !payload.type) return;
  switch (payload.type) {
    case 'ocr':
      state.text = payload.text || '';
      els.sourceText.textContent = state.text || '（未识别到文字，正在尝试直接理解截图）';
      els.ocrMeta.textContent = state.text ? `${state.text.replace(/\s+/g, '').length} 字` : '无 OCR 文字';
      break;
    case 'target':
      setTarget(payload.target);
      break;
    case 'phase':
      setStatus(payload.message || '正在翻译…');
      break;
    case 'start':
      setBusy(true);
      setStatus('正在翻译…');
      break;
    case 'delta':
      if (els.translationText.querySelector('.waiting')) els.translationText.textContent = '';
      state.translation += payload.text || '';
      els.translationText.textContent = state.translation;
      els.translationText.scrollTop = els.translationText.scrollHeight;
      setStatus('翻译中…');
      break;
    case 'done':
      setBusy(false);
      setTranslation(payload.text || state.translation);
      setStatus('翻译完成');
      break;
    case 'search-start':
      els.searchPanel.hidden = false;
      els.searchStatus.textContent = '正在检索…';
      break;
    case 'search-results':
      renderSearchResults(payload);
      break;
    case 'search-error':
      els.searchStatus.textContent = payload.message || '检索失败';
      els.searchResults.replaceChildren();
      break;
    case 'error':
      setBusy(false);
      els.translationText.innerHTML = '';
      const error = document.createElement('div');
      error.className = 'error-box';
      error.textContent = [payload.message, payload.hint].filter(Boolean).join('\n');
      els.translationText.appendChild(error);
      setStatus(payload.message || '翻译失败', true);
      break;
    default:
      break;
  }
}

els.compareBtn.addEventListener('click', () => {
  const single = !document.body.classList.contains('single');
  document.body.classList.toggle('single', single);
  els.compareBtn.classList.toggle('active', !single);
  els.compareBtn.textContent = single ? '原图' : '对照';
});

els.closeBtn.addEventListener('click', () => api.closeTranslate());
els.closeFooterBtn.addEventListener('click', () => api.closeTranslate());

els.copyBtn.addEventListener('click', async () => {
  if (!state.translation) return;
  await api.copyText(state.translation);
  toast('译文已复制');
});

els.retryBtn.addEventListener('click', () => {
  if (state.busy) return;
  api.retranslate(state.target);
});

els.searchBtn.addEventListener('click', () => {
  const source = state.translation.trim() ? 'translation' : 'source';
  openSearch(source);
});

els.searchClose.addEventListener('click', () => { els.searchPanel.hidden = true; });

for (const button of document.querySelectorAll('[data-search-source]')) {
  button.addEventListener('click', () => openSearch(button.dataset.searchSource));
}

els.searchResults.addEventListener('click', (event) => {
  const item = event.target.closest('.search-item');
  if (!item || !item.dataset.url) return;
  event.preventDefault();
  api.openExternal(item.dataset.url);
});

for (const button of document.querySelectorAll('.lang-btn')) {
  button.addEventListener('click', () => {
    if (state.busy) return;
    setTarget(button.dataset.target);
    api.retranslate(state.target);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') api.closeTranslate();
});

api.onTranslateInit((payload) => resetView(payload));
api.onTranslateEvent(handleEvent);
