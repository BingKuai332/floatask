'use strict';

const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);

const els = {
  messages: document.getElementById('messages'),
  termLabel: document.getElementById('termLabel'),
  sessionHash: document.getElementById('sessionHash'),
  termMeta: document.getElementById('termMeta'),
  loadingCard: document.getElementById('loadingCard'),
  loadingText: document.getElementById('loadingText'),
  statusPill: document.getElementById('statusPill'),
  statusText: document.getElementById('statusText'),
  contextStrip: document.querySelector('.context-strip'),
  contextToggle: document.getElementById('contextToggle'),
  contextPanel: document.getElementById('contextPanel'),
  contextTitle: document.getElementById('contextTitle'),
  contextMeta: document.getElementById('contextMeta'),
  modelChip: document.getElementById('modelChip'),
  previewWrap: document.getElementById('previewWrap'),
  previewImg: document.getElementById('previewImg'),
  ocrText: document.getElementById('ocrText'),
  ocrEditArea: document.getElementById('ocrEditArea'),
  ocrEditBtn: document.getElementById('ocrEditBtn'),
  ocrRevertBtn: document.getElementById('ocrRevertBtn'),
  ocrCorrectedBadge: document.getElementById('ocrCorrectedBadge'),
  visionAttachmentNote: document.getElementById('visionAttachmentNote'),
  copyOcrBtn: document.getElementById('copyOcrBtn'),
  windowInfo: document.getElementById('windowInfo'),
  pinBtn: document.getElementById('pinBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeBtn: document.getElementById('closeBtn'),
  newSelectBtn: document.getElementById('newSelectBtn'),
  manualPanel: document.getElementById('manualPanel'),
  manualInput: document.getElementById('manualInput'),
  manualPasteBtn: document.getElementById('manualPasteBtn'),
  manualSubmitBtn: document.getElementById('manualSubmitBtn'),
  quickRow: document.getElementById('quickRow'),
  webToggle: document.getElementById('webToggle'),
  questionInput: document.getElementById('questionInput'),
  sendBtn: document.getElementById('sendBtn'),
  visionHint: document.getElementById('visionHint'),
  toast: document.getElementById('toast'),
  followBtn: document.getElementById('followBtn'),
  liveRegion: document.getElementById('liveRegion'),
  expandBtn: document.getElementById('expandBtn'),
  lightbox: document.getElementById('lightbox'),
  lightboxImg: document.getElementById('lightboxImg')
};

const md = window.FloatAskMarkdown;

function applyReadingFont(font) {
  const size = Math.min(24, Math.max(10, Number(font?.size) || 12.8));
  const line = Math.min(2.4, Math.max(1.2, Number(font?.lineHeight) || 1.72));
  window.FloatAskFont.apply(font, { reading: true, ui: true });
  const root = document.documentElement;
  root.style.setProperty('--reading-size', `${size}px`);
  root.style.setProperty('--reading-line', String(line));
  root.dataset.density = line < 1.6 ? 'compact' : (line > 1.95 ? 'relaxed' : 'standard');
}

const state = {
  historyId: null,
  latencyMs: null,
  selectionText: '',
  ocrRaw: '',
  ocrCorrected: null,
  ocrEditing: false,
  windowInfo: {},
  preview: '',
  shotCount: 1,
  vision: false,
  webEnabled: true,
  providerLabel: '',
  model: '',
  hasApiKey: true,
  pinned: true,
  streaming: false,
  busy: false,
  currentAnswer: '',
  lastUserQuestion: '',
  pendingSources: [],
  currentHasSources: false,
  phaseEl: null,
  current: null,
  errorEl: null,
  toastTimer: null,
  renderQueued: false
};

function escapeHtml(value) {
  return md.escapeHtml(value);
}

function truncate(text, length = 56) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > length ? value.slice(0, length - 1) + '…' : value;
}

// Announce completion, errors and recovery to screen readers. The same
// message never repeats within the throttle window, and language refresh of
// an unchanged status kind stays silent.
let lastAnnounce = { text: '', at: 0 };
function announceStatus(kind) {
  const key = { done: 'result.announceDone', error: 'result.announceError', stopped: 'result.announceStopped' }[kind];
  if (!key) return;
  const text = tt(key);
  const now = Date.now();
  if (text === lastAnnounce.text && now - lastAnnounce.at < 1500) return;
  lastAnnounce = { text, at: now };
  els.liveRegion.textContent = text;
}

