'use strict';

const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);
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
  if (state.selected === 'system') return tt('settings.fontSystem');
  if (state.selected === 'custom') return `${state.custom?.name || tt('settings.fontMy')}${tt('settings.fontImportedSuffix')}`;
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
    loading.innerHTML = `<span class="spinner"></span>${tt('font.loading')}`;
    els.fontList.appendChild(loading);
    return;
  }

  let visible = 0;
  if (!query || (tt('font.systemDefault') + ' system').toLowerCase().includes(query)) {
    els.fontList.appendChild(makeFontItem('system', tt('settings.fontSystem'), tt('font.sample')));
    visible++;
  }

  if (state.custom?.file) {
    const customText = `${state.custom.name || tt('settings.fontMy')} ${tt('font.customSuffix')}`.toLowerCase();
    if (!query || customText.includes(query)) {
      els.fontList.appendChild(makeFontItem('custom', `${state.custom.name || tt('settings.fontMy')} ${tt('font.customSuffix')}`, tt('font.sample')));
      visible++;
    }
  }

  for (const family of state.fonts) {
    if (query && !family.toLowerCase().includes(query)) continue;
    els.fontList.appendChild(makeFontItem(family, family, tt('font.sample')));
    visible++;
  }

  if (!visible && query) {
    const empty = document.createElement('div');
    empty.className = 'list-loading';
    empty.textContent = tt('font.noMatch');
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
      ? { file: current.customFile, name: current.customName || tt('settings.fontMy') }
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
    if (result?.fallback) showToast(tt('font.fallbackToast'), true);
  } catch (err) {
    state.loading = false;
    state.fonts = [
      'Microsoft YaHei UI', 'Microsoft YaHei', 'Segoe UI', 'SimSun', 'SimHei',
      'KaiTi', 'FangSong', 'DengXian', 'Cascadia Code', 'Consolas'
    ];
    renderList();
    updatePreview();
    showToast(tt('font.readFailed', { err: err.message }), true);
  }
}

els.searchInput.addEventListener('input', renderList);

els.importBtn.addEventListener('click', async () => {
  els.importBtn.disabled = true;
  const oldText = els.importBtn.textContent;
  els.importBtn.textContent = tt('font.importing');
  try {
    const result = await api.importFont();
    if (!result?.ok) {
      if (!result?.canceled) showToast(result?.message || tt('font.importFailed'), true);
      return;
    }
    state.custom = {
      file: result.font?.customFile || '',
      name: result.font?.customName || result.name || tt('settings.fontMy')
    };
    state.selected = 'custom';
    renderList();
    updatePreview();
    showToast(tt('font.importedToast', { name: state.custom.name }));
  } catch (err) {
    showToast(err.message || tt('font.importFailed'), true);
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
  showToast(tt('font.resetToast'));
});

els.applyBtn.addEventListener('click', async () => {
  els.applyBtn.disabled = true;
  els.applyBtn.textContent = tt('font.applying');
  try {
    const result = await api.applyFont({
      family: state.selected,
      size: state.size,
      lineHeight: state.lineHeight,
      scope: state.scope
    });
    if (!result?.ok) {
      showToast(result?.message || tt('font.applyFailed'), true);
      return;
    }
    showToast(tt('font.appliedToast'));
    setTimeout(() => api.closeFontWindow(), 220);
  } catch (err) {
    showToast(err.message || tt('font.applyFailed'), true);
  } finally {
    els.applyBtn.disabled = false;
    els.applyBtn.textContent = tt('font.apply');
  }
});

els.cancelBtn.addEventListener('click', () => api.closeFontWindow());
els.closeBtn.addEventListener('click', () => api.closeFontWindow());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') api.closeFontWindow();
});

function updateLabels() {
  if (!els.importBtn.disabled) els.importBtn.textContent = tt('font.import');
  if (!els.applyBtn.disabled) els.applyBtn.textContent = tt('font.apply');
}
window.FloatAskI18nReady.then(() => { updateLabels(); return load(); });
document.addEventListener('floatask:language', () => { renderList(); updatePreview(); updateLabels(); });
