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
  bubbleMenu: () => ipcRenderer.send('app:bubble-menu'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // Result window
  onResultInit: (cb) => subscribe('result:init', cb),
  onResultEvent: (cb) => subscribe('result:event', cb),
  getResultState: () => ipcRenderer.invoke('session:state'),
  ask: (question) => ipcRenderer.send('session:ask', question),
  stop: () => ipcRenderer.send('session:stop'),
  retry: () => ipcRenderer.send('session:retry'),
  regenerate: () => ipcRenderer.send('session:regenerate'),
  setManualText: (text) => ipcRenderer.send('session:manual', text),
  setWebEnabled: (enabled) => ipcRenderer.send('session:web', Boolean(enabled)),
  closeResult: () => ipcRenderer.send('result:close'),
  setPinned: (pinned) => ipcRenderer.send('result:pin', Boolean(pinned)),

  setHotkeyRecording: (enabled) => ipcRenderer.invoke('hotkey:recording', Boolean(enabled)),
  testModelProfile: (task, patch) => ipcRenderer.invoke('settings:test-profile', { task, patch }),
  getUpdateState: () => ipcRenderer.invoke('updates:state'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateState: (cb) => subscribe('updates:state', cb),

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

  // Small utilities
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  copyText: (text) => ipcRenderer.invoke('app:copy', text),
  readClipboard: () => ipcRenderer.invoke('app:read-clipboard'),
  quitApp: () => ipcRenderer.send('app:quit')
});