function setStatus(kind, text) {
  if (state.statusKind !== kind) announceStatus(kind);
  els.statusPill.className = `status-pill ${kind}`;
  els.statusText.textContent = text;
  state.statusKind = kind;
  state.statusKey = Object.entries(window.FloatAskI18N.LOCALES[window.FloatAskI18n.language]).find(([key,value]) => key.startsWith('result.') && value === text)?.[0];
}

function toast(message, error = false) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show${error ? ' error' : ''}`;
  state.toastTimer = setTimeout(() => {
    els.toast.className = 'toast';
  }, 2800);
}

// Stream follow: only chase the tail while the reader is at the bottom.
// Scrolling up pauses following and surfaces the "back to bottom" action.
const follow = { pinned: true };

function atBottom() {
  const distance = els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight;
  return distance < 24;
}

function updateFollowButton() {
  els.followBtn.hidden = follow.pinned;
}

function scrollToBottomIfPinned() {
  // A re-created answer card must not yank the viewport while the user is
  // reading up; the follow button keeps the resume affordance instead.
  if (follow.pinned) scrollToBottom(true);
  else updateFollowButton();
}

// Programmatic tail jumps are instant: the stylesheet's smooth scrolling would
// emit intermediate scroll events that read as "the user scrolled up" and
// silently unpin the follow mid-stream.
function jumpToTail() {
  els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: 'instant' });
}

// wasAtBottom must be measured before the caller grows the content: one
// streamed render can add more than the 24 px tolerance, and measuring after
// it would read the reader as "scrolled up" although they never moved, so
// following stopped for good with no scroll event to recover.
function scrollToBottom(force = false, wasAtBottom = atBottom()) {
  if (force) follow.pinned = true;
  // The pinned flag can be stale for one event-loop turn after the user
  // scrolls up (the scroll event has not been delivered yet); only follow
  // when the viewport was genuinely at the bottom.
  if (force || (follow.pinned && wasAtBottom)) jumpToTail();
  updateFollowButton();
}

els.messages.addEventListener('scroll', () => {
  if (atBottom() && !follow.pinned) {
    follow.pinned = true;
    updateFollowButton();
  } else if (!atBottom() && follow.pinned) {
    follow.pinned = false;
    updateFollowButton();
  }
});

els.followBtn.addEventListener('click', () => {
  follow.pinned = true;
  jumpToTail();
  updateFollowButton();
});

function autoResize() {
  els.questionInput.style.height = 'auto';
  els.questionInput.style.height = `${Math.min(96, els.questionInput.scrollHeight)}px`;
}

function setBusyUI(busy) {
  state.busy = Boolean(busy);
  els.sendBtn.classList.toggle('streaming', state.busy);
  els.sendBtn.title = state.busy ? tt('result.stopGeneration') : tt('result.send');
  for (const chip of els.quickRow.querySelectorAll('button')) {
    chip.disabled = state.busy;
  }
}

function updateWebToggle() {
  els.webToggle.classList.toggle('on', state.webEnabled);
  els.webToggle.setAttribute('aria-pressed', state.webEnabled ? 'true' : 'false');
  els.webToggle.title = state.webEnabled ? tt('result.webOn') : tt('result.webOff');
}

function updateVisionHint() {
  if (state.vision) {
    els.visionHint.textContent = tt('result.visionAttached');
    els.visionHint.classList.add('active');
  } else if (!state.hasApiKey) {
    els.visionHint.textContent = tt('result.noModel');
    els.visionHint.classList.remove('active');
  } else {
    els.visionHint.textContent = '';
    els.visionHint.classList.remove('active');
  }
}

function updateContext() {
  const title = state.windowInfo?.title || state.windowInfo?.process ||
    (state.selectionText ? tt('result.screenSelection') : tt('result.screenSelection'));
  els.contextTitle.textContent = truncate(title, 58);
  els.contextTitle.title = title;

  if (state.selectionText) {
    const chars = state.selectionText.replace(/\s+/g, '').length;
    const prefix = state.shotCount > 1 ? `${state.shotCount} 张 · ` : '';
    els.contextMeta.textContent = prefix + tt('result.charCount', { n: chars });
  } else {
    els.contextMeta.textContent = '';
  }

  const parts = [];
  if (state.windowInfo?.title) parts.push(state.windowInfo.title);
  if (state.windowInfo?.process) parts.push(state.windowInfo.process);
  if (parts.length) {
    els.windowInfo.innerHTML = escapeHtml(tt('result.sourceFrom', { text: parts.join(' · ') }));
  } else {
    els.windowInfo.textContent = tt('result.sourceScreen');
  }
  updateTermLabels();
}

function updateTermLabels() {
  const turns = els.messages.querySelectorAll('.message:not(.user)').length;
  els.termLabel.textContent = `fa.term // node-${String(Math.max(1, turns)).padStart(2, '0')}`;
  els.sessionHash.textContent = window.FloatAskShortHash.shortHash(state.historyId);
  const process = state.windowInfo?.process || '';
  const chars = state.selectionText ? state.selectionText.replace(/\s+/g, '').length : 0;
  const latency = Number.isFinite(state.latencyMs) ? `${(state.latencyMs / 1000).toFixed(2)}s` : '--';
  els.termMeta.textContent = [process && `src: ${process}`, `ocr ${chars} ch`, `lat ${latency}`].filter(Boolean).join(' | ');
}

