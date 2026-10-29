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
    x: area.x + area.width - 148,
    y: area.y + Math.round(area.height * 0.52)
  };
}

function clampBubblePosition(x, y) {
  const displays = screen.getAllDisplays();
  const display = screen.getDisplayNearestPoint({ x, y }) || displays[0];
  const area = display.workArea;
  return {
    x: Math.round(Math.min(Math.max(x, area.x + 4), area.x + area.width - 136)),
    y: Math.round(Math.min(Math.max(y, area.y + 4), area.y + area.height - 52))
  };
}

async function ensureBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) return bubbleWin;
  if (bubbleCreating) return bubbleCreating;

  bubbleCreating = (async () => {
  bubbleWin = new BrowserWindow({
    width: 132,
    height: 48,
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

async function startSelection() {
  if (isQuitting) return;
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.focus();
    return;
  }
  if (resultWin && !resultWin.isDestroyed() && resultWin.isVisible()) hideResult();

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
  closeOverlay();
  handleSelection(display, clamped);
}

async function handleSelection(display, rect) {
  if (session?.abort) session.abort.abort();
  session = null;
  resultState = null;

  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide();
  if (resultWin && !resultWin.isDestroyed()) resultWin.hide();

  await delay(140);

  const contextPromise = getForegroundInfo(process.pid);
  let capture = null;
  let captureError = null;
  try {
    capture = await captureRegion(display, rect);
  } catch (err) {
    captureError = err;
    log('capture failed', err.message);
  }

  const screenRect = {
    x: display.bounds.x + rect.x,
    y: display.bounds.y + rect.y,
    width: rect.width,
    height: rect.height
  };

  const config = store.getConfig();
  const id = ++sessionCounter;
  session = {
    id,
    selectionText: '',
    windowInfo: {},
    imageDataUrl: capture?.visionDataUrl || null,
    previewDataUrl: capture?.previewDataUrl || '',
    vision: Boolean(config.vision && capture),
    webEnabled: Boolean(config.webEnabled),
    sources: [],
    pendingSources: [],
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
  sendResult({
    type: 'ocr',
    text: ocr.text,
    error: ocr.error,
    lang: ocr.lang || '',
    empty: !ocr.text
  });

  try {
    session.windowInfo = await contextPromise;
  } catch (err) {
    log('foreground info failed', err.message);
    session.windowInfo = {};
  }
  if (!session || session.id !== id) return;
  sendResult({ type: 'context', windowInfo: session.windowInfo });

  const hasModelAccess = Boolean(store.getConfig().apiKey) || isLocalBaseUrl(store.getConfig().baseUrl);
  if (!hasModelAccess) {
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

async function showResult(payload, screenRect, display) {
  const win = await ensureResultWindow();
  if (!win || win.isDestroyed()) return;
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
  if (resultWin && !resultWin.isDestroyed()) resultWin.hide();
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

function broadcastHistory() {
  if (historyWin && !historyWin.isDestroyed()) historyWin.webContents.send('history:update');
}

function saveHistoryIfNeeded() {
  if (!session || !session.history?.length) return;
  if (!store.getConfig().saveHistory || session.historyDeleted) return;
  try {
    const config = store.getConfig();
    history.record(session, { model: config.model, provider: config.provider });
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

async function startInitial() {
  if (!session) return;
  const id = session.id;
  const config = store.getConfig();
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
  await runStream({ messages, mode: 'initial', question: '', webNote, controller: requestController });
}

async function handleAsk(rawQuestion) {
  if (!session) return;
  const question = String(rawQuestion || '').trim().slice(0, 3000);
  if (!question) return;
  if (session.busy) return;

  const config = store.getConfig();
  const error = configError(config);
  if (error) {
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
  await runStream({ messages, mode: 'followup', question, webNote, controller: requestController });
}

async function runStream({ messages, mode, question, webNote, retriedWithoutImage = false, controller = new AbortController() }) {
  if (!session) return;
  const id = session.id;
  const config = store.getConfig();
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
      mode === 'initial' &&
      Boolean(session.imageDataUrl) &&
      (err.status === 400 || /image|vision|multimodal|content.*type/i.test(`${err.message} ${err.detail}`));

    if (canRetryWithoutImage) {
      session.busy = false;
      session.abort = null;
      session.vision = false;
      sendResult({ type: 'notice', code: 'vision-fallback', message: t('main.visionFallback') });
      const fallbackMessages = buildInitialMessages({
        selection: session.selectionText,
        windowInfo: session.windowInfo,
        sources: session.pendingSources || [],
        image: null,
        vision: false,
        manual: session.manual
      });
      await runStream({
        messages: fallbackMessages,
        mode: 'initial',
        question: '',
        webNote,
        retriedWithoutImage: true
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
    if (!fontWin.isVisible()) {
      try { await fontWin.loadFile(path.join(RENDERER, 'font.html')); } catch (err) { log('font reload failed', err.message); }
    }
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
  fontWin.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    fontWin.hide();
  });
  fontWin.on('closed', () => { fontWin = null; });

  await fontWin.loadFile(path.join(RENDERER, 'font.html'));
  fontWin.show();
  fontWin.focus();
}

async function openHistory(recordId = '') {
  if (historyWin && !historyWin.isDestroyed()) {
    if (!historyWin.isVisible()) {
      try {
        await historyWin.loadFile(path.join(RENDERER, 'history.html'));
      } catch (err) {
        log('history reload failed', err.message);
      }
    }
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
  historyWin.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    historyWin.hide();
  });
  historyWin.on('closed', () => { historyWin = null; });

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
    if (!settingsWin.isVisible()) {
      try {
        await settingsWin.loadFile(path.join(RENDERER, 'settings.html'));
      } catch (err) {
        log('settings reload failed', err.message);
      }
    }
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
  settingsWin.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    settingsWin.hide();
  });
  settingsWin.on('closed', () => { settingsWin = null; });

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
  if (fontWin && !fontWin.isDestroyed()) fontWin.hide();
});

ipcMain.handle('settings:get', () => settingsPayload());
ipcMain.handle('settings:save', (_event, patch) => {
  try {
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
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.hide();
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
    if (historyWin && !historyWin.isDestroyed()) historyWin.hide();
    return { ok: true };
  } catch (err) { return { ok: false, message: err.message }; }
});
ipcMain.handle('history:list', () => {
  try { return { ok: true, records: history.list() }; }
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
  if (historyWin && !historyWin.isDestroyed()) historyWin.hide();
});
ipcMain.on('history:copy', (_event, text) => {
  try { clipboard.writeText(String(text || '').slice(0, 200000)); } catch { /* ignore */ }
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
    history.load();
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
