'use strict';

const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);
const bubble = document.getElementById('bubble');
const askBtn = document.getElementById('askBtn');
const multiBtn = document.getElementById('multiBtn');
const transBtn = document.getElementById('transBtn');
const clipBtn = document.getElementById('clipBtn');
const historyBtn = document.getElementById('historyBtn');
const moreBtn = document.getElementById('moreBtn');

let mode = 'expanded';
let originEdge = null;
let menuOpen = false;
let dragging = false;

api.onBubbleMode(payload => {
  mode = payload?.mode || 'expanded';
  originEdge = payload?.edge || null;
  document.body.dataset.mode = mode;
  document.body.dataset.axis = payload?.axis || 'horizontal';
  document.body.dataset.direction = payload?.direction || 'right';
  document.body.dataset.edge = originEdge || '';
  dragging = false;
});

const grip = document.getElementById('grip');

let dragCandidate = null;
let suppressClick = false;

function bindDragHandle(target) {
  target.classList.add('drag-handle');
  target.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    dragging = true;
    dragCandidate = {
      target,
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      active: false
    };
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', event => {
    const current = dragCandidate;
    if (!current || current.target !== target || current.pointerId !== event.pointerId) return;
    const delta = { x: event.screenX - current.startX, y: event.screenY - current.startY };
    if (!current.active && Math.hypot(delta.x, delta.y) < 4) return;
    if (!current.active) {
      current.active = true;
      api.beginBubbleDrag();
    }
    api.moveBubbleDrag(delta);
  });
  const finish = event => {
    const current = dragCandidate;
    if (!current || current.target !== target || current.pointerId !== event.pointerId) return;
    dragCandidate = null;
    dragging = false;
    if (current.active) {
      suppressClick = true;
      api.endBubbleDrag();
      setTimeout(() => { suppressClick = false; }, 0);
    }
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };
  target.addEventListener('pointerup', finish);
  target.addEventListener('pointercancel', finish);
  target.addEventListener('lostpointercapture', finish);
  target.addEventListener('keydown', event => {
    const deltas = {
      ArrowLeft: { x: -15, y: 0 }, ArrowRight: { x: 15, y: 0 },
      ArrowUp: { x: 0, y: -15 }, ArrowDown: { x: 0, y: 15 }
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    api.beginBubbleDrag();
    api.moveBubbleDrag(delta);
    api.endBubbleDrag();
  });
}

bindDragHandle(grip);
bindDragHandle(moreBtn);

askBtn.addEventListener('click', () => api.startSelection());
multiBtn.addEventListener('click', () => api.startMultiSelection());
transBtn.addEventListener('click', () => api.startTranslation());
clipBtn.addEventListener('click', () => api.startClipboardExplain());
historyBtn.addEventListener('click', () => api.openHistory());
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  api.bubbleMenu();
});

function requestExpand() {
  if (mode === 'expanded' || dragging) return;
  api.expandBubble();
}

bubble.addEventListener('click', () => {
  if (suppressClick) return;
  if (mode !== 'expanded') requestExpand();
});

// A click opens settings; a drag moves the capsule without triggering the click.
moreBtn.addEventListener('click', () => {
  if (suppressClick) return;
  menuOpen = false;
  api.openSettings();
});

function applyUiFont(font) {
  window.FloatAskFont.apply(font, { ui: true });
}

api.getFont().then(applyUiFont).catch(() => {});
api.onFontUpdated(applyUiFont);

async function updateTitles() {
  const info = await api.getAppInfo(); const hotkey = info?.hotkey || 'Alt+Q';
  bubble.title = tt('bubble.tooltip', { hotkey }); askBtn.title = tt('bubble.button', { hotkey });
  multiBtn.title = tt('bubble.multi'); transBtn.title = tt('bubble.translate');
  clipBtn.title = tt('bubble.clipboard'); historyBtn.title = tt('bubble.history'); moreBtn.title = tt('bubble.more');
}
document.addEventListener('floatask:language', () => updateTitles().catch(() => {}));
window.FloatAskI18nReady.then(updateTitles).catch(() => {});
