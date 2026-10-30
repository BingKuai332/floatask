'use strict';

const {
  app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage,
  screen, shell, clipboard, Notification, protocol, dialog
} = require('electron');
const path = require('path');
const fs = require('fs');

const store = require('./store');
const { PRESETS } = require('../shared/presets');
const { t } = require('./i18n');
const { normalizeLocale } = require('../shared/i18n');
const history = require('./history');
const { resolveModel, TASKS } = require('./model-config');
const { normalizeHotkey } = require('../shared/hotkeys');
const { createUpdater } = require('./updater');
let updater = null;
let recordingTimer = null;
let lastNotifiedUpdate = '';
const { captureRegion, cleanupCapture } = require('./capture');
const { recognizeImage, getForegroundInfo, listSystemFonts } = require('./powershell');
const { searchWeb } = require('./search');
const { streamChat, testConnection, AIError } = require('./ai');
const {
  buildInitialMessages, buildFollowupMessages, buildSystemContext, formatWindow
} = require('./prompt');

const ROOT = path.join(__dirname, '..', '..');
const RENDERER = path.join(__dirname, '..', 'renderer');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const ICON_PNG = path.join(ROOT, 'resources', 'icon.png');
const ICON_ICO = path.join(ROOT, 'resources', 'icon.ico');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let tray = null;
let bubbleWin = null;
let overlayWin = null;
let overlayDisplay = null;
let resultWin = null;
let settingsWin = null;
let fontWin = null;
let historyWin = null;
let translateWin = null;
let translationState = null;
let overlayMode = 'single';
let isQuitting = false;
let pinned = true;
let session = null;
let resultState = null;
let hotkey = 'Alt+Q';
let hotkeyOk = false;
let settingsFirstRun = false;
let sessionCounter = 0;
let bubbleMoveTimer = null;
let bubbleCreating = null;

app.setName('FloatAsk');

protocol.registerSchemesAsPrivileged([{
  scheme: 'floatask-font',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}]);

function resolveUserData() {
  const os = require('os');
  let current = '';
  try { current = app.getPath('userData'); } catch { /* not available yet */ }
  const candidates = [
    process.env.FLOATASK_USER_DATA,
    current,
    process.env.APPDATA ? path.join(process.env.APPDATA, 'FloatAsk') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'FloatAsk') : '',
    path.join(path.dirname(process.execPath), 'FloatAskData'),
    path.join(os.tmpdir(), 'FloatAsk')
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch { /* try next */ }
  }
  return path.join(os.tmpdir(), 'FloatAsk');
}

try {
  app.setPath('userData', resolveUserData());
} catch (err) {
  console.warn('[floatask] could not set userData:', err.message);
}

function log(...args) {
  console.log('[floatask]', ...args);
}

function secureWindow(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current) {
      event.preventDefault();
      openExternal(url);
    }
  });
}

function openExternal(url) {
  try {
    const parsed = new URL(String(url));
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    shell.openExternal(parsed.href).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

let appIconCache = null;

function appIcon() {
  if (appIconCache) return appIconCache;
  try {
    appIconCache = nativeImage.createFromBuffer(fs.readFileSync(ICON_PNG));
  } catch {
    appIconCache = undefined;
  }
  return appIconCache;
}

function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: appIcon() }).show();
    }
  } catch { /* notifications are best-effort */ }
}

/* ------------------------------------------------------------------ */
/* Tray                                                                */
/* ------------------------------------------------------------------ */

function buildTrayMenu() {
  const config = store.getConfig();
  return Menu.buildFromTemplate([
    {
      label: t('tray.select'),
      accelerator: hotkey,
      click: () => startSelection()
    },
    {
      label: t('tray.multiSelect'),
      accelerator: 'Alt+Shift+Q',
      click: () => startMultiSelection()
    },
    {
      label: t('tray.translate'),
      accelerator: 'Alt+T',
      click: () => startTranslationSelection()
    },
    {
      label: t('tray.clipboard'),
      click: () => askClipboard()
    },
    { type: 'separator' },
    {
      label: t('tray.history'),
      click: () => openHistory()
    },
    {
      label: t('tray.showBubble'),
      type: 'checkbox',
      checked: config.showBubble,
      click: (item) => toggleBubble(item.checked)
    },
    {
      label: t('tray.settings'),
      click: () => openSettings(false)
    },
    { type: 'separator' },
    {
      label: t('tray.quit'),
      click: () => { isQuitting = true; app.quit(); }
    }
  ]);
}

function createTray() {
  let icon = nativeImage.createEmpty();
  try { icon = nativeImage.createFromBuffer(fs.readFileSync(ICON_PNG)); } catch { /* try ico */ }
  if (icon.isEmpty()) {
    try { icon = nativeImage.createFromBuffer(fs.readFileSync(ICON_ICO)); } catch { /* missing */ }
  }
  if (icon.isEmpty()) {
    log('tray icon missing');
    return;
  }
  icon = icon.resize({ width: 16, height: 16 });
  try {
    tray = new Tray(icon);
    tray.setToolTip(t('tray.tooltip', { hotkey }));
    tray.setContextMenu(buildTrayMenu());
    tray.on('double-click', () => startSelection());
  } catch (err) {
    log('tray failed', err.message);
    tray = null;
  }
}

function refreshTray() {
  if (!tray) return;
  tray.setToolTip(t('tray.tooltip', { hotkey }));
  tray.setContextMenu(buildTrayMenu());
}

/* ------------------------------------------------------------------ */
/* Bubble launcher                                                     */
/* ------------------------------------------------------------------ */

function defaultBubblePosition() {
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  return {
    x: area.x + area.width - 238 - 16,
    y: area.y + Math.round(area.height * 0.52)
  };
}

function clampBubblePosition(x, y) {
  const displays = screen.getAllDisplays();
  const display = screen.getDisplayNearestPoint({ x, y }) || displays[0];
  const area = display.workArea;
  return {
    x: Math.round(Math.min(Math.max(x, area.x + 4), area.x + area.width - 238 - 4)),
    y: Math.round(Math.min(Math.max(y, area.y + 4), area.y + area.height - 68 - 4))
  };
}

