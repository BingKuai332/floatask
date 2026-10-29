'use strict';

const api = window.floatask;

const els = {
  closeBtn: document.getElementById('closeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveHint: document.getElementById('saveHint'),
  welcome: document.getElementById('welcome'),
  welcomeHotkey: document.getElementById('welcomeHotkey'),
  getKeyLink: document.getElementById('getKeyLink'),
  providerGrid: document.getElementById('providerGrid'),
  providerBadge: document.getElementById('providerBadge'),
  baseUrl: document.getElementById('baseUrl'),
  model: document.getElementById('model'),
  apiKey: document.getElementById('apiKey'),
  toggleKeyBtn: document.getElementById('toggleKeyBtn'),
  keyHelp: document.getElementById('keyHelp'),
  clearKeyBtn: document.getElementById('clearKeyBtn'),
  vision: document.getElementById('vision'),
  testBtn: document.getElementById('testBtn'),
  testResult: document.getElementById('testResult'),
  webEnabled: document.getElementById('webEnabled'),
  searchProvider: document.getElementById('searchProvider'),
  searxngField: document.getElementById('searxngField'),
  searxngUrl: document.getElementById('searxngUrl'),
  hotkey: document.getElementById('hotkey'),
  hotkeyHelp: document.getElementById('hotkeyHelp'),
  language: document.getElementById('language'),
  showBubble: document.getElementById('showBubble'),
  autoLaunch: document.getElementById('autoLaunch'),
  autoLaunchHelp: document.getElementById('autoLaunchHelp'),
  saveHistory: document.getElementById('saveHistory'),
  openHistoryBtn: document.getElementById('openHistoryBtn'),
  currentFontLabel: document.getElementById('currentFontLabel'),
  currentFontMeta: document.getElementById('currentFontMeta'),
  openFontBtn: document.getElementById('openFontBtn'),
  version: document.getElementById('version'),
  toast: document.getElementById('toast')
};

const MARKS = {
  deepseek: 'DS',
  openai: 'AI',
  openrouter: 'OR',
  gemini: 'G',
  ollama: 'OL',
  custom: '··'
};

let settings = null;
let currentProvider = 'deepseek';
let savedHasKey = false;
let pendingClearKey = false;
let toastTimer = null;

function findPreset(id) {
  return (settings?.presets || []).find((item) => item.id === id) || null;
}

const tt = (key, params) => window.FloatAskI18n.t(key, params);

function isLocalUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(String(url || ''));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return tt('settings.customHost'); }
}

