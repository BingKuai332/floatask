'use strict';

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { PRESETS } = require('../shared/presets');

const { normalizeLocale } = require('../shared/i18n');
const { normalizeHotkey } = require('../shared/hotkeys');
const { TASKS } = require('./model-config');

function defaultLanguage() {
  try {
    return normalizeLocale(app.getLocale());
  } catch {
    return 'zh-CN';
  }
}

const DEFAULTS = {
  schemaVersion: 1,
  language: defaultLanguage(),
  saveHistory: true,
  autoCheckUpdates: true,
  modelProfiles: {},
  provider: 'deepseek',
  baseUrl: PRESETS.deepseek.baseUrl,
  model: PRESETS.deepseek.model,
  temperature: 0.4,
  maxTokens: 1200,
  vision: false,
  webEnabled: true,
  fontFamily: 'system',
  fontSize: 12.8,
  lineHeight: 1.72,
  fontScope: 'all',
  customFontFile: '',
  customFontName: '',
  searchProvider: 'bing',
  searxngUrl: '',
  hotkey: 'Alt+Q',
  showBubble: true,
  bubblePosition: null,
  autoLaunch: false,
  onboarded: false
};

let configPath = null;
let config = null;

function getConfigPath() {
  if (!configPath) configPath = path.join(app.getPath('userData'), 'config.json');
  return configPath;
}

function encryptKey(key) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return 'safe:' + safeStorage.encryptString(key).toString('base64');
    }
  } catch (err) {
    console.warn('[store] safeStorage unavailable:', err.message);
  }
  return 'plain:' + Buffer.from(key, 'utf8').toString('base64');
}

function decryptKey(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    if (value.startsWith('safe:')) {
      return safeStorage.decryptString(Buffer.from(value.slice(5), 'base64'));
    }
    if (value.startsWith('plain:')) {
      return Buffer.from(value.slice(6), 'base64').toString('utf8');
    }
  } catch (err) {
    console.warn('[store] failed to decrypt API key:', err.message);
  }
  return '';
}

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitize(patch, current) {
  const next = { ...current };
  const stringFields = ['provider', 'baseUrl', 'model', 'searchProvider', 'searxngUrl', 'hotkey', 'fontFamily'];
  for (const field of stringFields) {
    if (typeof patch[field] === 'string') next[field] = patch[field].trim();
  }
  if (typeof patch.language === 'string') {
    next.language = normalizeLocale(patch.language);
  }
  if (!next.fontFamily || /[\u0000-\u001f]/.test(next.fontFamily)) next.fontFamily = 'system';
  next.fontFamily = next.fontFamily.slice(0, 120);
  if (typeof patch.fontSize !== 'undefined') {
    next.fontSize = Math.round(clampNumber(patch.fontSize, current.fontSize, 10, 24) * 10) / 10;
  }
  if (typeof patch.lineHeight !== 'undefined') {
    next.lineHeight = Math.round(clampNumber(patch.lineHeight, current.lineHeight, 1.2, 2.4) * 100) / 100;
  }
  if (patch.fontScope === 'all' || patch.fontScope === 'reading') next.fontScope = patch.fontScope;
  if (!['all', 'reading'].includes(next.fontScope)) next.fontScope = 'all';
  if (typeof patch.customFontFile === 'string') next.customFontFile = patch.customFontFile.trim().slice(0, 160);
  if (typeof patch.customFontName === 'string') next.customFontName = patch.customFontName.trim().slice(0, 120);
  if (next.customFontFile && !/^custom-[a-z0-9._-]+$/i.test(next.customFontFile)) next.customFontFile = '';
  if (!next.customFontFile) next.customFontName = '';
  if (typeof patch.temperature !== 'undefined') {
    next.temperature = clampNumber(patch.temperature, current.temperature, 0, 2);
  }
  if (typeof patch.maxTokens !== 'undefined') {
    next.maxTokens = Math.round(clampNumber(patch.maxTokens, current.maxTokens, 128, 8000));
  }
  for (const field of ['vision', 'webEnabled', 'showBubble', 'autoLaunch', 'onboarded', 'saveHistory', 'autoCheckUpdates']) {
    if (typeof patch[field] === 'boolean') next[field] = patch[field];
  }
  if (patch.bubblePosition === null) {
    next.bubblePosition = null;
  } else if (patch.bubblePosition && Number.isFinite(patch.bubblePosition.x) && Number.isFinite(patch.bubblePosition.y)) {
    next.bubblePosition = {
      x: Math.round(patch.bubblePosition.x),
      y: Math.round(patch.bubblePosition.y)
    };
  }
  if (!PRESETS[next.provider]) next.provider = 'custom';
  if (next.searchProvider === 'searxng' && next.searxngUrl) {
    // Keep user value; validated at request time.
  } else if (!['bing', 'searxng', 'off'].includes(next.searchProvider)) {
    next.searchProvider = 'bing';
  }
  if (next.searchProvider === 'searxng' && !/^https?:\/\//i.test(next.searxngUrl)) {
    next.searchProvider = 'bing';
  }
  next.hotkey = normalizeHotkey(next.hotkey) || 'Alt+Q';
  next.modelProfiles = {};
  for (const task of TASKS) {
    const prior = current.modelProfiles?.[task] || {};
    const p = patch.modelProfiles?.[task] || {};
    const profile = { ...prior };
    for (const key of ['enabled', 'customService', 'vision']) profile[key] = typeof p[key] === 'boolean' ? p[key] : Boolean(prior[key] ?? (key === 'vision'));
    for (const key of ['provider', 'baseUrl', 'model']) profile[key] = typeof p[key] === 'string' ? p[key].trim().slice(0, 2000) : prior[key] || '';
    profile.temperature = clampNumber(p.temperature ?? prior.temperature, 0.4, 0, 2);
    profile.maxTokens = Math.round(clampNumber(p.maxTokens ?? prior.maxTokens, 1200, 64, 32768));
    next.modelProfiles[task] = profile;
  }
  return next;
}

