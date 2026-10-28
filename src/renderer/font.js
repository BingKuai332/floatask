'use strict';

const api = window.floatask;
const FONT = window.FloatAskFont;
const DEFAULT_STACK = FONT.DEFAULT_STACK;

const els = {
  fontList: document.getElementById('fontList'),
  importBtn: document.getElementById('importBtn'),
  searchInput: document.getElementById('searchInput'),
  fontCount: document.getElementById('fontCount'),
  currentFontName: document.getElementById('currentFontName'),
  previewCard: document.getElementById('previewCard'),
  sizeRange: document.getElementById('sizeRange'),
  sizeValue: document.getElementById('sizeValue'),
  lineRange: document.getElementById('lineRange'),
  lineValue: document.getElementById('lineValue'),
  resetBtn: document.getElementById('resetBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  applyBtn: document.getElementById('applyBtn'),
  closeBtn: document.getElementById('closeBtn'),
  toast: document.getElementById('toast')
};

const state = {
  fonts: [],
  custom: null,
  selected: 'system',
  size: 12.8,
  lineHeight: 1.72,
  scope: 'all',
  loading: true,
  toastTimer: null
};

function cssFamily(family) {
  if (family === 'custom') return FONT.stack({ family: 'custom', customFile: state.custom?.file });
  if (!family || family === 'system') return DEFAULT_STACK;
  return `"${String(family).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif`;
}

function selectedLabel() {
  if (state.selected === 'system') return '系统默认';
  if (state.selected === 'custom') return `${state.custom?.name || '我的字体'}（导入）`;
  return state.selected;
}

function showToast(message, bad = false) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show${bad ? ' bad' : ''}`;
  state.toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2400);
}

function updatePreview() {
  const fontForPreview = {
    family: state.selected,
    customFile: state.custom?.file || '',
    scope: state.scope
  };
  const family = FONT.stack(fontForPreview);
  els.previewCard.style.setProperty('--preview-font', family);
  els.previewCard.style.setProperty('--preview-size', `${state.size}px`);
  els.previewCard.style.setProperty('--preview-line', String(state.lineHeight));
  els.sizeValue.textContent = String(state.size);
  els.lineValue.textContent = state.lineHeight.toFixed(2);
  els.currentFontName.textContent = selectedLabel();
  FONT.apply(fontForPreview, { ui: true });
  for (const button of document.querySelectorAll('.scope-seg button')) {
    button.classList.toggle('active', button.dataset.scope === state.scope);
  }
}

function makeFontItem(family, label, sample) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'font-item';
  button.dataset.family = family;
  if (state.selected === family) button.classList.add('active');
  if (family === 'custom') button.classList.add('font-item-custom');
  button.style.fontFamily = cssFamily(family);

  const name = document.createElement('span');
  name.className = 'font-item-name';
  name.textContent = label;
  const preview = document.createElement('span');
  preview.className = 'font-item-sample';
  preview.textContent = sample;
  button.appendChild(name);
  button.appendChild(preview);

  button.addEventListener('click', () => {
    state.selected = family;
    updatePreview();
    for (const item of els.fontList.querySelectorAll('.font-item')) {
      item.classList.toggle('active', item.dataset.family === family);
    }
  });
  return button;
}

function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  els.fontList.innerHTML = '';
  if (state.loading) {
    const loading = document.createElement('div');
    loading.className = 'list-loading';
    loading.innerHTML = '<span class="spinner"></span>正在读取系统字体…';
    els.fontList.appendChild(loading);
    return;
  }

  let visible = 0;
  if (!query || '系统默认 system'.includes(query)) {
    els.fontList.appendChild(makeFontItem('system', '系统默认', '永字八法 Aa 123'));
    visible++;
  }

  if (state.custom?.file) {
    const customText = `${state.custom.name || '我的字体'} 导入`.toLowerCase();
    if (!query || customText.includes(query)) {
      els.fontList.appendChild(makeFontItem('custom', `${state.custom.name || '我的字体'} · 导入`, '导入字体 · 永字八法 Aa 123'));
      visible++;
    }
  }

  for (const family of state.fonts) {
    if (query && !family.toLowerCase().includes(query)) continue;
    els.fontList.appendChild(makeFontItem(family, family, '永字八法 Aa 123'));
    visible++;
  }

  if (!visible && query) {
    const empty = document.createElement('div');
    empty.className = 'list-loading';
    empty.textContent = '没有匹配的字体';
    els.fontList.appendChild(empty);
  }
  els.fontCount.textContent = String(state.fonts.length);
}

async function load() {
  try {
    const result = await api.listFonts();
    state.fonts = Array.isArray(result?.fonts) ? result.fonts : [];
    state.loading = false;
    const current = result?.current || {};
    state.custom = current.customFile
      ? { file: current.customFile, name: current.customName || '我的字体' }
      : null;
    const family = current.family || 'system';
    state.selected = family === 'system' || family === 'custom' || state.fonts.includes(family)
      ? family
      : 'system';
    state.size = Number(current.size) || 12.8;
    state.lineHeight = Number(current.lineHeight) || 1.72;
    state.scope = current.scope === 'reading' ? 'reading' : 'all';
    els.sizeRange.value = String(state.size);
    els.lineRange.value = String(state.lineHeight);
    renderList();
    updatePreview();
    if (result?.fallback) showToast('未能读取系统字体，已显示备用字体列表', true);
  } catch (err) {
    state.loading = false;
    state.fonts = [
      'Microsoft YaHei UI', 'Microsoft YaHei', 'Segoe UI', 'SimSun', 'SimHei',
      'KaiTi', 'FangSong', 'DengXian', 'Cascadia Code', 'Consolas'
    ];
    renderList();
    updatePreview();
    showToast(`读取字体失败：${err.message}`, true);
  }
}

els.searchInput.addEventListener('input', renderList);

els.importBtn.addEventListener('click', async () => {
  els.importBtn.disabled = true;
  const oldText = els.importBtn.textContent;
  els.importBtn.textContent = '正在导入…';
  try {
    const result = await api.importFont();
    if (!result?.ok) {
      if (!result?.canceled) showToast(result?.message || '导入失败', true);
      return;
    }
    state.custom = {
      file: result.font?.customFile || '',
      name: result.font?.customName || result.name || '我的字体'
    };
    state.selected = 'custom';
    renderList();
    updatePreview();
    showToast(`已导入「${state.custom.name}」`);
  } catch (err) {
    showToast(err.message || '导入失败', true);
  } finally {
    els.importBtn.disabled = false;
    els.importBtn.textContent = oldText;
  }
});

for (const button of document.querySelectorAll('.scope-seg button')) {
  button.addEventListener('click', () => {
    state.scope = button.dataset.scope === 'reading' ? 'reading' : 'all';
    updatePreview();
  });
}

els.sizeRange.addEventListener('input', () => {
  state.size = Number(els.sizeRange.value);
  updatePreview();
});
els.lineRange.addEventListener('input', () => {
  state.lineHeight = Number(els.lineRange.value);
  updatePreview();
});

els.resetBtn.addEventListener('click', () => {
  state.selected = 'system';
  state.size = 12.8;
  state.lineHeight = 1.72;
  state.scope = 'all';
  els.sizeRange.value = '12.8';
  els.lineRange.value = '1.72';
  renderList();
  updatePreview();
  showToast('已恢复默认值，点“应用字体”生效');
});

els.applyBtn.addEventListener('click', async () => {
  els.applyBtn.disabled = true;
  els.applyBtn.textContent = '应用…';
  try {
    const result = await api.applyFont({
      family: state.selected,
      size: state.size,
      lineHeight: state.lineHeight,
      scope: state.scope
    });
    if (!result?.ok) {
      showToast(result?.message || '应用失败', true);
      return;
    }
    showToast('字体已应用');
    setTimeout(() => api.closeFontWindow(), 220);
  } catch (err) {
    showToast(err.message || '应用失败', true);
  } finally {
    els.applyBtn.disabled = false;
    els.applyBtn.textContent = '应用字体';
  }
});

els.cancelBtn.addEventListener('click', () => api.closeFontWindow());
els.closeBtn.addEventListener('click', () => api.closeFontWindow());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') api.closeFontWindow();
});

load();