async function ensureBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) return bubbleWin;
  if (bubbleCreating) return bubbleCreating;

  bubbleCreating = (async () => {
  bubbleWin = new BrowserWindow({
    width: 238,
    height: 68,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    title: t('common.appName'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  bubbleWin.setMenuBarVisibility(false);
  bubbleWin.setAlwaysOnTop(true, 'floating');
  try {
    bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch { /* Windows may not support this */ }
  secureWindow(bubbleWin);

  const config = store.getConfig();
  const saved = config.bubblePosition;
  const pos = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
    ? clampBubblePosition(saved.x, saved.y)
    : defaultBubblePosition();
  bubbleWin.setPosition(pos.x, pos.y, false);

  bubbleWin.on('moved', () => {
    if (!bubbleWin || bubbleWin.isDestroyed()) return;
    clearTimeout(bubbleMoveTimer);
    bubbleMoveTimer = setTimeout(() => {
      if (!bubbleWin || bubbleWin.isDestroyed()) return;
      const [x, y] = bubbleWin.getPosition();
      store.setBubblePosition(x, y);
    }, 400);
  });

  bubbleWin.on('closed', () => { bubbleWin = null; });

  await bubbleWin.loadFile(path.join(RENDERER, 'bubble.html'));
  bubbleWin.showInactive();
  return bubbleWin;
  })();

  try {
    return await bubbleCreating;
  } finally {
    bubbleCreating = null;
  }
}

function refreshBubble() {
  const config = store.getConfig();
  if (isQuitting || !config.showBubble) {
    if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
    return;
  }
  if ((overlayWin && !overlayWin.isDestroyed()) || (resultWin && !resultWin.isDestroyed() && resultWin.isVisible())) {
    if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
    return;
  }
  ensureBubble().then((win) => {
    if (!win || win.isDestroyed()) return;
    if (!win.isVisible()) win.showInactive();
  }).catch((err) => log('bubble error', err.message));
}

function toggleBubble(show) {
  store.save({ showBubble: Boolean(show) });
  refreshTray();
  if (show) refreshBubble();
  else if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
}

/* ------------------------------------------------------------------ */
/* Selection overlay                                                   */
/* ------------------------------------------------------------------ */

function closeOverlay() {
  const win = overlayWin;
  overlayWin = null;
  overlayDisplay = null;
  if (win && !win.isDestroyed()) {
    win.removeAllListeners('blur');
    win.destroy();
  }
}

async function startSelection(mode = 'single') {
  if (isQuitting) return;
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.focus();
    return;
  }
  overlayMode = mode;
  if (mode === 'single' && resultWin && !resultWin.isDestroyed() && resultWin.isVisible()) hideResult();
  if (mode === 'translate' && translateWin && !translateWin.isDestroyed()) translateWin.hide();

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  overlayDisplay = display;

  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: true,
    show: false,
    title: t('selection.title'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  overlayWin = win;
  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch { /* ignore */ }
  secureWindow(win);

  win.on('closed', () => {
    if (overlayWin === win) {
      overlayWin = null;
      overlayDisplay = null;
      refreshBubble();
    }
  });

  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();

  try {
    await win.loadFile(path.join(RENDERER, 'selection.html'));
    if (win.isDestroyed()) return;
    win.webContents.send('selection:init', {
      width: display.bounds.width,
      height: display.bounds.height,
      scaleFactor: display.scaleFactor,
      hotkey,
      font: fontPayload()
    });
    win.show();
    win.focus();
    setTimeout(() => {
      if (overlayWin !== win || win.isDestroyed()) return;
      win.on('blur', () => {
        setTimeout(() => {
          if (overlayWin === win && !win.isDestroyed()) cancelSelection();
        }, 280);
      });
    }, 350);
  } catch (err) {
    log('overlay load failed', err.message);
    if (overlayWin === win) closeOverlay();
    refreshBubble();
  }
}

function cancelSelection() {
  if (!overlayWin) return;
  closeOverlay();
  refreshBubble();
}

function startMultiSelection() {
  return startSelection('multi');
}

function startTranslationSelection() {
  return startSelection('translate');
}

function handleSelectionRect(rawRect) {
  if (!session && !overlayDisplay) return;
  const display = overlayDisplay || screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const rect = {
    x: Number(rawRect?.x) || 0,
    y: Number(rawRect?.y) || 0,
    width: Number(rawRect?.width) || 0,
    height: Number(rawRect?.height) || 0
  };
  const clamped = {
    x: Math.max(0, Math.min(rect.x, display.bounds.width - 2)),
    y: Math.max(0, Math.min(rect.y, display.bounds.height - 2)),
    width: Math.min(rect.width, display.bounds.width - rect.x),
    height: Math.min(rect.height, display.bounds.height - rect.y)
  };
  if (clamped.width < 8 || clamped.height < 8) {
    cancelSelection();
    notify(t('notify.regionSmall.title'), t('notify.regionSmall.body'));
    return;
  }
  const mode = overlayMode;
  overlayMode = 'single';
  closeOverlay();
  if (mode === 'translate') {
    handleTranslateSelection(display, clamped);
    return;
  }
  if (mode === 'multi' && session) {
    handleAdditionalShot(display, clamped);
    return;
  }
  handleSelection(display, clamped);
}

async function handleSelection(display, rect) {
  const id = ++sessionCounter;
  if (session?.abort) session.abort.abort();
  session = null;
  resultState = null;

  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
  if (resultWin && !resultWin.isDestroyed()) resultWin.hide();

  await delay(140);
  if (sessionCounter !== id) return;

  // Attach the rejection handler immediately: capture may fail or be superseded
  // before the OCR phase has an opportunity to await this promise.
  const contextPromise = getForegroundInfo(process.pid).catch((err) => {
    log('foreground info failed', err.message);
    return {};
  });
  let capture = null;
  let captureError = null;
  try {
    capture = await captureRegion(display, rect, { vision: store.getConfig().vision });
  } catch (err) {
    captureError = err;
    log('capture failed', err.message);
  }
  if (sessionCounter !== id) {
    if (capture) cleanupCapture(capture.pngPath);
    return;
  }

  const screenRect = {
    x: display.bounds.x + rect.x,
    y: display.bounds.y + rect.y,
    width: rect.width,
    height: rect.height
  };

  const config = store.getConfig();
  session = {
    id,
    selectionText: '',
    windowInfo: {},
    imageDataUrl: config.vision ? capture?.visionDataUrl || null : null,
    previewDataUrl: capture?.previewDataUrl || '',
    vision: resolveModel(config, 'initial', Boolean(capture)).vision,
    webEnabled: Boolean(config.webEnabled),
    sources: [],
    pendingSources: [],
    shots: [],
    history: [],
    lastQuestion: '',
    lastAnswerComplete: false,
    manual: false,
    busy: false,
    abort: null,
    display,
    rect,
    screenRect,
    createdAt: Date.now()
  };

  const initPayload = {
    selectionText: '',
    windowInfo: {},
    preview: session.previewDataUrl,
    shotCount: 0,
    vision: session.vision,
    webEnabled: session.webEnabled,
    provider: config.provider,
    providerLabel: PRESETS[config.provider]?.label || config.provider,
    model: config.model,
    hasApiKey: Boolean(config.apiKey) || isLocalBaseUrl(config.baseUrl),
    hotkey,
    pinned,
    font: fontPayload(),
    status: captureError ? 'error' : 'ocr',
    error: captureError ? {
      message: t('main.captureFailed'),
      hint: captureError.message
    } : null
  };

  await showResult(initPayload, screenRect, display);
  if (!session || session.id !== id) {
    if (capture) cleanupCapture(capture.pngPath);
    return;
  }

  if (captureError) {
    sendResult({
      type: 'error',
      code: 'capture',
      message: t('main.captureFailed'),
      hint: captureError.message,
      retryable: false
    });
    sendResult({ type: 'needs-input', message: t('main.captureFailedPaste') });
    return;
  }

  // Context and OCR are both slow; run them together.
  contextPromise.then((info) => {
    if (!session || session.id !== id) return;
    session.windowInfo = info;
    sendResult({ type: 'context', windowInfo: info });
  }).catch((err) => {
    log('foreground info failed', err.message);
  });

  let ocr = { text: '', error: '' };
  try {
    const result = await recognizeImage(capture.pngPath);
    ocr = { text: result.text, error: '', lang: result.lang };
  } catch (err) {
    ocr = { text: '', error: err.message };
    log('ocr failed', err.message);
  } finally {
    cleanupCapture(capture.pngPath);
  }

  if (!session || session.id !== id) return;

  session.selectionText = ocr.text;
  session.shots = [{
    text: ocr.text,
    preview: session.previewDataUrl,
    image: session.imageDataUrl,
    windowInfo: session.windowInfo
  }];
  sendResult({
    type: 'ocr',
    text: ocr.text,
    error: ocr.error,
    lang: ocr.lang || '',
    empty: !ocr.text,
    shotCount: 1
  });

  const windowInfo = await contextPromise;
  if (!session || session.id !== id) return;
  session.windowInfo = windowInfo;
  sendResult({ type: 'context', windowInfo: session.windowInfo });

  const hasModelAccess = hasModelConfig(resolveModel(store.getConfig(), 'initial', Boolean(session.imageDataUrl)));
  if (!hasModelAccess) {
    if (config.searchProvider !== 'off' && session.selectionText) {
      startSearchOnly();
      return;
    }
    sendResult({
      type: 'error',
      code: 'config',
      message: t('main.noModel'),
      hint: t('main.noModelHint'),
      retryable: false
    });
    return;
  }

  if (!ocr.text && !session.vision) {
    sendResult({
      type: 'needs-input',
      message: t('main.needPaste')
    });
    return;
  }

  if (!ocr.text && session.vision) {
    sendResult({ type: 'notice', message: t('main.noOcrVision') });
  }

  startInitial();
}

/* ------------------------------------------------------------------ */
/* Additional screenshots                                              */
/* ------------------------------------------------------------------ */

async function handleAdditionalShot(display, rect) {
  const current = session;
  if (!current) {
    await handleSelection(display, rect);
    return;
  }
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
  if (resultWin && !resultWin.isDestroyed()) resultWin.hide();
  await delay(120);
  if (session !== current) return;

  let capture = null;
  try {
    capture = await captureRegion(display, rect);
  } catch (err) {
    log('additional capture failed', err.message);
    if (resultWin && !resultWin.isDestroyed()) resultWin.show();
    sendResult({ type: 'error', code: 'capture', message: t('main.captureFailed'), hint: err.message, retryable: true });
    return;
  }
  if (session !== current) {
    if (capture) cleanupCapture(capture.pngPath);
    return;
  }

  let text = '';
  try {
    const ocr = await recognizeImage(capture.pngPath);
    text = ocr.text || '';
  } catch (err) {
    log('additional ocr failed', err.message);
  } finally {
    cleanupCapture(capture.pngPath);
  }
  if (session !== current) return;

  current.shots = Array.isArray(current.shots) ? current.shots : [];
  current.shots.push({ text, preview: capture.previewDataUrl, image: capture.visionDataUrl });
  current.selectionText = current.shots
    .map((shot, index) => `【截图 ${index + 1}】\n${shot.text || '（无 OCR 文字）'}`)
    .join('\n\n');
  current.imageDataUrl = capture.visionDataUrl || current.imageDataUrl;
  current.previewDataUrl = capture.previewDataUrl || current.previewDataUrl;

  if (resultWin && !resultWin.isDestroyed()) {
    resultWin.show();
    resultWin.focus();
  }
  sendResult({
    type: 'shot',
    count: current.shots.length,
    preview: current.previewDataUrl,
    text
  });

  if (current.abort) {
    try { current.abort.abort(); } catch { /* ignore */ }
    current.busy = false;
    current.abort = null;
  }
  await delay(80);
  if (session !== current) return;
  current.systemContext = buildSystemContext({
    selection: current.selectionText,
    windowInfo: current.windowInfo,
    sources: current.sources
  });
  if (current.history.some((item) => item.role === 'assistant')) {
    await handleAsk(t('main.newShotQuestion'));
  } else {
    await startInitial();
  }
}

/* ------------------------------------------------------------------ */
/* Screenshot translation                                              */
/* ------------------------------------------------------------------ */

function translationTarget(text) {
  const source = String(text || '');
  const cjk = (source.match(/[\u3400-\u9fff]/g) || []).length;
  return cjk > Math.max(2, source.length * 0.12) ? 'en' : 'zh';
}

function translationPrompt(target) {
  const language = target === 'en' ? 'English' : 'Simplified Chinese';
  return `You are a precise screenshot translator. Translate the supplied screen text into ${language}. ` +
    'Output only the translation, with no explanation, no quotes and no markdown heading. ' +
    'Preserve line breaks, numbers, code identifiers, shortcuts and UI labels. ' +
    'If the source is already in the target language, return it unchanged.';
}

async function ensureTranslateWindow() {
  if (translateWin && !translateWin.isDestroyed()) return translateWin;
  translateWin = new BrowserWindow({
    width: 880,
    height: 620,
    minWidth: 640,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    title: 'FloatAsk Translate',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  translateWin.setMenuBarVisibility(false);
  translateWin.setAlwaysOnTop(true, 'screen-saver');
  try { translateWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch { /* ignore */ }
  secureWindow(translateWin);
  translateWin.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    translateWin.hide();
    if (translationState?.abort) translationState.abort.abort();
    translationState = null;
    refreshBubble();
  });
  await translateWin.loadFile(path.join(RENDERER, 'translate.html'));
  return translateWin;
}

async function showTranslation(payload) {
  const win = await ensureTranslateWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send('translate:init', payload);
  win.show();
  win.focus();
  refreshBubble();
}

function sendTranslation(payload) {
  if (translateWin && !translateWin.isDestroyed()) translateWin.webContents.send('translate:event', payload);
}

async function handleTranslateSelection(display, rect) {
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
  if (resultWin && !resultWin.isDestroyed()) resultWin.hide();
  await delay(140);

  let capture = null;
  try {
    capture = await captureRegion(display, rect);
  } catch (err) {
    log('translate capture failed', err.message);
    await showTranslation({ preview: '', text: '', target: 'zh', error: t('main.captureFailed'), hint: err.message });
    return;
  }

  let text = '';
  try {
    const ocr = await recognizeImage(capture.pngPath);
    text = ocr.text || '';
  } catch (err) {
    log('translate ocr failed', err.message);
  } finally {
    cleanupCapture(capture.pngPath);
  }

  if (translationState?.abort) {
    try { translationState.abort.abort(); } catch { /* ignore */ }
  }
  const target = translationTarget(text);
  translationState = {
    preview: capture.previewDataUrl || '',
    image: capture.visionDataUrl || null,
    text,
    target,
    translation: '',
    abort: null,
    id: ++sessionCounter
  };
  await showTranslation({ preview: translationState.preview, text, target, status: 'ready' });
  await translateCurrent(target);
}

async function translateCurrent(target) {
  const state = translationState;
  if (!state) return;
  if (state.abort) {
    try { state.abort.abort(); } catch { /* ignore */ }
  }
  state.translation = '';
  state.target = target === 'en' ? 'en' : 'zh';
  sendTranslation({ type: 'target', target: state.target });

  const config = resolveModel(store.getConfig(), 'initial', Boolean(state.image));
  if (!hasModelConfig(config)) {
    sendTranslation({ type: 'error', message: t('main.noModel'), hint: t('main.noModelHint') });
    return;
  }
  if (!state.text.trim() && !config.vision) {
    sendTranslation({ type: 'error', message: '没有识别到可翻译的文字', hint: '请框选包含文字的区域，或在设置中启用支持图片理解的模型。' });
    return;
  }

  const controller = new AbortController();
  state.abort = controller;
  const content = state.text.trim()
    ? `<source_text>\n${state.text.slice(0, 12000)}\n</source_text>`
    : 'Translate every piece of text visible in this screenshot.';
  sendTranslation({ type: 'start', target: state.target });
  try {
    const result = await streamChat({
      config,
      signal: controller.signal,
      messages: [
        { role: 'system', content: translationPrompt(state.target) },
        { role: 'user', content, image: config.vision ? state.image : undefined }
      ],
      onDelta: (delta) => {
        state.translation += delta;
        sendTranslation({ type: 'delta', text: delta });
      }
    });
    if (state.abort !== controller) return;
    const finalText = (result?.text || state.translation || '').trim();
    state.translation = finalText;
    state.abort = null;
    sendTranslation({ type: 'done', text: finalText });
  } catch (err) {
    if (state.abort !== controller) return;
    state.abort = null;
    if (err.code === 'aborted') return;
    sendTranslation({ type: 'error', message: err.message || '翻译失败', hint: err.hint || '' });
  }
}

async function searchTranslation(rawText) {
  const query = String(rawText || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!query) {
    sendTranslation({ type: 'search-error', message: '没有可检索的文字' });
    return;
  }
  const config = store.getConfig();
  if (config.searchProvider === 'off') {
    sendTranslation({ type: 'search-error', message: '联网检索未开启，请先在设置中启用搜索' });
    return;
  }
  sendTranslation({ type: 'search-start', query });
  try {
    const web = await searchWeb(query, {
      provider: config.searchProvider,
      searxngUrl: config.searxngUrl,
      fetchPages: true,
      pageLimit: 4
    });
    if (!translateWin || translateWin.isDestroyed()) return;
    sendTranslation({
      type: 'search-results',
      query,
      results: (web.results || []).slice(0, 8).map((item) => ({
        title: item.title || '',
        url: item.url || '',
        snippet: item.snippet || item.content || ''
      }))
    });
  } catch (err) {
    sendTranslation({ type: 'search-error', message: `检索失败：${err.message}` });
  }
}

/* ------------------------------------------------------------------ */
/* Result window                                                       */
/* ------------------------------------------------------------------ */

async function ensureResultWindow() {
  if (resultWin && !resultWin.isDestroyed()) return resultWin;

  resultWin = new BrowserWindow({
    width: 460,
    height: 650,
    minWidth: 380,
    minHeight: 440,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    title: t('common.appName'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  resultWin.setMenuBarVisibility(false);
  resultWin.setAlwaysOnTop(true, 'screen-saver');
  try {
    resultWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch { /* ignore */ }
  secureWindow(resultWin);

  resultWin.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    hideResult();
  });
  resultWin.on('closed', () => { resultWin = null; });

  await resultWin.loadFile(path.join(RENDERER, 'result.html'));
  return resultWin;
}

function positionResult(screenRect, display) {
  const area = display.workArea;
  const width = Math.min(460, area.width - 24);
  const height = Math.min(650, area.height - 24);
  let x = screenRect.x + screenRect.width + 14;
  if (x + width > area.x + area.width - 8) x = screenRect.x - width - 14;
  if (x < area.x + 8) x = area.x + Math.round((area.width - width) / 2);
  let y = screenRect.y - 16;
  if (y + height > area.y + area.height - 8) y = area.y + area.height - height - 8;
  if (y < area.y + 8) y = area.y + 8;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

async function showResult(payload, screenRect, display, sessionId = session?.id) {
  if (!session || session.id !== sessionId) return;
  const win = await ensureResultWindow();
  if (!win || win.isDestroyed() || !session || session.id !== sessionId) return;
  const bounds = positionResult(screenRect, display);
  win.setBounds(bounds, false);
  resultState = payload;
  win.show();
  win.focus();
  win.setAlwaysOnTop(pinned, 'screen-saver');
  win.webContents.send('result:init', payload);
  refreshBubble();
}

function hideResult() {
  ++sessionCounter;
  if (resultWin && !resultWin.isDestroyed()) resultWin.destroy();
  if (session?.abort) session.abort.abort();
  session = null;
  resultState = null;
  refreshBubble();
}

function sendResult(payload) {
  if (resultWin && !resultWin.isDestroyed() && !resultWin.webContents.isDestroyed()) {
    resultWin.webContents.send('result:event', payload);
  }
}

/* ------------------------------------------------------------------ */
/* Conversation                                                        */
/* ------------------------------------------------------------------ */

let historyIdleTimer;
function broadcastHistory() {
  clearTimeout(historyIdleTimer);
  historyIdleTimer = setTimeout(() => { if (!historyWin || !historyWin.isVisible()) history.release(); }, 30000);
  historyIdleTimer.unref();
  if (historyWin && !historyWin.isDestroyed()) historyWin.webContents.send('history:update');
}

function saveHistoryIfNeeded() {
  if (!session || !session.history?.length) return;
  if (!store.getConfig().saveHistory || session.historyDeleted) return;
  try {
    const config = store.getConfig();
    history.record(session, { model: session.lastModel?.model || config.model, provider: session.lastModel?.provider || config.provider });
    broadcastHistory();
  } catch (err) {
    log('history record failed', err.message);
    sendResult({ type: 'notice', message: t('history.writeFailed') });
  }
}

function isLocalBaseUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(String(url || ''));
}

function hasModelConfig(config) {
  return Boolean(config.baseUrl && config.model) && (Boolean(config.apiKey) || isLocalBaseUrl(config.baseUrl));
}

function configError(config) {
  if (!config.baseUrl) return { code: 'config', message: t('main.noBaseUrl'), hint: t('main.noBaseUrlHint') };
  if (!config.model) return { code: 'config', message: t('main.noModelName'), hint: t('main.noModelNameHint') };
  if (!config.apiKey && !isLocalBaseUrl(config.baseUrl)) {
    return { code: 'config', message: t('main.noApiKey'), hint: t('main.noApiKeyHint') };
  }
  return null;
}

function searchQueryForInitial() {
  if (!session?.selectionText) return '';
  const text = session.selectionText.replace(/\s+/g, ' ').trim();
  if (text.length <= 60) return `${text}${t('main.searchSuffix')}`;
  return text.slice(0, 150);
}

function looksLikeUiOrCode(text) {
  const value = String(text || '');
  const noise = (value.match(/点击|充值|余额|费用|日期|延迟|登录|设置|取消|确定|菜单|按钮|搜索|下载|安装|版本|账号|订单|支付|刷新|返回/g) || []).length;
  const symbolRatio = ((value.match(/[¥$€\d]/g) || []).length) / Math.max(1, value.length);
  const codeSignals = (value.match(/[{};]|=>|\b(function|const|let|var|class|import|return|def|SELECT|npm|pip)\b/g) || []).length;
  return noise >= 4 || (noise >= 2 && symbolRatio > 0.08) || (codeSignals >= 3 && value.length < 900);
}

function searchQueryForQuestion(question) {
  const q = String(question || '').replace(/\s+/g, ' ').trim();
  if (!session?.selectionText) return q;
  const base = session.selectionText.replace(/\s+/g, ' ').trim();
  if (base.length > 180) return q;
  return `${base.slice(0, 80)} ${q}`.trim();
}

async function performSearch(query, config) {
  if (!query || config.searchProvider === 'off') return { results: [], note: '' };
  const web = await searchWeb(query, {
    provider: config.searchProvider,
    searxngUrl: config.searxngUrl,
    fetchPages: true,
    pageLimit: 2
  });
  return { results: web.results, note: '' };
}

async function startSearchOnly(question = '') {
  if (!session) return;
  const config = store.getConfig();
  if (config.searchProvider === 'off') {
    sendResult({
      type: 'error',
      code: 'config',
      message: t('main.noModel'),
      hint: t('main.noModelHint'),
      retryable: false
    });
    return;
  }
  const id = session.id;
  const query = question ? searchQueryForQuestion(question) : searchQueryForInitial();
  if (!query.trim()) {
    sendResult({
      type: 'error',
      code: 'config',
      message: t('searchOnly.noText'),
      hint: t('searchOnly.noTextHint'),
      retryable: false
    });
    return;
  }
  if (session.abort) {
    try { session.abort.abort(); } catch { /* ignore */ }
  }
  const controller = new AbortController();
  session.abort = controller;
  session.busy = true;
  sendResult({ type: 'phase', phase: 'searching', code: 'searching', message: t('main.phaseSearching') });
  try {
    const result = await performSearch(query, config);
    if (!session || session.id !== id || controller.signal.aborted) return;
    session.sources = result.results || [];
    sendResult({
      type: 'search-only',
      query,
      results: session.sources,
      count: session.sources.length
    });
  } catch (err) {
    if (!session || session.id !== id || controller.signal.aborted) return;
    sendResult({
      type: 'error',
      code: 'search',
      message: t('searchOnly.failed'),
      hint: err.message,
      retryable: true
    });
  } finally {
    if (session && session.id === id) {
      session.busy = false;
      if (session.abort === controller) session.abort = null;
    }
  }
}

async function startInitial() {
  if (!session) return;
  const id = session.id;
  const config = resolveModel(store.getConfig(), 'initial', Boolean(session.imageDataUrl));
  session.vision = config.vision;
  const error = configError(config);
  if (error) {
    sendResult({ type: 'error', ...error, retryable: false });
    return;
  }

  session.history = [];
  session.lastAnswerComplete = false;
  session.busy = true;
  const requestController = new AbortController();
  session.abort = requestController;
  session.sources = [];
  session.pendingSources = [];

  let sources = [];
  let webNote = '';
  const skipInitialSearch = !session.selectionText || looksLikeUiOrCode(session.selectionText);
  if (skipInitialSearch && session.selectionText && session.webEnabled && config.searchProvider !== 'off') {
    sendResult({ type: 'notice', message: t('main.skipSearchNotice') });
  }
  if (session.webEnabled && session.selectionText && config.searchProvider !== 'off' && !skipInitialSearch) {
    sendResult({ type: 'phase', phase: 'searching', code: 'searching', message: t('main.phaseSearching') });
    try {
      const result = await performSearch(searchQueryForInitial(), config);
      sources = result.results;
      if (!session || session.id !== id || requestController.signal.aborted) return;
      session.sources = sources;
      session.pendingSources = sources;
      if (sources.length) sendResult({ type: 'sources', sources, mode: 'initial' });
    } catch (err) {
      if (!session || session.id !== id || requestController.signal.aborted) return;
      webNote = err.message;
      sendResult({ type: 'notice', message: t('main.searchFailedInitial', { err: err.message }) });
    }
  }

  if (!session || session.id !== id || requestController.signal.aborted) return;

  session.systemContext = buildSystemContext({
    selection: session.selectionText,
    windowInfo: session.windowInfo,
    sources
  });

  const messages = buildInitialMessages({
    selection: session.selectionText,
    windowInfo: session.windowInfo,
    sources,
    image: session.imageDataUrl,
    vision: session.vision,
    manual: session.manual
  });

  sendResult({ type: 'phase', phase: 'thinking', code: 'thinking-initial', message: t('main.phaseThinking') });
  await runStream({ messages, mode: 'initial', question: '', webNote, controller: requestController, requestConfig: config });
}

async function handleAsk(rawQuestion) {
  if (!session) return;
  const question = String(rawQuestion || '').trim().slice(0, 3000);
  if (!question) return;
  if (session.busy) return;

  const config = resolveModel(store.getConfig(), 'followup', Boolean(session.imageDataUrl));
  session.vision = config.vision;
  const error = configError(config);
  if (error) {
    if (store.getConfig().searchProvider !== 'off' && session.selectionText) {
      await startSearchOnly(question);
      return;
    }
    sendResult({ type: 'error', ...error, retryable: false });
    return;
  }

  session.busy = true;
  const requestController = new AbortController();
  session.abort = requestController;
  session.lastQuestion = question;
  session.lastAnswerComplete = false;
  const id = session.id;
  let sources = [];
  let webNote = '';

  if (session.webEnabled && config.searchProvider !== 'off') {
    sendResult({ type: 'phase', phase: 'searching', code: 'searching', message: t('main.phaseSearchingFollow') });
    try {
      const result = await performSearch(searchQueryForQuestion(question), config);
      sources = result.results;
      if (!session || session.id !== id || requestController.signal.aborted) return;
      if (sources.length) sendResult({ type: 'sources', sources, mode: 'followup' });
    } catch (err) {
      if (!session || session.id !== id || requestController.signal.aborted) return;
      webNote = err.message;
      sendResult({ type: 'notice', message: t('main.searchFailedFollow', { err: err.message }) });
    }
  }

  if (!session || session.id !== id || requestController.signal.aborted) return;

  session.pendingSources = sources;
  session.systemContext = session.systemContext || buildSystemContext({
    selection: session.selectionText,
    windowInfo: session.windowInfo,
    sources: session.sources
  });

  const messages = buildFollowupMessages({
    systemContext: session.systemContext,
    history: session.history,
    question,
    sources,
    webNote,
    image: session.imageDataUrl,
    vision: session.vision
  });

  sendResult({ type: 'phase', phase: 'thinking', code: 'thinking-followup', message: t('main.phaseAnswering') });
  await runStream({ messages, mode: 'followup', question, webNote, controller: requestController, requestConfig: config });
}

async function runStream({ messages, mode, question, webNote, retriedWithoutImage = false, controller = new AbortController(), requestConfig }) {
  if (!session) return;
  const id = session.id;
  const config = requestConfig || resolveModel(store.getConfig(), mode === 'initial' ? 'initial' : 'followup', Boolean(session.imageDataUrl));
  session.lastModel = { model: config.model, provider: config.provider };
  session.vision = config.vision;
  sendResult({ type: 'model', model: config.model, providerLabel: PRESETS[config.provider]?.label || config.provider, vision: config.vision });
  session.abort = controller;
  session.busy = true;

  let full = '';
  sendResult({ type: 'start', mode });
  try {
    const result = await streamChat({
      config,
      messages,
      signal: controller.signal,
      onDelta: (delta) => {
        full += delta;
        if (session && session.id === id && session.abort === controller) sendResult({ type: 'delta', text: delta });
      }
    });

    if (!session || session.id !== id || session.abort !== controller) return;
    full = result.text || full;
    if (mode === 'initial') {
      session.history = [
        { role: 'user', content: t('prompt.initialUser') },
        { role: 'assistant', content: full }
      ];
    } else if (question) {
      session.history.push({ role: 'user', content: question });
      session.history.push({ role: 'assistant', content: full });
    }
    session.lastAnswerComplete = true;
    saveHistoryIfNeeded();
    sendResult({
      type: 'done',
      text: full,
      sources: session.pendingSources || [],
      usage: result.usage || null,
      webNote
    });
  } catch (err) {
    if (!session || session.id !== id || session.abort !== controller) return;

    if (err.code === 'aborted') {
      if (full.trim().length > 12) {
        if (mode === 'initial') {
          session.history = [
            { role: 'user', content: t('prompt.initialUser') },
            { role: 'assistant', content: full }
          ];
        } else if (question) {
          session.history.push({ role: 'user', content: question });
          session.history.push({ role: 'assistant', content: full });
        }
        session.lastAnswerComplete = true;
        saveHistoryIfNeeded();
      }
      sendResult({ type: 'stopped', text: full });
      return;
    }

    const canRetryWithoutImage = !retriedWithoutImage &&
      config.vision && Boolean(session.imageDataUrl) &&
      (err.status === 400 || /image|vision|multimodal|content.*type/i.test(`${err.message} ${err.detail}`));

    if (canRetryWithoutImage) {
      session.busy = false;
      session.abort = null;
      session.vision = false;
      sendResult({ type: 'notice', code: 'vision-fallback', message: t('main.visionFallback') });
      const fallbackMessages = mode === 'initial' ? buildInitialMessages({
        selection: session.selectionText,
        windowInfo: session.windowInfo,
        sources: session.pendingSources || [],
        image: null,
        vision: false,
        manual: session.manual
      }) : buildFollowupMessages({ systemContext: session.systemContext, history: session.history, question,
        sources: session.pendingSources || [], webNote, image: null, vision: false });
      await runStream({
        messages: fallbackMessages,
        mode,
        question,
        webNote,
        retriedWithoutImage: true,
        requestConfig: resolveModel(store.getConfig(), mode === 'initial' ? 'initial' : 'followup', false)
      });
      return;
    }

    sendResult({
      type: 'error',
      code: err.code || 'ai_error',
      message: err.message || t('ai.fallback'),
      hint: err.hint || '',
      detail: String(err.detail || '').slice(0, 900),
      status: err.status || 0,
      retryable: true
    });
  } finally {
    if (session && session.id === id && session.abort === controller) {
      session.busy = false;
      session.abort = null;
    }
  }
}

async function askClipboard() {
  let text = '';
  try { text = clipboard.readText().trim(); } catch { /* ignore */ }
  if (!text) {
    notify(t('notify.clipboardEmpty.title'), t('notify.clipboardEmpty.body'));
    return;
  }
  if (text.length > 6000) text = text.slice(0, 6000);
  if (resultWin && !resultWin.isDestroyed() && resultWin.isVisible()) hideResult();
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();

  const config = store.getConfig();
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const screenRect = {
    x: area.x + Math.round(area.width / 2) - 180,
    y: area.y + Math.round(area.height / 2) - 120,
    width: 360,
    height: 240
  };
  const id = ++sessionCounter;
  session = {
    id,
    selectionText: text,
    windowInfo: { title: t('main.clipboardTitle'), process: 'clipboard' },
    imageDataUrl: null,
    previewDataUrl: '',
    vision: false,
    webEnabled: Boolean(config.webEnabled),
    sources: [],
    pendingSources: [],
    history: [],
    lastQuestion: '',
    lastAnswerComplete: false,
    manual: true,
    busy: false,
    abort: null,
    display,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    screenRect,
    createdAt: Date.now()
  };
  session.systemContext = buildSystemContext({ selection: text, windowInfo: session.windowInfo, sources: [] });
  await showResult({
    selectionText: text,
    windowInfo: session.windowInfo,
    preview: '',
    vision: false,
    webEnabled: session.webEnabled,
    provider: config.provider,
    providerLabel: PRESETS[config.provider]?.label || config.provider,
    model: config.model,
    hasApiKey: Boolean(config.apiKey) || isLocalBaseUrl(config.baseUrl),
    hotkey,
    pinned,
    font: fontPayload(),
    status: 'ready',
    error: null
  }, screenRect, display);
  if (!session || session.id !== id) return;
  sendResult({ type: 'context', windowInfo: session.windowInfo });
  startInitial();
}

async function retryLast() {
  if (!session || session.busy) return;
  const q = session.lastQuestion;
  if (q) {
    if (session.lastAnswerComplete) {
      const last = session.history[session.history.length - 1];
      if (last?.role === 'assistant') session.history.pop();
      const lastUser = session.history[session.history.length - 1];
      if (lastUser?.role === 'user') session.history.pop();
    }
    await handleAsk(q);
  } else {
    session.history = [];
    await startInitial();
  }
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2']);

function fontDir() {
  const dir = path.join(app.getPath('userData'), 'fonts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function customFontMime(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.otf') return 'font/otf';
  if (ext === '.ttc') return 'font/collection';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  return 'font/ttf';
}

function customFontAvailable(config) {
  if (!config.customFontFile) return false;
  try {
    return fs.existsSync(path.join(fontDir(), config.customFontFile));
  } catch {
    return false;
  }
}

function fontPayload() {
  const config = store.getConfig();
  const hasCustom = customFontAvailable(config);
  const family = config.fontFamily === 'custom' && hasCustom ? 'custom' : (config.fontFamily || 'system');
  return {
    family,
    size: config.fontSize || 12.8,
    lineHeight: config.lineHeight || 1.72,
    scope: config.fontScope === 'reading' ? 'reading' : 'all',
    customFile: hasCustom ? config.customFontFile : '',
    customName: hasCustom ? config.customFontName : ''
  };
}

async function handleFontProtocol(request) {
  try {
    const url = new URL(request.url);
    const name = path.basename(decodeURIComponent(url.pathname));
    if (!/^custom-[a-z0-9._-]+$/i.test(name)) {
      return new Response('Not found', { status: 404 });
    }
    const filePath = path.join(fontDir(), name);
    if (!fs.existsSync(filePath)) return new Response('Not found', { status: 404 });
    const data = await fs.promises.readFile(filePath);
    return new Response(data, {
      headers: {
        'Content-Type': customFontMime(name),
        'Cache-Control': 'max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    log('font protocol failed', err.message);
    return new Response('Font load failed', { status: 500 });
  }
}

function cleanupCustomFonts() {
  try {
    const current = store.getConfig().customFontFile;
    const dir = fontDir();
    for (const file of fs.readdirSync(dir)) {
      if (!file.startsWith('custom-') || file === current) continue;
      if (!FONT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      try { fs.unlinkSync(path.join(dir, file)); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function broadcastFont() {
  const payload = fontPayload();
  if (resultWin && !resultWin.isDestroyed()) resultWin.webContents.send('font:update', payload);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('font:update', payload);
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.webContents.send('font:update', payload);
  if (historyWin && !historyWin.isDestroyed()) historyWin.webContents.send('font:update', payload);
}

/** Push the current locale to every live renderer and refresh native chrome. */
function broadcastLanguage() {
  const langCode = store.getConfig().language;
  const payload = { language: langCode };
  for (const win of [resultWin, settingsWin, bubbleWin, fontWin, historyWin, overlayWin]) {
    if (win && !win.isDestroyed()) win.webContents.send('language:update', payload);
  }
  refreshTray();
  try {
    if (resultWin && !resultWin.isDestroyed()) resultWin.setTitle('FloatAsk');
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.setTitle(t('settings.title'));
    if (fontWin && !fontWin.isDestroyed()) fontWin.setTitle(t('font.title'));
    if (historyWin && !historyWin.isDestroyed()) historyWin.setTitle(t('history.title'));
  } catch { /* titles are cosmetic */ }
}

async function openFontWindow() {
  if (fontWin && !fontWin.isDestroyed()) {
    fontWin.show();
    fontWin.focus();
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const width = Math.min(720, area.width - 24);
  const height = Math.min(650, area.height - 24);
  fontWin = new BrowserWindow({
    width,
    height,
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    minWidth: Math.min(620, area.width - 24),
    minHeight: Math.min(540, area.height - 24),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    show: false,
    title: t('font.title'),
    parent: settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible() ? settingsWin : undefined,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  fontWin.setMenuBarVisibility(false);
  secureWindow(fontWin);

  fontWin.on('closed', () => { fontWin = null; });

  await fontWin.loadFile(path.join(RENDERER, 'font.html'));
  fontWin.show();
  fontWin.focus();
}

async function openHistory(recordId = '') {
  if (historyWin && !historyWin.isDestroyed()) {
    historyWin.show();
    historyWin.focus();
    if (recordId) historyWin.webContents.send('history:show-record', { id: recordId });
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const width = Math.min(940, area.width - 24);
  const height = Math.min(680, area.height - 24);
  historyWin = new BrowserWindow({
    width,
    height,
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    minWidth: Math.min(760, area.width - 24),
    minHeight: Math.min(540, area.height - 24),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    skipTaskbar: false,
    show: false,
    title: t('history.title'),
    parent: settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible() ? settingsWin : undefined,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  historyWin.setMenuBarVisibility(false);
  secureWindow(historyWin);

  historyWin.on('closed', () => { historyWin = null; history.release(); });

  await historyWin.loadFile(path.join(RENDERER, 'history.html'));
  historyWin.show();
  historyWin.focus();
  if (recordId) {
    setTimeout(() => {
      if (historyWin && !historyWin.isDestroyed()) {
        historyWin.webContents.send('history:show-record', { id: recordId });
      }
    }, 350);
  }
}

async function openSettings(firstRun = false) {
  if (firstRun) settingsFirstRun = true;
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }

  const settingsDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const settingsArea = settingsDisplay.workArea;
  const settingsWidth = Math.min(780, settingsArea.width - 24);
  const settingsHeight = Math.min(760, settingsArea.height - 24);
  settingsWin = new BrowserWindow({
    width: settingsWidth,
    height: settingsHeight,
    x: settingsArea.x + Math.round((settingsArea.width - settingsWidth) / 2),
    y: settingsArea.y + Math.round((settingsArea.height - settingsHeight) / 2),
    minWidth: Math.min(660, settingsArea.width - 24),
    minHeight: Math.min(600, settingsArea.height - 24),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    show: false,
    title: t('settings.title'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  settingsWin.setMenuBarVisibility(false);
  secureWindow(settingsWin);

  settingsWin.on('hide', stopHotkeyRecording);
  settingsWin.on('closed', () => { stopHotkeyRecording(); settingsWin = null; });

  await settingsWin.loadFile(path.join(RENDERER, 'settings.html'));
  settingsWin.show();
  settingsWin.focus();
  setTimeout(() => {
    if (!settingsWin || settingsWin.isDestroyed()) return;
    settingsWin.webContents.executeJavaScript(
      "document.querySelector('.scroll-body')?.scrollTo(0, 0);"
    ).catch(() => {});
  }, 320);
}

function applyLoginItem(config) {
  if (!app.isPackaged) return;
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(config.autoLaunch),
      path: process.execPath,
      args: []
    });
  } catch (err) {
    log('login item failed', err.message);
  }
}

function stopHotkeyRecording() {
  if (!recordingTimer) return;
  clearTimeout(recordingTimer); recordingTimer = null;
  registerHotkey(store.getConfig().hotkey);
}
function registerHotkey(accel) {
  globalShortcut.unregisterAll();
  hotkeyOk = false;
  const candidates = [accel, 'Ctrl+Alt+Q', 'Ctrl+Shift+Space'].filter((item, index, arr) => item && arr.indexOf(item) === index);
  for (const candidate of candidates) {
    try {
      if (globalShortcut.register(candidate, () => startSelection())) {
        hotkey = candidate;
        hotkeyOk = true;
        break;
      }
    } catch (err) {
      log('hotkey failed', candidate, err.message);
    }
  }
  for (const [accelerator, handler] of [
    ['Alt+Shift+Q', () => startMultiSelection()],
    ['Alt+T', () => startTranslationSelection()]
  ]) {
    try { globalShortcut.register(accelerator, handler); } catch (err) { log('extra hotkey failed', accelerator, err.message); }
  }
  refreshTray();
  if (!hotkeyOk) {
    log('no global hotkey available');
    notify(t('notify.hotkeyTaken.title'), t('notify.hotkeyTaken.body'));
  } else if (hotkey !== accel) {
    notify(t('notify.hotkeyAdjusted.title'), t('notify.hotkeyAdjusted.body', { wanted: accel, actual: hotkey }));
  }
  refreshBubble();
}

function applySettings() {
  const config = store.getConfig();
  registerHotkey(config.hotkey);
  applyLoginItem(config);
  if (config.showBubble) refreshBubble();
  else if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
  refreshTray();
}

function settingsPayload() {
  const config = store.getConfig();
  return {
    ...store.publicSettings(),
    firstRun: settingsFirstRun || !config.onboarded,
    hotkeyOk,
    actualHotkey: hotkey,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged
  };
}

function draftConfig(patch) {
  const base = store.getConfig();
  const draft = { ...base };
  const stringFields = ['provider', 'baseUrl', 'model', 'searchProvider', 'searxngUrl'];
  for (const field of stringFields) {
    if (typeof patch[field] === 'string') draft[field] = patch[field].trim();
  }
  if (typeof patch.temperature !== 'undefined') {
    const n = Number(patch.temperature);
    draft.temperature = Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : base.temperature;
  }
  if (typeof patch.maxTokens !== 'undefined') {
    const n = Number(patch.maxTokens);
    draft.maxTokens = Number.isFinite(n) ? Math.round(Math.min(8000, Math.max(128, n))) : base.maxTokens;
  }
  for (const field of ['vision', 'webEnabled', 'showBubble', 'autoLaunch']) {
    if (typeof patch[field] === 'boolean') draft[field] = patch[field];
  }
  if (patch.clearApiKey === true) draft.apiKey = '';
  else if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) draft.apiKey = patch.apiKey.trim();
  return draft;
}

/* ------------------------------------------------------------------ */
/* IPC                                                                */
/* ------------------------------------------------------------------ */

ipcMain.on('app:start-selection', () => startSelection());
ipcMain.on('app:start-multi-selection', () => startMultiSelection());
ipcMain.on('app:start-translation', () => startTranslationSelection());
ipcMain.on('app:settings', () => openSettings(false));
ipcMain.on('app:bubble-menu', () => {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  buildTrayMenu().popup({ window: bubbleWin });
});
ipcMain.on('app:quit', () => { isQuitting = true; app.quit(); });
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  hotkey,
  hotkeyOk,
  isPackaged: app.isPackaged,
  userData: app.getPath('userData'),
  configFile: store.getConfigPath(),
  onboarded: store.getConfig().onboarded
}));
ipcMain.handle('app:open-external', (_event, url) => openExternal(url));
ipcMain.handle('app:language', () => store.getConfig().language);
ipcMain.handle('app:set-language', (_event, language) => {
  try {
    store.save({ language: normalizeLocale(language) }); broadcastLanguage();
    return { ok: true };
  } catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('app:copy', (_event, text) => {
  try { clipboard.writeText(String(text || '').slice(0, 100000)); return true; } catch { return false; }
});
ipcMain.handle('app:read-clipboard', () => {
  try { return clipboard.readText().slice(0, 10000); } catch { return ''; }
});

ipcMain.on('selection:finish', (_event, rect) => handleSelectionRect(rect));
ipcMain.on('selection:cancel', () => cancelSelection());

ipcMain.on('result:close', () => hideResult());
ipcMain.on('result:pin', (_event, value) => {
  pinned = Boolean(value);
  if (resultWin && !resultWin.isDestroyed()) resultWin.setAlwaysOnTop(pinned, 'screen-saver');
});
ipcMain.handle('session:state', () => ({
  init: resultState ? { ...resultState, selectionText: session?.selectionText || resultState.selectionText, messages: session?.history || [], sources: session?.pendingSources || [] } : null,
  busy: Boolean(session?.busy),
  pinned,
  webEnabled: Boolean(session?.webEnabled)
}));

ipcMain.on('session:ask', (_event, question) => { handleAsk(question); });
ipcMain.on('session:stop', () => {
  if (session?.abort) {
    session.abort.abort();
    session.busy = false;
    sendResult({ type: 'stopped' });
  }
});
ipcMain.on('session:retry', () => { retryLast(); });
ipcMain.on('session:regenerate', () => { retryLast(); });
ipcMain.on('session:add-shot', () => { if (session) startMultiSelection(); });
ipcMain.on('translate:retry', (_event, target) => { if (translationState) translateCurrent(target); });
ipcMain.on('translate:search', (_event, text) => { searchTranslation(text); });
ipcMain.on('translate:close', () => {
  if (translationState?.abort) translationState.abort.abort();
  translationState = null;
  if (translateWin && !translateWin.isDestroyed()) translateWin.hide();
  refreshBubble();
});
ipcMain.on('session:web', (_event, enabled) => {
  if (session) session.webEnabled = Boolean(enabled);
});
ipcMain.on('session:manual', async (_event, text) => {
  const value = String(text || '').trim().slice(0, 6000);
  if (!value || !session) return;
  if (session.abort) session.abort.abort();
  // Replacing the captured content starts a new conversation. Invalidate any
  // old OCR, search or stream callback before changing the shared session.
  const id = ++sessionCounter;
  session.id = id;
  session.historyId = null;
  session.historyDeleted = false;
  session.abort = null;
  session.busy = false;
  session.selectionText = value;
  session.manual = true;
  session.imageDataUrl = null;
  session.vision = false;
  session.history = [];
  session.sources = [];
  session.pendingSources = [];
  session.systemContext = buildSystemContext({ selection: value, windowInfo: session.windowInfo, sources: [] });
  sendResult({ type: 'manual-ack', text: value });
  await delay(60);
  if (!session || session.id !== id) return;
  startInitial();
});

ipcMain.handle('fonts:list', async () => {
  const result = await listSystemFonts();
  return { ...result, current: fontPayload() };
});
ipcMain.handle('font:get', () => fontPayload());
ipcMain.handle('font:import', async () => {
  try {
    const options = {
      title: t('font.fileTitle'),
      properties: ['openFile'],
      filters: [{ name: t('font.fileFilter'), extensions: ['ttf', 'otf', 'ttc', 'woff', 'woff2'] }]
    };
    const result = fontWin
      ? await dialog.showOpenDialog(fontWin, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths?.length) return { ok: false, canceled: true };

    const source = result.filePaths[0];
    const ext = path.extname(source).toLowerCase();
    if (!FONT_EXTENSIONS.has(ext)) {
      return { ok: false, message: t('font.fileTypeError') };
    }
    const stat = fs.statSync(source);
    if (stat.size > 40 * 1024 * 1024) {
      return { ok: false, message: t('font.fileSizeError') };
    }

    const oldFile = store.getConfig().customFontFile;
    const fileName = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dest = path.join(fontDir(), fileName);
    fs.copyFileSync(source, dest);
    const displayName = path.basename(source, ext).slice(0, 80);

    store.save({
      fontFamily: 'custom',
      customFontFile: fileName,
      customFontName: displayName
    });
    if (oldFile && oldFile !== fileName) {
      try { fs.unlinkSync(path.join(fontDir(), oldFile)); } catch { /* ignore */ }
    }
    broadcastFont();
    return { ok: true, font: fontPayload(), name: displayName };
  } catch (err) {
    return { ok: false, message: err.message || t('font.importFailed') };
  }
});
ipcMain.handle('font:apply', (_event, patch) => {
  try {
    const saved = store.save({
      fontFamily: typeof patch?.family === 'string' ? patch.family : undefined,
      fontSize: patch?.size,
      lineHeight: patch?.lineHeight,
      fontScope: patch?.scope === 'reading' ? 'reading' : 'all'
    });
    broadcastFont();
    return { ok: true, font: fontPayload(), settings: saved };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});
ipcMain.on('font:open', () => { openFontWindow(); });
ipcMain.on('font:close', () => {
  if (fontWin && !fontWin.isDestroyed()) fontWin.close();
});

ipcMain.handle('hotkey:recording', (_event, enabled) => {
  if (enabled) {
    clearTimeout(recordingTimer); globalShortcut.unregisterAll();
    recordingTimer = setTimeout(stopHotkeyRecording, 30000);
  } else stopHotkeyRecording();
  return true;
});
ipcMain.handle('updates:state', () => updater?.getState());
ipcMain.handle('updates:check', () => updater?.check());
ipcMain.handle('updates:download', () => updater?.download());
ipcMain.handle('updates:install', async () => {
  const result = await updater?.install();
  if (result?.ok) { isQuitting = true; setTimeout(() => app.quit(), 350); }
  return result;
});
ipcMain.handle('settings:test-profile', async (_event, { task, patch } = {}) => {
  if (!TASKS.includes(task)) return { ok: false, message: t('models.invalid') };
  const base = draftConfig(patch || {});
  const p = patch?.modelProfiles?.[task] || {};
  const old = store.getConfig().modelProfiles[task];
  base.modelProfiles = { [task]: { ...old, ...p, enabled: true, apiKey: p.clearApiKey ? '' : p.apiKey || old.apiKey } };
  const config = resolveModel(base, task, false);
  // A connection test validates the chosen endpoint and model; no screenshots are sent.
  try { const error = configError(config); if (error) return { ok: false, ...error }; return { ok: true, ...await testConnection(config) }; }
  catch (error) { return { ok: false, message: error.message, hint: error.hint }; }
});
ipcMain.handle('settings:get', () => settingsPayload());
ipcMain.handle('settings:save', (_event, patch) => {
  try {
    stopHotkeyRecording();
    if (typeof patch?.hotkey === 'string') {
      const candidate = normalizeHotkey(patch.hotkey);
      if (!candidate) throw new Error(t('hotkey.invalid'));
      if (!globalShortcut.isRegistered(candidate)) {
        if (!globalShortcut.register(candidate, () => startSelection())) throw new Error(t('hotkey.taken'));
        globalShortcut.unregister(candidate);
      }
    }
    const nextDraft = draftConfig(patch || {});
    for (const task of TASKS) {
      const p = patch?.modelProfiles?.[task];
      if (!p?.enabled) continue;
      const old = store.getConfig().modelProfiles[task];
      const config = { ...nextDraft, model: p.model || nextDraft.model };
      if (p.customService) Object.assign(config, { baseUrl: p.baseUrl, apiKey: p.clearApiKey ? '' : p.apiKey || old.apiKey });
      if (!/^https?:\/\//i.test(config.baseUrl || '')) throw new Error(t('settings.validateBaseUrl'));
      const deletingKey = p.customService ? p.clearApiKey === true : patch.clearApiKey === true;
      const error = configError(config);
      // Clearing credentials is a valid saved state even if it temporarily
      // makes an enabled task unavailable. Requests still validate before use.
      if (error && !(deletingKey && config.baseUrl && config.model && !config.apiKey)) throw new Error(error.message);
    }
    const prevLanguage = store.getConfig().language;
    const saved = store.save(patch && typeof patch === 'object' ? patch : {});
    store.markOnboarded();
    settingsFirstRun = false;
    applySettings();
    if (store.getConfig().language !== prevLanguage) broadcastLanguage();
    return { ok: true, settings: { ...saved, hotkeyOk, actualHotkey: hotkey } };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});
ipcMain.handle('settings:test', async (_event, patch) => {
  const draft = draftConfig(patch && typeof patch === 'object' ? patch : {});
  if (!draft.apiKey && !isLocalBaseUrl(draft.baseUrl)) {
    return { ok: false, message: t('settings.testNeedKey'), hint: t('settings.welcomeNote') };
  }
  try {
    const result = await testConnection(draft);
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AIError) {
      return {
        ok: false,
        message: err.message,
        hint: err.hint,
        detail: String(err.detail || '').slice(0, 600),
        status: err.status
      };
    }
    return { ok: false, message: err.message || t('ai.network') };
  }
});
ipcMain.on('settings:close', () => {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
  refreshBubble();
});

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

ipcMain.handle('history:resume', async (_event, id) => {
  try {
    const record = history.get(String(id || ''));
    if (!record || !record.messages?.length) return { ok: false, message: t('history.resumeFailed') };
    if (session?.abort) session.abort.abort();
    const config = store.getConfig();
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const area = display.workArea;
    const screenRect = { x: area.x + Math.round(area.width / 2), y: area.y + 50, width: 0, height: 0 };
    session = {
      id: ++sessionCounter, historyId: record.id,
      selectionText: record.selectionText || '', windowInfo: { title: record.windowTitle || '', process: record.process || '' },
      imageDataUrl: null, previewDataUrl: '', vision: false,
      webEnabled: Boolean(config.webEnabled), sources: record.sources || [], pendingSources: record.sources || [],
      history: record.messages, lastQuestion: '', lastAnswerComplete: true,
      manual: record.source === 'manual', busy: false, abort: null, display, screenRect,
      createdAt: record.createdAt
    };
    session.systemContext = buildSystemContext({ selection: session.selectionText, windowInfo: session.windowInfo, sources: session.sources });
    await showResult({ selectionText: session.selectionText, windowInfo: session.windowInfo, preview: '', vision: false,
      webEnabled: session.webEnabled, provider: config.provider, providerLabel: PRESETS[config.provider]?.label || config.provider,
      model: config.model, hasApiKey: Boolean(config.apiKey) || isLocalBaseUrl(config.baseUrl), hotkey, pinned,
      font: fontPayload(), status: 'history', messages: record.messages, sources: record.sources || [] }, screenRect, display);
    if (historyWin && !historyWin.isDestroyed()) {
      const closedHistory = historyWin; closedHistory.hide();
      setTimeout(() => { if (!closedHistory.isDestroyed() && !closedHistory.isVisible()) closedHistory.close(); }, 100);
    }
    return { ok: true };
  } catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:list', (_event, options) => {
  try { return { ok: true, records: history.list({ query: String(options?.query || '').slice(0, 2000), favorites: Boolean(options?.favorites) }) }; }
  catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:get', (_event, id) => {
  try { return { ok: true, record: history.get(String(id || '')) }; }
  catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:favorite', (_event, { id, favorite }) => {
  try { const ok = history.setFavorite(String(id || ''), Boolean(favorite)); broadcastHistory(); return { ok }; }
  catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:delete', (_event, id) => {
  try { const key = String(id || ''); const ok = history.remove(key); if (session?.historyId === key) session.historyDeleted = true; broadcastHistory(); return { ok }; }
  catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:clear', (_event, keepFavorites) => {
  try { const removed = history.clear(keepFavorites !== false); if (session?.historyId && !history.get(session.historyId)) session.historyDeleted = true; broadcastHistory(); return { ok: true, removed }; }
  catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.on('history:open', () => { openHistory(); });
ipcMain.on('history:close', () => {
  if (historyWin && !historyWin.isDestroyed()) historyWin.close();
});


/* ------------------------------------------------------------------ */
/* App lifecycle                                                      */
/* ------------------------------------------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.show();
      settingsWin.focus();
    } else {
      refreshBubble();
      openSettings(false);
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.floatask.app');
    store.load();
    protocol.handle('floatask-font', handleFontProtocol);
    updater = createUpdater({ app, onState: state => {
      if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('updates:state', state);
      if (state.phase === 'available' && state.available.version !== lastNotifiedUpdate) {
        lastNotifiedUpdate = state.available.version;
        notify(t('update.title'), t('update.available', { version: state.available.version }));
      }
    } });
    if (app.isPackaged) {
      const autoCheck = () => { if (store.getConfig().autoCheckUpdates) updater.check(); };
      setTimeout(autoCheck, 10000).unref();
      setInterval(autoCheck, 6 * 60 * 60 * 1000).unref();
    }
    cleanupCustomFonts();
    try {
      const tmp = path.join(app.getPath('userData'), 'tmp');
      fs.mkdirSync(tmp, { recursive: true });
      for (const file of fs.readdirSync(tmp)) {
        if (/^capture-.*\.png$/i.test(file)) {
          try { fs.unlinkSync(path.join(tmp, file)); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore cleanup errors */ }
    createTray();
    applySettings();
    const config = store.getConfig();
    if (!config.onboarded) {
      setTimeout(() => openSettings(true), 450);
    } else if (process.argv.includes('--select')) {
      setTimeout(() => startSelection(), 400);
    }
    log('ready', { version: app.getVersion(), hotkey, hotkeyOk, provider: config.provider });
  }).catch((err) => {
    log('startup failed', err.stack || err.message);
  });

  app.on('window-all-closed', (event) => {
    event.preventDefault();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (session?.abort) session.abort.abort();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (tray && !tray.isDestroyed()) tray.destroy();
  });
}

process.on('uncaughtException', (err) => {
  log('uncaughtException', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  log('unhandledRejection', reason?.stack || reason);
});