function setPreview(dataUrl) {
  state.preview = dataUrl || '';
  if (state.preview) {
    els.previewImg.src = state.preview;
    els.previewWrap.hidden = false;
  } else {
    els.previewWrap.hidden = true;
    els.previewImg.removeAttribute('src');
  }
}

function setOcr(text, error) {
  state.selectionText = text || '';
  if (text) {
    els.ocrText.textContent = text;
    els.ocrText.dataset.empty = '0';
  } else if (error) {
    els.ocrText.textContent = tt('result.ocrFailed', { err: error });
    els.ocrText.dataset.empty = '1';
  } else {
    els.ocrText.textContent = tt('result.manualTitleNone');
    els.ocrText.dataset.empty = '1';
  }
  updateContext();
}

function setModelChip() {
  const text = state.model || state.providerLabel || tt('common.model');
  els.modelChip.textContent = truncate(text, 20);
  els.modelChip.title = [state.providerLabel, state.model].filter(Boolean).join(' · ');
}

function hideLoading() {
  if (els.loadingCard && els.loadingCard.parentNode) els.loadingCard.remove();
}

function showLoading(text) {
  els.loadingText.textContent = text || tt('result.readingScreen');
  if (!els.loadingCard.parentNode) {
    els.messages.appendChild(els.loadingCard);
  }
  scrollToBottom(true);
}

function hidePhase() {
  if (state.phaseEl && state.phaseEl.parentNode) state.phaseEl.remove();
  state.phaseEl = null;
}

function showPhase(text) {
  const wasAtBottom = atBottom();
  if (!state.phaseEl) {
    state.phaseEl = document.createElement('div');
    state.phaseEl.className = 'phase-line';
    state.phaseEl.innerHTML = '<span class="spinner"></span><span class="phase-text"></span>';
    els.messages.appendChild(state.phaseEl);
  }
  state.phaseEl.querySelector('.phase-text').textContent = text;
  scrollToBottom(false, wasAtBottom);
}

function clearError() {
  if (state.errorEl && state.errorEl.parentNode) state.errorEl.remove();
  state.errorEl = null;
}

function addUserMessage(text) {
  const message = document.createElement('div');
  message.className = 'message user';
  const bubble = document.createElement('div');
  bubble.className = 'user-bubble';
  bubble.textContent = text;
  message.appendChild(bubble);
  els.messages.appendChild(message);
  state.lastUserQuestion = text;
  scrollToBottom(true);
}

function createAssistant() {
  if (state.current) return state.current;

  const message = document.createElement('div');
  message.className = 'message assistant';
  message.innerHTML = `
    <div class="avatar">✦</div>
    <div class="assistant-body">
      <div class="assistant-name">${escapeHtml(tt('common.appName'))} <span class="time" data-i18n="result.answering">${tt('result.answering')}</span></div>
      <div class="md-body streaming"></div>
      <div class="sources" hidden></div>
      <div class="msg-actions"></div>
    </div>`;

  const current = {
    message,
    body: message.querySelector('.assistant-body'),
    content: message.querySelector('.md-body'),
    sources: message.querySelector('.sources'),
    actions: message.querySelector('.msg-actions'),
    time: message.querySelector('.time')
  };
  state.current = current;
  els.messages.appendChild(message);
  scrollToBottomIfPinned();
  return current;
}

function renderCurrent(force = false) {
  if (!state.current) return;
  const wasAtBottom = atBottom();
  state.current.content.innerHTML = md.render(state.currentAnswer || '');
  if (!state.currentHasSources) {
    for (const cite of state.current.content.querySelectorAll('.cite')) cite.remove();
  }
  if (force) scrollToBottom(true);
  else scrollToBottom(false, wasAtBottom);
}

function scheduleRender() {
  if (state.renderQueued) return;
  state.renderQueued = true;
  requestAnimationFrame(() => {
    state.renderQueued = false;
    renderCurrent();
  });
}