function load() {
  if (config) return config;
  let stored = {};
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    stored = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[store] could not read config:', err.message);
  }
  config = sanitize({ ...DEFAULTS, ...stored }, { ...DEFAULTS, apiKeyEnc: stored.apiKeyEnc || '' });
  config.apiKeyEnc = stored.apiKeyEnc || '';
  config.apiKey = decryptKey(config.apiKeyEnc);
  for (const task of TASKS) {
    const p = config.modelProfiles[task];
    p.apiKeyEnc = stored.modelProfiles?.[task]?.apiKeyEnc || '';
    p.apiKey = decryptKey(p.apiKeyEnc);
  }
  return config;
}

function persist() {
  const dir = path.dirname(getConfigPath());
  fs.mkdirSync(dir, { recursive: true });
  const data = { ...config };
  delete data.apiKey;
  data.modelProfiles = Object.fromEntries(TASKS.map(task => {
    const { apiKey, ...profile } = config.modelProfiles[task];
    return [task, profile];
  }));
  // Never write plaintext keys, ever.
  if (!data.apiKeyEnc) delete data.apiKeyEnc;
  const tmp = getConfigPath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, getConfigPath());
}

function getConfig() {
  return load();
}

function publicSettings() {
  const c = load();
  return {
    language: c.language,
    saveHistory: c.saveHistory,
    autoCheckUpdates: c.autoCheckUpdates,
    modelProfiles: Object.fromEntries(TASKS.map(task => {
      const { apiKey, apiKeyEnc, ...profile } = c.modelProfiles[task];
      return [task, { ...profile, hasApiKey: Boolean(apiKey) }];
    })),
    provider: c.provider,
    baseUrl: c.baseUrl,
    model: c.model,
    temperature: c.temperature,
    maxTokens: c.maxTokens,
    vision: c.vision,
    webEnabled: c.webEnabled,
    fontFamily: c.fontFamily,
    fontSize: c.fontSize,
    lineHeight: c.lineHeight,
    fontScope: c.fontScope,
    customFontName: c.customFontName,
    customFontFile: c.customFontFile,
    searchProvider: c.searchProvider,
    searxngUrl: c.searxngUrl,
    hotkey: c.hotkey,
    showBubble: c.showBubble,
    autoLaunch: c.autoLaunch,
    onboarded: c.onboarded,
    hasApiKey: Boolean(c.apiKey),
    presets: Object.values(PRESETS).map(({ id, label, baseUrl, model, vision, keyUrl, note }) => ({
      id, label, baseUrl, model, vision, keyUrl, note
    }))
  };
}

function save(patch) {
  const c = load();
  const next = sanitize(patch, c);

  if (patch.clearApiKey === true) {
    next.apiKey = '';
    next.apiKeyEnc = '';
  } else if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
    next.apiKey = patch.apiKey.trim();
    next.apiKeyEnc = encryptKey(next.apiKey);
  } else {
    next.apiKey = c.apiKey;
    next.apiKeyEnc = c.apiKeyEnc;
  }

  for (const task of TASKS) {
    const p = patch.modelProfiles?.[task];
    const target = next.modelProfiles[task];
    if (p?.clearApiKey === true) { target.apiKey = ''; target.apiKeyEnc = ''; }
    else if (typeof p?.apiKey === 'string' && p.apiKey.trim()) {
      target.apiKey = p.apiKey.trim(); target.apiKeyEnc = encryptKey(target.apiKey);
    }
  }
  config = next;
  try { persist(); } catch (error) { config = c; throw error; }
  return publicSettings();
}

function setBubblePosition(x, y) {
  save({ bubblePosition: { x: Math.round(x), y: Math.round(y) } });
}

function markOnboarded() {
  const c = load();
  if (!c.onboarded) {
    save({ onboarded: true });
  }
}

module.exports = {
  DEFAULTS,
  load,
  getConfig,
  publicSettings,
  save,
  setBubblePosition,
  markOnboarded,
  getConfigPath
};
