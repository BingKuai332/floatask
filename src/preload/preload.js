'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('floatask', {
  // Selection overlay
  finishSelection: (rect) => ipcRenderer.send('selection:finish', rect),
  cancelSelection: () => ipcRenderer.send('selection:cancel'),
  onSelectionInit: (cb) => subscribe('selection:init', cb),

  // Launcher bubble
  startSelection: () => ipcRenderer.send('app:start-selection'),
  startMultiSelection: () => ipcRenderer.send('app:start-multi-selection'),
  startTranslation: () => ipcRenderer.send('app:start-translation'),
  startClipboardExplain: () => ipcRenderer.send('app:clipboard-explain'),
  bubbleMenu: () => ipcRenderer.send('app:bubble-menu'),
  expandBubble: () => ipcRenderer.send('bubble:expand'),
  collapseBubble: () => ipcRenderer.send('bubble:collapse'),
  hideBubble: () => ipcRenderer.send('bubble:hide'),
  bubbleMenuOpen: (direction, height) => ipcRenderer.send('bubble:menu-open', { direction, height }),
  bubbleMenuClose: () => ipcRenderer.send('bubble:menu-close'),
  onBubbleMode: (cb) => subscribe('bubble:mode', cb),
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // Result window
  onResultInit: (cb) => subscribe('result:init', cb),
  onResultEvent: (cb) => subscribe('result:event', cb),
  onOcrGuard: (cb) => subscribe('result:ocr-guard', cb),
  resolveOcrGuard: (ok) => ipcRenderer.send('result:ocr-guard-response', Boolean(ok)),
  getResultState: () => ipcRenderer.invoke('session:state'),
  ask: (question) => ipcRenderer.send('session:ask', question),
  stop: () => ipcRenderer.send('session:stop'),
  retry: () => ipcRenderer.send('session:retry'),
  regenerate: () => ipcRenderer.send('session:regenerate'),
  addShot: () => ipcRenderer.send('session:add-shot'),
  setManualText: (text) => ipcRenderer.send('session:manual', text),
  correctOcr: (text) => ipcRenderer.send('session:correct-ocr', text),
  setWebEnabled: (enabled) => ipcRenderer.send('session:web', Boolean(enabled)),
  closeResult: () => ipcRenderer.send('result:close'),
  collapseResult: (collapsed) => ipcRenderer.send('result:collapse', Boolean(collapsed)),
  onResultCollapsed: (cb) => subscribe('result:collapsed', cb),
  setPinned: (pinned) => ipcRenderer.send('result:pin', Boolean(pinned)),
  toggleResultExpand: () => ipcRenderer.send('result:toggle-expand'),
  onResultMode: (cb) => subscribe('result:mode', cb),

  setHotkeyRecording: (enabled) => ipcRenderer.invoke('hotkey:recording', Boolean(enabled)),
  testModelProfile: (task, patch) => ipcRenderer.invoke('settings:test-profile', { task, patch }),
  getUpdateState: () => ipcRenderer.invoke('updates:state'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateState: (cb) => subscribe('updates:state', cb),

  // Screenshot translation
  onTranslateInit: (cb) => subscribe('translate:init', cb),
  onTranslateEvent: (cb) => subscribe('translate:event', cb),
  collapseTranslate: (collapsed) => ipcRenderer.send('translate:collapse', Boolean(collapsed)),
  onTranslateCollapsed: (cb) => subscribe('translate:collapsed', cb),
  retranslate: (target) => ipcRenderer.send('translate:retry', target),
  searchTranslation: (text) => ipcRenderer.send('translate:search', text),
  closeTranslate: () => ipcRenderer.send('translate:close'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  testConnection: (draft) => ipcRenderer.invoke('settings:test', draft),
  closeSettings: () => ipcRenderer.send('settings:close'),
  openSettings: () => ipcRenderer.send('app:settings'),

  // Font / reading appearance
  openFontWindow: () => ipcRenderer.send('font:open'),
  closeFontWindow: () => ipcRenderer.send('font:close'),
  listFonts: () => ipcRenderer.invoke('fonts:list'),
  getFont: () => ipcRenderer.invoke('font:get'),
  importFont: () => ipcRenderer.invoke('font:import'),
  applyFont: (font) => ipcRenderer.invoke('font:apply', font),
  onFontUpdated: (cb) => subscribe('font:update', cb),

  // History
  openHistory: () => ipcRenderer.send('history:open'),
  closeHistory: () => ipcRenderer.send('history:close'),
  listHistory: (options) => ipcRenderer.invoke('history:list', options),
  getHistoryRecord: (id) => ipcRenderer.invoke('history:get', id),
  setHistoryFavorite: (id, favorite) => ipcRenderer.invoke('history:favorite', { id, favorite }),
  deleteHistoryRecord: (id) => ipcRenderer.invoke('history:delete', id),
  clearHistory: (keepFavorites) => ipcRenderer.invoke('history:clear', keepFavorites),
  onHistoryShowRecord: (cb) => subscribe('history:show-record', cb),

  resumeHistory: (id) => ipcRenderer.invoke('history:resume', id),
  onHistoryUpdated: (cb) => subscribe('history:update', cb),

  // Language
  setLanguage: (language) => ipcRenderer.invoke('app:set-language', language),
  getLanguage: () => ipcRenderer.invoke('app:language'),
  onLanguageUpdated: (cb) => subscribe('language:update', cb),

  // Theme
  onThemeUpdated: (cb) => subscribe('theme:update', cb),

  // Small utilities
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  getDiagnostics: () => ipcRenderer.invoke('app:diagnostics'),
  copyText: (text) => ipcRenderer.invoke('app:copy', text),
  readClipboard: () => ipcRenderer.invoke('app:read-clipboard'),
  quitApp: () => ipcRenderer.send('app:quit')
});