function showToast(message, bad = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show${bad ? ' bad' : ''}`;
  toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2600);
}

function setHint(text, kind = '') {
  els.saveHint.textContent = text || '';
  els.saveHint.className = `save-hint${kind ? ' ' + kind : ''}`;
}

function updateKeyUi() {
  els.clearKeyBtn.hidden = !savedHasKey && !pendingClearKey;
  if (pendingClearKey) {
    els.apiKey.value = '';
    els.apiKey.placeholder = tt('settings.keyPlaceholderClearing');
    els.keyHelp.textContent = tt('settings.keyHelpClearing');
    els.clearKeyBtn.textContent = tt('settings.undoClear');
  } else if (savedHasKey) {
    els.apiKey.value = '';
    els.apiKey.placeholder = tt('settings.keyPlaceholderSaved');
    els.keyHelp.textContent = tt('settings.keyHelpSaved');
    els.clearKeyBtn.textContent = tt('settings.clearKey');
  } else {
    els.apiKey.placeholder = 'sk-…';
    els.keyHelp.textContent = tt('settings.keyHelpDefault');
    els.clearKeyBtn.textContent = tt('settings.clearKey');
  }
}

function providerLabel(preset) {
  return preset?.id === 'custom' ? tt('settings.customHost') : preset?.id === 'ollama' ? 'Ollama' : preset?.label || tt('settings.customHost');
}
function updateProviderUi(applyPreset = false) {
  const preset = findPreset(currentProvider) || findPreset('custom');
  els.providerBadge.textContent = providerLabel(preset);
  for (const card of els.providerGrid.querySelectorAll('.provider-card')) {
    card.classList.toggle('active', card.dataset.id === currentProvider);
  }
  if (applyPreset && preset) {
    if (preset.id !== 'custom') {
      els.baseUrl.value = preset.baseUrl;
      els.model.value = preset.model;
      els.vision.checked = Boolean(preset.vision);
    }
  }
  {
    const keyUrl = preset?.keyUrl || 'https://platform.deepseek.com/api_keys';
    els.getKeyLink.textContent = tt('settings.getKey', { name: providerLabel(preset) });
    els.getKeyLink.dataset.url = keyUrl;
  }
  els.searchProvider.dispatchEvent(new Event('change'));
}

function renderProviders() {
  els.providerGrid.innerHTML = '';
  for (const preset of settings.presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'provider-card';
    button.dataset.id = preset.id;
    button.innerHTML = `
      <span class="provider-name">
        <span class="provider-mark">${MARKS[preset.id] || '·'}</span>
        ${preset.id === 'custom' ? tt('settings.customHost') : preset.id === 'ollama' ? 'Ollama' : preset.label}
      </span>
      <span class="provider-sub">${hostOf(preset.baseUrl)}</span>
      ${preset.vision ? `<span class="provider-vision">${tt('settings.providerVision')}</span>` : ''}`;
    button.addEventListener('click', () => {
      currentProvider = preset.id;
      updateProviderUi(true);
      els.testResult.textContent = '';
      els.testResult.className = 'test-result';
      setHint('');
    });
    els.providerGrid.appendChild(button);
  }
}

function updateHotkeyHelp() {
  if (!settings.hotkeyOk) {
    els.hotkeyHelp.textContent = tt('settings.hotkeyHelpTaken');
    els.hotkeyHelp.classList.add('warn');
  } else if (settings.actualHotkey && settings.actualHotkey !== els.hotkey.value) {
    els.hotkeyHelp.textContent = tt('settings.hotkeyHelpAdjusted', { hotkey: settings.actualHotkey });
    els.hotkeyHelp.classList.add('warn');
  } else {
    els.hotkeyHelp.textContent = tt('settings.hotkeyHelpDefault');
    els.hotkeyHelp.classList.remove('warn');
  }
}

function applyUiFont(font) {
  window.FloatAskFont.apply(font, { ui: true });
}

function updateFontDisplay(font) {
  const family = !font?.family || font.family === 'system'
    ? tt('settings.fontSystem')
    : font.family === 'custom'
      ? `${font.customName || tt('settings.fontMy')}${tt('settings.fontImportedSuffix')}`
      : font.family;
  const size = Number(font?.size) || 12.8;
  const line = Number(font?.lineHeight) || 1.72;
  const scope = font?.scope === 'reading' ? tt('settings.fontScopeReading') : tt('settings.fontScopeAll');
  els.currentFontLabel.textContent = family;
  els.currentFontMeta.textContent = tt('settings.fontMeta', { size, line: line.toFixed(2), scope });
  applyUiFont(font);
}

function populate() {
  currentProvider = settings.provider || 'deepseek';
  savedHasKey = Boolean(settings.hasApiKey);
  els.baseUrl.value = settings.baseUrl || '';
  els.model.value = settings.model || '';
  els.vision.checked = Boolean(settings.vision);
  els.webEnabled.checked = settings.webEnabled !== false;
  els.searchProvider.value = settings.searchProvider || 'bing';
  els.searxngUrl.value = settings.searxngUrl || '';
  els.hotkey.value = settings.hotkey || 'Alt+Q';
  els.showBubble.checked = settings.showBubble !== false;
  els.saveHistory.checked = settings.saveHistory !== false;
  els.language.value = settings.language || 'zh-CN';
  els.autoLaunch.checked = Boolean(settings.autoLaunch);
  els.version.textContent = settings.appVersion || '0.1.0';
  els.welcomeHotkey.textContent = settings.actualHotkey || settings.hotkey || 'Alt+Q';
  els.welcome.hidden = !settings.firstRun;
  els.saveBtn.textContent = settings.firstRun ? tt('settings.saveBtnStart') : tt('settings.saveBtn');
  els.autoLaunch.disabled = !settings.isPackaged;
  els.autoLaunchHelp.textContent = settings.isPackaged
    ? tt('settings.autoLaunchHelpOn')
    : tt('settings.autoLaunchHelpOff');
  updateFontDisplay({
    family: settings.fontFamily,
    size: settings.fontSize,
    lineHeight: settings.lineHeight,
    scope: settings.fontScope,
    customFile: settings.customFontFile,
    customName: settings.customFontName
  });

  window.FloatAskAdvanced.populate(settings, collectDraft);
  renderProviders();
  updateProviderUi(false);
  updateKeyUi();
  updateHotkeyHelp();
  els.searchProvider.dispatchEvent(new Event('change'));

  if (settings.hotkeyOk === false) {
    els.providerBadge.classList.add('warn');
  }

  const resetScroll = () => {
    const body = document.querySelector('.scroll-body');
    if (body) body.scrollTop = 0;
  };
  requestAnimationFrame(resetScroll);
  setTimeout(resetScroll, 220);
  setTimeout(resetScroll, 700);
}

function collectDraft() {
  return {
    ...window.FloatAskAdvanced.collect(),
    provider: currentProvider,
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    apiKey: els.apiKey.value.trim(),
    vision: els.vision.checked,
    webEnabled: els.webEnabled.checked,
    searchProvider: els.searchProvider.value,
    searxngUrl: els.searxngUrl.value.trim(),
    hotkey: els.hotkey.value,
    showBubble: els.showBubble.checked,
    autoLaunch: els.autoLaunch.checked,
    language: els.language.value,
    saveHistory: els.saveHistory.checked,
    clearApiKey: pendingClearKey
  };
}

function validate(draft) {
  const advancedError = window.FloatAskAdvanced.validate(draft);
  if (advancedError) return advancedError;
  if (!/^https?:\/\//i.test(draft.baseUrl)) {
    return { message: tt('settings.validateBaseUrl'), focus: els.baseUrl };
  }
  if (!draft.model) {
    return { message: tt('settings.validateModel'), focus: els.model };
  }
  const willHaveKey = Boolean(draft.apiKey) || (savedHasKey && !pendingClearKey);
  if (!willHaveKey && !isLocalUrl(draft.baseUrl)) {
    return { message: tt('settings.validateKey'), focus: els.apiKey };
  }
  if (draft.searchProvider === 'searxng' && !/^https?:\/\//i.test(draft.searxngUrl)) {
    return { message: tt('settings.validateSearxng'), focus: els.searxngUrl };
  }
  return null;
}

els.searchProvider.addEventListener('change', () => {
  els.searxngField.hidden = els.searchProvider.value !== 'searxng';
});

els.toggleKeyBtn.addEventListener('click', () => {
  const hidden = els.apiKey.type === 'password';
  els.apiKey.type = hidden ? 'text' : 'password';
  els.toggleKeyBtn.textContent = hidden ? tt('settings.hide') : tt('settings.show');
});

els.clearKeyBtn.addEventListener('click', () => {
  if (!savedHasKey && !pendingClearKey) {
    showToast(tt('settings.noKeyYet'), true);
    return;
  }
  pendingClearKey = !pendingClearKey;
  updateKeyUi();
  setHint(pendingClearKey ? tt('settings.clearHint') : '');
});

els.testBtn.addEventListener('click', async () => {
  const draft = collectDraft();
  const willHaveKey = Boolean(draft.apiKey) || (savedHasKey && !pendingClearKey);
  if (!willHaveKey && !isLocalUrl(draft.baseUrl)) {
    els.testResult.textContent = tt('settings.testNeedKey');
    els.testResult.className = 'test-result bad';
    return;
  }
  els.testBtn.disabled = true;
  els.testResult.textContent = tt('settings.testConnecting');
  els.testResult.className = 'test-result busy';
  try {
    const result = await api.testConnection(draft);
    if (result.ok) {
      els.testResult.textContent = tt('settings.testOk', { ms: result.latencyMs, model: result.model ? ' · ' + result.model : '' });
      els.testResult.className = 'test-result ok';
    } else {
      els.testResult.textContent = [result.message, result.hint].filter(Boolean).join(' · ');
      els.testResult.className = 'test-result bad';
    }
  } catch (err) {
    els.testResult.textContent = err.message || tt('settings.saveFailed');
    els.testResult.className = 'test-result bad';
  } finally {
    els.testBtn.disabled = false;
  }
});

els.getKeyLink.addEventListener('click', (event) => {
  event.preventDefault();
  const url = els.getKeyLink.dataset.url || findPreset(currentProvider)?.keyUrl || 'https://platform.deepseek.com/api_keys';
  api.openExternal(url);
});

els.saveBtn.addEventListener('click', async () => {
  const draft = collectDraft();
  const error = validate(draft);
  if (error) {
    setHint(error.message, 'bad');
    error.focus?.focus();
    return;
  }
  els.saveBtn.disabled = true;
  setHint(tt('settings.saving'));
  try {
    const result = await api.saveSettings(draft);
    if (!result?.ok) {
      setHint(result?.message || tt('settings.saveFailed'), 'bad');
      return;
    }
    savedHasKey = Boolean(result.settings?.hasApiKey);
    pendingClearKey = false;
    settings.hotkeyOk = result.settings?.hotkeyOk;
    settings.actualHotkey = result.settings?.actualHotkey;
    setHint(tt('settings.saved'), 'ok');
    showToast(tt('settings.savedToast'));
    setTimeout(() => api.closeSettings(), 420);
  } catch (err) {
    setHint(err.message || tt('settings.saveFailed'), 'bad');
  } finally {
    els.saveBtn.disabled = false;
  }
});

els.openFontBtn.addEventListener('click', () => api.openFontWindow());
els.openHistoryBtn.addEventListener('click', () => api.openHistory());
els.cancelBtn.addEventListener('click', () => api.closeSettings());
els.closeBtn.addEventListener('click', () => api.closeSettings());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !window.FloatAskAdvanced.recording) api.closeSettings();
});

api.onFontUpdated((font) => updateFontDisplay(font));

(async () => {
  await window.FloatAskI18nReady;
  settings = await api.getSettings();
  populate();
})().catch((err) => {
  setHint(tt('settings.readFailed', { err: err.message }), 'bad');
});

els.language.addEventListener('change', async () => {
  const previous = settings.language;
  const result = await api.setLanguage(els.language.value);
  if (!result.ok) { els.language.value = previous; showToast(result.message, true); return; }
  settings.language = els.language.value;
  window.FloatAskI18n.setLanguage(settings.language);
  const keyDraft = els.apiKey.value;
  renderProviders(); updateProviderUi(false); updateKeyUi(); updateHotkeyHelp();
  els.apiKey.value = keyDraft;
  els.toggleKeyBtn.textContent = tt(els.apiKey.type === 'password' ? 'settings.show' : 'settings.hide');
  const font = await api.getFont(); updateFontDisplay(font);
  els.saveBtn.textContent = tt(settings.firstRun ? 'settings.saveBtnStart' : 'settings.saveBtn');
  els.autoLaunchHelp.textContent = tt(settings.isPackaged ? 'settings.autoLaunchHelpOn' : 'settings.autoLaunchHelpOff');
});
