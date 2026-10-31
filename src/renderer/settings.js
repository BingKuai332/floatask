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
  historyRetention: document.getElementById('historyRetention'),
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
// Set by the first-run wizard while it is live: closing the settings window
// (titlebar X or Escape) must flush a partially typed draft first, because
// the window is only hidden and hidden renderers throttle timers.
let wizardFlush = null;

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
  if (els.historyRetention) {
    const retention = String(settings.historyRetentionDays ?? 90);
    els.historyRetention.value = [...els.historyRetention.options].some(o => o.value === retention) ? retention : '90';
  }
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

  populateAppearance();
  selectPanel('model');
  initWizard(settings);
  initAbout(settings);

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
    historyRetentionDays: els.historyRetention ? Number(els.historyRetention.value) : undefined,
    theme: appearance.theme,
    fontSize: appearance.fontSize,
    lineHeight: appearance.lineHeight,
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
  if (!willHaveKey && !draft.clearApiKey && !isLocalUrl(draft.baseUrl)) {
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
els.cancelBtn.addEventListener('click', () => {
  appearance.theme = savedAppearance.theme;
  applyAppearancePreview();
  api.closeSettings();
});
els.closeBtn.addEventListener('click', () => {
  if (wizardFlush) void wizardFlush();
  api.closeSettings();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !window.FloatAskAdvanced.recording) {
    if (wizardFlush) void wizardFlush();
    api.closeSettings();
  }
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

/* ------------------------------------------------------------------ */
/* Six-section navigation & appearance preview (task 8)               */
/* ------------------------------------------------------------------ */

const navItems = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll('.settings-nav-item')] : [];
const panelSections = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll('[data-panel-section]')] : [];
let currentPanel = 'model';

