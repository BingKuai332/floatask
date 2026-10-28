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
  showBubble: document.getElementById('showBubble'),
  autoLaunch: document.getElementById('autoLaunch'),
  autoLaunchHelp: document.getElementById('autoLaunchHelp'),
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

function isLocalUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(String(url || ''));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return '自定义接口'; }
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
    els.apiKey.placeholder = '保存后将清除';
    els.keyHelp.textContent = '保存后会删除本机保存的 Key。';
    els.clearKeyBtn.textContent = '撤销清除';
  } else if (savedHasKey) {
    els.apiKey.value = '';
    els.apiKey.placeholder = '已保存（留空表示不修改）';
    els.keyHelp.textContent = '已保存在本机，使用 Windows 系统加密。';
    els.clearKeyBtn.textContent = '清除已保存的 Key';
  } else {
    els.apiKey.placeholder = 'sk-…';
    els.keyHelp.textContent = '只保存在本机，使用 Windows 系统加密。';
    els.clearKeyBtn.textContent = '清除已保存的 Key';
  }
}

function updateProviderUi(applyPreset = false) {
  const preset = findPreset(currentProvider) || findPreset('custom');
  els.providerBadge.textContent = preset?.label || '自定义';
  for (const card of els.providerGrid.querySelectorAll('.provider-card')) {
    card.classList.toggle('active', card.dataset.id === currentProvider);
  }
  if (applyPreset && preset) {
    if (preset.id !== 'custom') {
      els.baseUrl.value = preset.baseUrl;
      els.model.value = preset.model;
      els.vision.checked = Boolean(preset.vision);
    }
    const keyUrl = preset.keyUrl || 'https://platform.deepseek.com/api_keys';
    els.getKeyLink.textContent = `获取 ${preset.label} Key ↗`;
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
        ${preset.label}
      </span>
      <span class="provider-sub">${hostOf(preset.baseUrl)}</span>
      ${preset.vision ? '<span class="provider-vision">视觉</span>' : ''}`;
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
    els.hotkeyHelp.textContent = '当前快捷键没有注册成功，可能被占用；可以换一个试试。';
    els.hotkeyHelp.classList.add('warn');
  } else if (settings.actualHotkey && settings.actualHotkey !== els.hotkey.value) {
    els.hotkeyHelp.textContent = `当前实际使用 ${settings.actualHotkey}（首选组合被占用）。`;
    els.hotkeyHelp.classList.add('warn');
  } else {
    els.hotkeyHelp.textContent = '如果被其他软件占用，会自动换一个可用组合。';
    els.hotkeyHelp.classList.remove('warn');
  }
}

function applyUiFont(font) {
  window.FloatAskFont.apply(font, { ui: true });
}

function updateFontDisplay(font) {
  const family = !font?.family || font.family === 'system'
    ? '系统默认'
    : font.family === 'custom'
      ? `${font.customName || '我的字体'}（导入）`
      : font.family;
  const size = Number(font?.size) || 12.8;
  const line = Number(font?.lineHeight) || 1.72;
  const scope = font?.scope === 'reading' ? '仅解释内容' : '整个界面';
  els.currentFontLabel.textContent = family;
  els.currentFontMeta.textContent = `${size}px · 行高 ${line.toFixed(2)} · ${scope}`;
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
  els.autoLaunch.checked = Boolean(settings.autoLaunch);
  els.version.textContent = settings.appVersion || '0.1.0';
  els.welcomeHotkey.textContent = settings.actualHotkey || settings.hotkey || 'Alt+Q';
  els.welcome.hidden = !settings.firstRun;
  els.saveBtn.textContent = settings.firstRun ? '保存并开始使用' : '保存';
  els.autoLaunch.disabled = !settings.isPackaged;
  els.autoLaunchHelp.textContent = settings.isPackaged
    ? '登录 Windows 后自动在托盘运行。'
    : '开发模式下不可用，打包后会生效。';
  updateFontDisplay({
    family: settings.fontFamily,
    size: settings.fontSize,
    lineHeight: settings.lineHeight,
    scope: settings.fontScope,
    customFile: settings.customFontFile,
    customName: settings.customFontName
  });

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
    clearApiKey: pendingClearKey
  };
}

function validate(draft) {
  if (!/^https?:\/\//i.test(draft.baseUrl)) {
    return { message: 'Base URL 需要以 http:// 或 https:// 开头', focus: els.baseUrl };
  }
  if (!draft.model) {
    return { message: '请填写模型名称', focus: els.model };
  }
  const willHaveKey = Boolean(draft.apiKey) || (savedHasKey && !pendingClearKey);
  if (!willHaveKey && !isLocalUrl(draft.baseUrl)) {
    return { message: '请填写 API Key（本地 Ollama 可以留空）', focus: els.apiKey };
  }
  if (draft.searchProvider === 'searxng' && !/^https?:\/\//i.test(draft.searxngUrl)) {
    return { message: '请填写 SearXNG 实例地址', focus: els.searxngUrl };
  }
  return null;
}

els.searchProvider.addEventListener('change', () => {
  els.searxngField.hidden = els.searchProvider.value !== 'searxng';
});

els.toggleKeyBtn.addEventListener('click', () => {
  const hidden = els.apiKey.type === 'password';
  els.apiKey.type = hidden ? 'text' : 'password';
  els.toggleKeyBtn.textContent = hidden ? '隐藏' : '显示';
});

els.clearKeyBtn.addEventListener('click', () => {
  if (!savedHasKey && !pendingClearKey) {
    showToast('还没有保存的 Key', true);
    return;
  }
  pendingClearKey = !pendingClearKey;
  updateKeyUi();
  setHint(pendingClearKey ? '保存后将清除本机 Key。' : '');
});

els.testBtn.addEventListener('click', async () => {
  const draft = collectDraft();
  const willHaveKey = Boolean(draft.apiKey) || (savedHasKey && !pendingClearKey);
  if (!willHaveKey && !isLocalUrl(draft.baseUrl)) {
    els.testResult.textContent = '请先填写 API Key';
    els.testResult.className = 'test-result bad';
    return;
  }
  els.testBtn.disabled = true;
  els.testResult.textContent = '正在连接…';
  els.testResult.className = 'test-result busy';
  try {
    const result = await api.testConnection(draft);
    if (result.ok) {
      els.testResult.textContent = `连接成功 · ${result.latencyMs}ms${result.model ? ' · ' + result.model : ''}`;
      els.testResult.className = 'test-result ok';
    } else {
      els.testResult.textContent = [result.message, result.hint].filter(Boolean).join(' · ');
      els.testResult.className = 'test-result bad';
    }
  } catch (err) {
    els.testResult.textContent = err.message || '测试失败';
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
  setHint('正在保存…');
  try {
    const result = await api.saveSettings(draft);
    if (!result?.ok) {
      setHint(result?.message || '保存失败', 'bad');
      return;
    }
    savedHasKey = Boolean(result.settings?.hasApiKey);
    pendingClearKey = false;
    settings.hotkeyOk = result.settings?.hotkeyOk;
    settings.actualHotkey = result.settings?.actualHotkey;
    setHint('已保存，正在应用…', 'ok');
    showToast('设置已保存');
    setTimeout(() => api.closeSettings(), 420);
  } catch (err) {
    setHint(err.message || '保存失败', 'bad');
  } finally {
    els.saveBtn.disabled = false;
  }
});

els.openFontBtn.addEventListener('click', () => api.openFontWindow());
els.cancelBtn.addEventListener('click', () => api.closeSettings());
els.closeBtn.addEventListener('click', () => api.closeSettings());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') api.closeSettings();
});

api.onFontUpdated((font) => updateFontDisplay(font));

(async () => {
  settings = await api.getSettings();
  populate();
})().catch((err) => {
  setHint(`读取设置失败：${err.message}`, 'bad');
});