function addSourceCards(container, sources) {
  container.innerHTML = '';
  if (!sources || !sources.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const head = document.createElement('div');
  head.className = 'sources-head';
  head.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5C9.6 18.1 8.4 15.2 8.4 12S9.6 5.9 12 3.5Z"/>
    </svg>
    <span>${tt('result.sourcesHead', { n: sources.length })}</span>`;
  container.appendChild(head);

  sources.slice(0, 6).forEach((item, index) => {
    let domain = '';
    try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch { domain = item.url; }
    const card = document.createElement('div');
    card.className = 'source-card';
    card.title = item.url;
    card.innerHTML = `
      <span class="source-index">${index + 1}</span>
      <div class="source-info">
        <div class="source-title">${escapeHtml(item.title || item.url)}</div>
        <div class="source-domain">${escapeHtml(domain)}</div>
      </div>`;
    card.addEventListener('click', () => api.openExternal(item.url));
    container.appendChild(card);
  });
}

function addActions(container, text) {
  container.innerHTML = '';
  if (!text) return;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'msg-action';
  copyBtn.textContent = tt('common.copy');
  copyBtn.addEventListener('click', async () => {
    await api.copyText(text);
    toast(tt('result.copiedAnswer'));
  });

  container.appendChild(copyBtn);
}

function removeError() {
  clearError();
}

function showError(payload) {
  hideLoading();
  hidePhase();
  setBusyUI(false);
  setStatus('error', tt('result.error'));
  if (state.current) {
    state.current.content.classList.remove('streaming');
    state.current.message.classList.remove('streaming');
  }
  removeError();

  const card = document.createElement('div');
  card.className = 'error-card';
  const message = payload.message || tt('result.requestFailed');
  const hint = payload.hint || '';
  const detail = payload.detail || '';
  card.innerHTML = `
    <div class="error-title"><span class="err-mark">!</span><span>${escapeHtml(message)}</span></div>
    ${hint ? `<div class="error-hint">${escapeHtml(hint)}</div>` : ''}
    ${detail ? `<div class="error-detail" hidden>${escapeHtml(detail)}</div>` : ''}
    <div class="error-actions"></div>`;

  const actions = card.querySelector('.error-actions');
  if (payload.retryable !== false) {
    const retry = document.createElement('button');
    retry.className = 'btn primary';
    retry.textContent = tt('common.retry');
    retry.addEventListener('click', () => {
      card.remove();
      state.errorEl = null;
      setBusyUI(true);
      setStatus('working', tt('result.retrying'));
      if (!state.selectionText && !state.lastUserQuestion) showLoading(tt('result.rereading'));
      api.retry();
    });
    actions.appendChild(retry);
  }

  const settings = document.createElement('button');
  settings.className = payload.retryable === false ? 'btn primary' : 'btn ghost';
  settings.textContent = tt('common.openSettings');
  settings.addEventListener('click', () => api.openSettings());
  actions.appendChild(settings);

  if (detail) {
    const more = document.createElement('button');
    more.className = 'btn ghost';
    more.textContent = tt('common.details');
    more.addEventListener('click', () => {
      const box = card.querySelector('.error-detail');
      box.hidden = !box.hidden;
      more.textContent = box.hidden ? tt('common.details') : tt('common.collapse');
    });
    actions.appendChild(more);
  }

  state.errorEl = card;
  els.messages.appendChild(card);
  scrollToBottom(true);
}

function showManual(message) {
  hideLoading();
  hidePhase();
  setBusyUI(false);
  setStatus('idle', tt('result.waitingInput'));
  els.manualPanel.hidden = false;
  const captureFailed = /读取屏幕失败|Could not read the screen/.test(message || '');
  const title = els.manualPanel.querySelector('.manual-head span:last-child');
  if (title) title.textContent = captureFailed ? tt('result.manualTitleCapture') : tt('result.manualTitleNone');
  if (message) els.manualInput.placeholder = message;
  state.selectionText = '';
  updateContext();
  setTimeout(() => els.manualInput.focus(), 120);
}

function reset(payload) {
  state.historyId = null;
  state.latencyMs = null;
  state.selectionText = payload?.selectionText || '';
  state.ocrRaw = payload?.selectionText || '';
  state.ocrCorrected = null;
  state.ocrEditing = false;
  els.ocrCorrectedBadge.hidden = true;
  els.ocrRevertBtn.hidden = true;
  els.ocrEditArea.hidden = true;
  els.ocrText.style.display = '';
  els.ocrEditBtn.textContent = tt('result.ocrEdit');
  els.ocrEditBtn.disabled = false;
  els.ocrEditBtn.title = '';
  state.windowInfo = payload?.windowInfo || {};
  state.shotCount = Number(payload?.shotCount) || 1;
  state.vision = Boolean(payload?.vision);
  state.webEnabled = payload?.webEnabled !== false;
  state.providerLabel = payload?.providerLabel || '';
  state.model = payload?.model || '';
  state.hasApiKey = payload?.hasApiKey !== false;
  state.streaming = false;
  state.busy = false;
  state.currentAnswer = '';
  state.lastUserQuestion = '';
  state.pendingSources = [];
  state.currentHasSources = false;
  state.current = null;
  state.errorEl = null;
  state.phaseEl = null;
  state.pinned = payload?.pinned !== false;

  els.messages.innerHTML = '';
  els.messages.appendChild(els.loadingCard);
  els.manualPanel.hidden = true;
  els.manualInput.value = '';
  els.questionInput.value = '';
  autoResize();
  els.previewWrap.hidden = true;
  els.ocrText.textContent = tt('result.ocrRunning');
  els.ocrText.dataset.empty = '0';
  els.contextPanel.classList.remove('open');
  els.contextStrip.classList.remove('open');
  els.pinBtn.classList.toggle('active', state.pinned);
  els.pinBtn.title = state.pinned ? tt('result.unpin') : tt('result.pin');
  clearError();

  applyReadingFont(payload?.font || {});
  setPreview(payload?.preview || '');
  if (payload?.selectionText) {
    setOcr(payload.selectionText, '');
  } else {
    state.selectionText = '';
  }
  setModelChip();
  updateWebToggle();
  updateVisionHint();
  updateContext();

  if (payload?.selectionText) {
    els.contextTitle.textContent = truncate(payload.windowInfo?.title || tt('result.screenSelection'), 58);
  } else {
    els.contextTitle.textContent = tt('result.readingScreen');
  }

  setStatus(payload?.status === 'error' ? 'error' : 'working', payload?.status === 'error' ? tt('result.readFailed') : tt('result.recognizing'));
  showLoading(payload?.status === 'error' ? tt('result.preparing') : tt('result.ocrRunningFull'));

  if (payload?.status === 'error' && payload.error) {
    showError({
      message: payload.error.message,
      hint: payload.error.hint,
      retryable: false
    });
    els.manualPanel.hidden = false;
    els.manualInput.focus();
  } else if (payload?.status === 'ready') {
    els.loadingText.textContent = tt('result.readyToExplain');
  }

  if (payload?.messages?.length) {
    hideLoading();
    for (const message of payload.messages) {
      if (message.role === 'user') addUserMessage(message.content);
      else if (message.role === 'assistant') {
        state.current = null;
        handleDone({ text: message.content, sources: payload.sources || [] });
      }
    }
    setStatus('done', tt('result.done'));
    setBusyUI(false);
  }
  scrollToBottom(true);
  setTimeout(() => {
    if (!state.selectionText && payload?.status !== 'error') return;
    els.questionInput.focus();
  }, 140);
}

function handleStart(mode) {
  state.latencyMs = null;
  hideLoading();
  hidePhase();
  clearError();
  setStatus('working', mode === 'initial' ? tt('result.explaining') : tt('result.answering'));
  setBusyUI(true);

  if (state.current && state.streaming) {
    // Vision fallback restarts the same answer; keep one bubble.
    state.currentAnswer = '';
    state.current.content.innerHTML = '';
    state.current.content.classList.add('streaming');
    state.current.message.classList.add('streaming');
    updateTermLabels();
    return;
  }

  state.current = null;
  state.currentAnswer = '';
  const current = createAssistant();
  current.content.classList.add('streaming');
  current.message.classList.add('streaming');
  current.time.textContent = tt('result.answering');
  state.streaming = true;
  scrollToBottomIfPinned();
  updateTermLabels();
}

function handleDelta(text) {
  if (!state.current) handleStart('followup');
  state.currentAnswer += text;
  state.streaming = true;
  scheduleRender();
}

function handleDone(payload) {
  state.streaming = false;
  setBusyUI(false);
  hidePhase();
  hideLoading();
  setStatus('done', tt('result.done'));

  const text = payload?.text || state.currentAnswer;
  state.currentAnswer = text;
  if (!state.current) createAssistant();
  state.current.content.innerHTML = md.render(text || '');
  state.currentHasSources = Boolean((payload?.sources || []).length);
  if (!state.currentHasSources) {
    for (const cite of state.current.content.querySelectorAll('.cite')) cite.remove();
  }
  state.current.content.classList.remove('streaming');
  state.current.message.classList.remove('streaming');
  state.current.time.textContent = tt('result.justNow');
  state.current.time.dataset.i18n = 'result.justNow';
  addSourceCards(state.current.sources, payload?.sources || state.pendingSources || []);
  addActions(state.current.actions, text);
  scrollToBottomIfPinned();
  state.current = null;
  state.pendingSources = [];
  setTimeout(() => els.questionInput.focus(), 80);
}

function handleStopped(payload) {
  state.streaming = false;
  setBusyUI(false);
  hidePhase();
  setStatus('stopped', tt('result.stopped'));
  if (state.current) {
    state.current.content.innerHTML = md.render(payload?.text || state.currentAnswer || '');
    state.current.content.classList.remove('streaming');
    state.current.message.classList.remove('streaming');
    state.current.time.textContent = tt('result.stopped');
    state.current.time.dataset.i18n = 'result.stopped';
    addActions(state.current.actions, payload?.text || state.currentAnswer || '');
    const note = document.createElement('div');
    note.className = 'phase-line';
    note.textContent = tt('result.stoppedGenerating');
    els.messages.appendChild(note);
    scrollToBottom(true);
  }
  state.current = null;
}

function handleSources(payload) {
  state.pendingSources = payload?.sources || [];
  state.currentHasSources = state.pendingSources.length > 0;
  if (payload?.mode === 'initial' && state.pendingSources.length) {
    if (state.phaseEl) state.phaseEl.querySelector('.phase-text').textContent = tt('result.foundSources', { n: state.pendingSources.length });
  }
}

function handleNotice(payload) {
  if (payload?.message) toast(payload.message);
}

function sendQuestion(question) {
  if (!question || state.busy) return;
  addUserMessage(question);
  els.questionInput.value = '';
  autoResize();
  state.current = null;
  state.currentAnswer = '';
  state.pendingSources = [];
  state.currentHasSources = false;
  setBusyUI(true);
  setStatus('working', tt('result.thinking'));
  api.ask(question);
}

function enableWeb() {
  if (state.webEnabled) return;
  state.webEnabled = true;
  updateWebToggle();
  api.setWebEnabled(true);
}

/* ------------------------------------------------------------------ */
/* Events                                                             */
/* ------------------------------------------------------------------ */

els.sendBtn.addEventListener('click', () => {
  if (state.busy) {
    api.stop();
    return;
  }
  const text = els.questionInput.value.trim();
  if (!text) {
    els.questionInput.focus();
    return;
  }
  sendQuestion(text);
});

els.questionInput.addEventListener('input', autoResize);
els.questionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!state.busy) {
      const text = els.questionInput.value.trim();
      if (text) sendQuestion(text);
    }
  }
});

els.webToggle.addEventListener('click', () => {
  state.webEnabled = !state.webEnabled;
  updateWebToggle();
  api.setWebEnabled(state.webEnabled);
  toast(state.webEnabled ? tt('result.webOnToast') : tt('result.webOffToast'));
});

for (const chip of els.quickRow.querySelectorAll('.quick-chip')) {
  chip.addEventListener('click', () => {
    if (state.busy) return;
    if (chip.dataset.web === '1') enableWeb();
    sendQuestion(tt(chip.dataset.questionKey));
  });
}

els.contextToggle.addEventListener('click', () => {
  const open = !els.contextPanel.classList.contains('open');
  els.contextPanel.classList.toggle('open', open);
  els.contextStrip.classList.toggle('open', open);
  els.contextToggle.title = open ? tt('result.contextCollapse') : tt('result.contextExpand');
});

els.previewWrap.addEventListener('click', () => {
  if (!state.preview) return;
  els.lightboxImg.src = state.preview;
  els.lightbox.classList.add('open');
});
els.lightbox.addEventListener('click', () => {
  els.lightbox.classList.remove('open');
  els.lightboxImg.removeAttribute('src');
});

els.pinBtn.addEventListener('click', () => {
  state.pinned = !state.pinned;
  els.pinBtn.classList.toggle('active', state.pinned);
  els.pinBtn.title = state.pinned ? tt('result.unpin') : tt('result.pin');
  api.setPinned(state.pinned);
  toast(state.pinned ? tt('result.pinnedToast') : tt('result.unpinnedToast'));
});

els.closeBtn.addEventListener('click', () => api.closeResult());
els.expandBtn.addEventListener('click', () => api.toggleResultExpand());
function syncResultMode(expanded) {
  document.body.dataset.mode = expanded ? 'expanded' : 'compact';
  els.expandBtn.title = tt(expanded ? 'result.collapse' : 'result.expand');
}
api.onResultMode(payload => syncResultMode(Boolean(payload && payload.expanded)));
api.getSettings().then(settings => syncResultMode(Boolean(settings && settings.resultExpanded))).catch(() => {});
els.newSelectBtn.addEventListener('click', () => {
  api.startSelection();
});
// The main-process guard asks this window before any selection entry
// (this button, the global hotkey, tray or bubble) discards a pending OCR
// correction, so every entry shares one confirmation.
api.onOcrGuard(() => {
  api.resolveOcrGuard(window.confirm(tt('result.ocrReselectConfirm')));
});

// OCR correction: edit the recognized text; corrections apply to the next
// request only and never touch the original screenshot or the raw OCR copy.
function setOcrCorrected(raw, corrected) {
  state.ocrRaw = raw;
  state.ocrCorrected = corrected;
  setOcr(corrected || raw || '', '');
  els.ocrCorrectedBadge.hidden = !corrected;
  els.ocrRevertBtn.hidden = !corrected;
  updateContext();
}

function setOcrEditing(editing) {
  state.ocrEditing = editing;
  els.ocrEditArea.hidden = !editing;
  els.ocrText.style.display = editing ? 'none' : '';
  els.ocrEditBtn.textContent = tt(editing ? 'result.ocrEditing' : 'result.ocrEdit');
  if (editing) {
    els.ocrEditArea.value = state.ocrCorrected || els.ocrText.textContent;
    els.ocrEditArea.focus();
  }
}

els.ocrEditBtn.addEventListener('click', () => {
  if (state.ocrEditing) {
    const value = els.ocrEditArea.value.trim();
    setOcrEditing(false);
    if (value) api.correctOcr(value);
  } else {
    setOcrEditing(true);
  }
});

els.ocrRevertBtn.addEventListener('click', () => {
  setOcrEditing(false);
  api.correctOcr('');
});

async function refreshSessionMeta() {
  try {
    const meta = await api.getResultState();
    if (!meta) return;
    state.historyId = meta.historyId || null;
    updateTermLabels();
    state.ocrRaw = meta.ocrRaw || state.ocrRaw || '';
    state.ocrCorrected = meta.ocrCorrected || null;
    els.ocrCorrectedBadge.hidden = !state.ocrCorrected;
    els.ocrRevertBtn.hidden = !state.ocrCorrected;
    const attachment = meta.visionAttachment;
    els.ocrEditBtn.disabled = state.shotCount > 1;
    els.ocrEditBtn.title = state.shotCount > 1 ? tt('result.ocrEditMultiHint') : '';
    if (attachment && attachment.width) {
      const kb = Math.max(1, Math.round(attachment.bytes / 1024));
      els.visionAttachmentNote.hidden = false;
      els.visionAttachmentNote.textContent = `${attachment.width}×${attachment.height} · ${kb} KB · ${tt(attachment.enabled ? 'result.visionSent' : 'result.visionHeld')}`;
    } else {
      els.visionAttachmentNote.hidden = true;
    }
  } catch { /* state unavailable */ }
}
document.getElementById('historyBtn').addEventListener('click', () => api.openHistory());

els.settingsBtn.addEventListener('click', () => api.openSettings());
els.modelChip.addEventListener('click', () => api.openSettings());
els.copyOcrBtn.addEventListener('click', async () => {
  if (!state.selectionText) return;
  await api.copyText(state.selectionText);
  toast(tt('result.copiedText'));
});

els.manualSubmitBtn.addEventListener('click', () => {
  const value = els.manualInput.value.trim();
  if (!value) {
    els.manualInput.focus();
    return;
  }
  els.manualPanel.hidden = true;
  setOcr(value, '');
  state.vision = false;
  updateVisionHint();
  showLoading(tt('result.organizing'));
  setStatus('working', tt('result.explaining'));
  setBusyUI(true);
  state.current = null;
  state.currentAnswer = '';
  api.setManualText(value);
});

els.manualPasteBtn.addEventListener('click', async () => {
  const text = await api.readClipboard();
  if (text) {
    els.manualInput.value = text;
    els.manualInput.focus();
  } else {
    toast(tt('notify.clipboardEmpty.title'), true);
  }
});

els.manualInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    els.manualSubmitBtn.click();
  }
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-url]');
  if (link) {
    event.preventDefault();
    api.openExternal(link.dataset.url);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (els.lightbox.classList.contains('open')) {
    els.lightbox.classList.remove('open');
    els.lightboxImg.removeAttribute('src');
    return;
  }
  api.closeResult();
});

function ensureAddShotButton() {
  const actions = document.querySelector('.titlebar .actions');
  if (!actions || document.getElementById('addShotBtn')) return;
  const button = document.createElement('button');
  button.id = 'addShotBtn';
  button.className = 'icon-btn';
  button.type = 'button';
  button.title = tt('result.addShot');
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5Z"></path><circle cx="12" cy="12.5" r="3.2"></circle></svg>';
  button.addEventListener('click', () => api.addShot());
  actions.insertBefore(button, actions.firstChild);
}

api.onFontUpdated((font) => applyReadingFont(font));
api.onResultInit((payload) => { ensureAddShotButton(); reset(payload); refreshSessionMeta(); });

api.onResultEvent((payload) => {
  if (!payload || !payload.type) return;
  switch (payload.type) {
    case 'model':
      state.model = payload.model; state.providerLabel = payload.providerLabel;
      state.vision = payload.vision; setModelChip(); updateVisionHint();
      break;
    case 'ocr':
      if (payload.shotCount) state.shotCount = payload.shotCount;
      setOcr(payload.text, payload.error);
      updateContext();
      if (payload.empty) {
        els.contextMeta.textContent = tt('result.ocrEmptyShort');
        els.contextPanel.classList.add('open');
        els.contextStrip.classList.add('open');
      }
      break;
    case 'ocr-corrected':
      setOcrCorrected(payload.raw, payload.corrected);
      refreshSessionMeta();
      break;
    case 'shot':
      state.shotCount = Number(payload.count) || state.shotCount;
      setPreview(payload.preview || state.preview);
      if (payload.text !== undefined) setOcr(payload.text, '');
      updateContext();
      toast(tt('result.shotAdded',{n:state.shotCount}));
      break;
    case 'context':
      state.windowInfo = payload.windowInfo || {};
      updateContext();
      break;
    case 'phase':
      if (payload.message) {
        showPhase(payload.message);
        if (payload.phase === 'searching') {
          setStatus('working', tt('result.searching'));
          hideLoading();
        } else if (payload.phase === 'thinking') {
          setStatus('working', tt('result.thinking'));
          hideLoading();
        }
      }
      break;
    case 'search-only':
      hideLoading();
      hidePhase();
      setBusyUI(false);
      handleDone({
        text: payload.results?.length
          ? tt('searchOnly.message')
          : tt('searchOnly.none'),
        sources: payload.results || []
      });
      setStatus('done', tt('searchOnly.status'));
      break;
    case 'sources':
      handleSources(payload);
      break;
    case 'notice':
      handleNotice(payload);
      if (payload.code === 'vision-fallback') {
        state.vision = false;
        updateVisionHint();
      }
      break;
    case 'start':
      handleStart(payload.mode);
      break;
    case 'latency':
      state.latencyMs = Number(payload.ms);
      updateTermLabels();
      break;
    case 'delta':
      handleDelta(payload.text || '');
      break;
    case 'done':
      handleDone(payload);
      break;
    case 'stopped':
      handleStopped(payload);
      break;
    case 'error':
      showError(payload);
      break;
    case 'needs-input':
      showManual(payload.message);
      els.manualPanel.hidden = false;
      break;
    case 'manual-ack':
      els.manualPanel.hidden = true;
      els.messages.innerHTML = '';
      state.current = null;
      state.currentAnswer = '';
      state.pendingSources = [];
      state.lastUserQuestion = '';
      state.streaming = false;
      clearError();
      setOcr(payload.text || '', '');
      state.ocrRaw = payload.text || '';
      state.ocrCorrected = null;
      state.ocrEditing = false;
      els.ocrCorrectedBadge.hidden = true;
      els.ocrRevertBtn.hidden = true;
      els.ocrEditArea.hidden = true;
      els.ocrText.style.display = '';
      els.ocrEditBtn.textContent = tt('result.ocrEdit');
      state.windowInfo = { title: tt('result.manualInputTitle'), process: '' };
      updateContext();
      showLoading(tt('result.organizing'));
      refreshSessionMeta();
      break;
    default:
      break;
  }
});

// Restore state if the renderer was reloaded while the window stayed open.
(async () => {
  try {
    const saved = await api.getResultState();
    if (saved?.init) {
      reset(saved.init);
      if (saved.busy) {
        setBusyUI(true);
        setStatus('working', tt('result.processing'));
      }
    }
  } catch { /* initial payload will arrive normally */ }
})();

document.addEventListener('floatask:language', () => {
  updateWebToggle(); updateVisionHint(); updateContext(); setBusyUI(state.busy);
  if (state.statusKey) setStatus(state.statusKind, tt(state.statusKey));
  els.contextToggle.title = tt(els.contextPanel.classList.contains('open') ? 'result.contextCollapse' : 'result.contextExpand');
  els.pinBtn.title = tt(state.pinned ? 'result.unpin' : 'result.pin');
});