function selectPanel(name) {
  currentPanel = name;
  for (const item of navItems) {
    const active = item.dataset.panel === name;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  for (const section of panelSections) section.hidden = section.dataset.panelSection !== name;
  const body = document.querySelector('.scroll-body');
  if (body) body.scrollTop = 0;
}
for (const item of navItems) item.addEventListener('click', () => selectPanel(item.dataset.panel));

/* Theme / answer size / density: live preview now, persisted on save.
   The underlying model stays compatible: untouched values pass through. */
const DENSITY_LINE_HEIGHT = { compact: 1.5, standard: 1.72, relaxed: 2.0 };
const SIZE_CHOICES = [12, 14, 16];
const appearance = { theme: 'system', fontSize: 14, lineHeight: 1.72 };
let savedAppearance = { ...appearance };

function nearestChoice(values, actual) {
  return values.reduce((best, v) => Math.abs(v - actual) < Math.abs(best - actual) ? v : best, values[0]);
}

function setSegmented(containerId, dataAttr, value) {
  if (typeof document.querySelectorAll !== 'function') return;
  for (const btn of document.querySelectorAll(`#${containerId} .segmented-option`)) {
    btn.classList.toggle('active', btn.dataset[dataAttr] === String(value));
  }
}

function resolvePreviewTheme(value) {
  if (value === 'light' || value === 'dark') return value;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch { return 'dark'; }
}

function applyAppearancePreview() {
  document.documentElement.dataset.theme = resolvePreviewTheme(appearance.theme);
  if (typeof document.getElementById !== 'function') return;
  const preview = document.getElementById('readingPreview');
  if (preview) {
    const line = appearance.lineHeight;
    preview.dataset.density = line < 1.6 ? 'compact' : (line > 1.95 ? 'relaxed' : 'standard');
    preview.style.setProperty('--preview-size', `${appearance.fontSize}px`);
  }
}

function populateAppearance() {
  appearance.theme = settings.theme || 'system';
  appearance.fontSize = Number(settings.fontSize) || 14;
  appearance.lineHeight = Number(settings.lineHeight) || 1.72;
  savedAppearance = { ...appearance };
  setSegmented('themeControl', 'themeValue', appearance.theme);
  setSegmented('sizeControl', 'sizeValue', nearestChoice(SIZE_CHOICES, appearance.fontSize));
  const line = appearance.lineHeight;
  setSegmented('densityControl', 'densityValue', line < 1.6 ? 'compact' : (line > 1.95 ? 'relaxed' : 'standard'));
  applyAppearancePreview();
}

function bindSegmented(id, attr, apply) {
  const root = typeof document.getElementById === 'function' ? document.getElementById(id) : null;
  if (!root || typeof root.addEventListener !== 'function') return;
  root.addEventListener('click', (event) => {
    const btn = event.target.closest(`[data-${attr}]`);
    if (!btn) return;
    apply(btn);
  });
}

bindSegmented('themeControl', 'theme-value', (btn) => {
  appearance.theme = btn.dataset.themeValue;
  setSegmented('themeControl', 'themeValue', appearance.theme);
  applyAppearancePreview();
});
bindSegmented('sizeControl', 'size-value', (btn) => {
  appearance.fontSize = Number(btn.dataset.sizeValue);
  setSegmented('sizeControl', 'sizeValue', appearance.fontSize);
  applyAppearancePreview();
});
bindSegmented('densityControl', 'density-value', (btn) => {
  appearance.lineHeight = DENSITY_LINE_HEIGHT[btn.dataset.densityValue] || 1.72;
  setSegmented('densityControl', 'densityValue', btn.dataset.densityValue);
  applyAppearancePreview();
});

/* ------------------------------------------------------------------ */
/* First-run onboarding wizard (task 9)                               */
/* ------------------------------------------------------------------ */

function initWizard(current) {
  const root = document.getElementById('onboarding');
  if (!root || typeof root.addEventListener !== 'function') return;

  const steps = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll('#obSteps .ob-step')] : [];
  const panes = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll('[data-ob-pane]')] : [];
  const providerBtns = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll('[data-ob-provider]')] : [];
  const keyInput = document.getElementById('obKey');
  const error = document.getElementById('obError');
  const testBtn = document.getElementById('obTest');
  const testResult = document.getElementById('obTestResult');
  const hotkeyLabel = document.getElementById('obHotkey');
  const backBtn = document.getElementById('obBack');
  const laterBtn = document.getElementById('obLater');
  const nextBtn = document.getElementById('obNext');
  const startBtn = document.getElementById('obStart');
  const fullSettingsBtn = document.getElementById('obFullSettings');
  const recordBtn = document.getElementById('obRecord');
  const hiddenHotkey = document.getElementById('hotkey');

  let step = 1;
  let provider = ['deepseek', 'openai', 'ollama'].includes(current.provider) ? current.provider : 'deepseek';
  let providerDirty = false;
  let dismissed = false;
  // A key already persisted (autosaved or saved earlier) satisfies step-1
  // validation and is never echoed back into the DOM for security.
  let savedKey = Boolean(current.hasApiKey);

  const preset = (id) => (current.presets || []).find(p => p.id === id) || {};
  const isLocal = () => /^(https?:\/\/)?(127\.0\.0\.1|localhost)/i.test(preset(provider).baseUrl || '');

  function draft(extra = {}, conservative = false) {
    // Never clobber an existing configuration with preset defaults the user
    // never touched: carry provider/baseUrl/model only after an explicit
    // pick. Autosave passes conservative=true so that typing a key can never
    // silently retarget an existing custom endpoint — only an explicit
    // provider click (providerDirty) carries the trio then.
    const p = preset(provider);
    const key = keyInput && keyInput.value.trim() || '';
    const touched = providerDirty || Boolean(key);
    const carryProvider = touched && (!conservative || providerDirty);
    return {
      ...(carryProvider ? { provider, baseUrl: p.baseUrl || '', model: p.model || '' } : {}),
      ...(key ? { apiKey: key } : {}),
      ...(hiddenHotkey ? { hotkey: hiddenHotkey.value } : {}),
      onboardingStep: step,
      keepOnboarding: true,
      ...extra
    };
  }

  function show(next) {
    step = next;
    root.dataset.step = String(next);
    for (const s of steps) {
      const n = Number(s.dataset.obStep);
      s.classList.toggle('active', n === next);
      s.classList.toggle('done', n < next);
    }
    for (const pane of panes) pane.hidden = Number(pane.dataset.obPane) !== next;
    if (backBtn) backBtn.hidden = next === 1;
    if (nextBtn) nextBtn.hidden = next === 3;
    if (error) error.textContent = '';
  }

  function syncProviderUi() {
    for (const btn of providerBtns) btn.classList.toggle('active', btn.dataset.obProvider === provider);
  }

  async function saveDraft(extra) {
    // An explicit wizard action supersedes any pending debounced autosave,
    // so its snapshot can never land after this one and roll state back.
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    autosaveDirty = false;
    const result = await api.saveSettings(draft(extra));
    if (!result.ok) {
      if (error) error.textContent = result.message || '';
      return null;
    }
    return result;
  }

  // Spec: back/close/later must never lose filled content. Debounced
  // autosave persists every edit while typing; the 'change' flush covers
  // blur-to-close within the debounce window, and 'pagehide' is the
  // best-effort net for window destruction. Saves are quiet: validation
  // errors still surface only through the explicit wizard actions.
  let autosaveTimer = null;
  let autosaveDirty = false;
  function markAutosaveDirty() {
    autosaveDirty = true;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { void flushAutosave(); }, 500);
  }
  async function flushAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (!autosaveDirty) return;
    autosaveDirty = false;
    const result = await api.saveSettings(draft({ onboardingStep: step }, true));
    if (!result || !result.ok) autosaveDirty = true;
    else if (keyInput && keyInput.value.trim()) savedKey = true;
  }
  wizardFlush = () => flushAutosave();
  if (keyInput) {
    keyInput.addEventListener('input', markAutosaveDirty);
    keyInput.addEventListener('change', () => { void flushAutosave(); });
  }
  if (hiddenHotkey) hiddenHotkey.addEventListener('input', markAutosaveDirty);
  // The settings window is only hidden on close, so pagehide never fires for
  // the titlebar-X path; flush while the close events and the visibility
  // change are still being dispatched instead of relying on throttled timers.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAutosave();
  });
  window.addEventListener('pagehide', () => {
    if (autosaveDirty) api.saveSettings(draft({ onboardingStep: step }, true)).catch(() => {});
  });

  for (const btn of providerBtns) {
    btn.addEventListener('click', () => {
      provider = btn.dataset.obProvider;
      providerDirty = true;
      syncProviderUi();
      markAutosaveDirty();
      void flushAutosave();
    });
  }

  if (nextBtn) nextBtn.addEventListener('click', async () => {
    if (step === 1) {
      if (!isLocal() && !(keyInput && keyInput.value.trim()) && !savedKey) {
        if (error) error.textContent = tt('settings.validateKey');
        return;
      }
      if (!await saveDraft({ onboardingStep: 2 })) return;
      if (keyInput && keyInput.value.trim()) savedKey = true;
      show(2);
    } else if (step === 2) {
      if (!await saveDraft({ onboardingStep: 3 })) return;
      show(3);
    }
  });

  if (backBtn) backBtn.addEventListener('click', async () => {
    if (step === 2) { await saveDraft({ onboardingStep: 1 }); show(1); }
    else if (step === 3) show(2);
  });

  if (laterBtn) laterBtn.addEventListener('click', async () => {
    dismissed = true;
    await saveDraft({ onboardingStep: step });
    root.hidden = true;
  });

  if (startBtn) startBtn.addEventListener('click', async () => {
    dismissed = true;
    const result = await api.saveSettings(draft({ onboardingStep: 3, keepOnboarding: false }));
    if (!result.ok) { if (error) error.textContent = result.message || ''; return; }
    root.hidden = true;
    api.startSelection();
  });

  if (fullSettingsBtn) fullSettingsBtn.addEventListener('click', () => {
    dismissed = true;
    root.hidden = true;
    els.welcome.hidden = false;
  });

  if (testBtn) testBtn.addEventListener('click', async () => {
    if (testResult) testResult.textContent = '…';
    const result = await api.testConnection(draft());
    if (testResult) {
      testResult.textContent = result.ok ? tt('settings.testOk', { ms: Math.round(result.ms || 0) }) : (result.message || '');
      testResult.className = `test-result${result.ok ? ' ok' : ' bad'}`;
    }
  });

  if (recordBtn && hiddenHotkey) {
    recordBtn.addEventListener('click', () => {
      const recorder = document.getElementById('recordHotkeyBtn');
      if (recorder) recorder.click();
    });
    hiddenHotkey.addEventListener('input', () => { if (hotkeyLabel) hotkeyLabel.textContent = hiddenHotkey.value; });
  }

  syncProviderUi();
  if (keyInput && savedKey && !keyInput.value) {
    // i18n-client re-applies data-i18n-ph asynchronously and on every
    // language change, so take the placeholder away from it for good.
    keyInput.dataset.keySaved = '1';
    keyInput.removeAttribute('data-i18n-ph');
    keyInput.placeholder = tt('ob.keyPlaceholderSaved');
  }
  document.addEventListener('floatask:language', () => {
    if (keyInput && keyInput.dataset.keySaved === '1' && !keyInput.value) keyInput.placeholder = tt('ob.keyPlaceholderSaved');
  });
  if (hotkeyLabel) hotkeyLabel.textContent = current.actualHotkey || current.hotkey || 'Alt+Q';
  if (current.firstRun) {
    show(Number(current.onboardingStep) >= 1 && Number(current.onboardingStep) <= 3 ? Number(current.onboardingStep) : 1);
    root.hidden = false;
    if (els.welcome) els.welcome.hidden = true;
  } else {
    root.hidden = true;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && current.firstRun && !dismissed && root.hidden) {
      show(step);
      root.hidden = false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* About links & diagnostics (task 10)                                */
/* ------------------------------------------------------------------ */

function initAbout(current) {
  const aboutVersion = document.getElementById('aboutVersion');
  if (aboutVersion) aboutVersion.textContent = current.appVersion || '0.1.0';

  if (typeof document.querySelectorAll === 'function') {
    for (const btn of document.querySelectorAll('[data-external]')) {
      btn.addEventListener('click', () => api.openExternal(btn.dataset.external));
    }
  }

  const previewBtn = document.getElementById('diagPreviewBtn');
  const preview = document.getElementById('diagPreview');
  const copyBtn = document.getElementById('diagCopyBtn');
  if (previewBtn && preview && typeof api.getDiagnostics === 'function') {
    previewBtn.addEventListener('click', async () => {
      const text = await api.getDiagnostics();
      preview.textContent = text;
      preview.hidden = false;
      if (copyBtn) copyBtn.hidden = false;
    });
  }
  if (copyBtn && preview) {
    copyBtn.addEventListener('click', async () => {
      if (preview.textContent.trim()) await api.copyText(preview.textContent);
    });
  }
}
