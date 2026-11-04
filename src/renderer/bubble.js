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
let expandTimer = null;
let collapseTimer = null;

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

function clearTimers() {
  clearTimeout(expandTimer);
  clearTimeout(collapseTimer);
}

api.onBubbleMode(payload => {
  mode = payload?.mode || 'expanded';
  originEdge = payload?.edge || null;
  document.body.dataset.mode = mode;
  dragging = false;
  clearTimers();
});

// While the brand zone is held, never collapse under the user's cursor.
const grip = document.getElementById('grip');
grip.addEventListener('mousedown', () => { dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });

askBtn.addEventListener('click', () => api.startSelection());
multiBtn.addEventListener('click', () => api.startMultiSelection());
transBtn.addEventListener('click', () => api.startTranslation());
clipBtn.addEventListener('click', () => api.startClipboardExplain());
historyBtn.addEventListener('click', () => api.openHistory());
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  api.bubbleMenu();
});

/* Expand/collapse discipline: hover 120 ms or click expands a half capsule;
   leaving collapses back after 300 ms unless a menu is open. */
function requestExpand() {
  if (mode === 'expanded') return;
  api.expandBubble();
}

function requestCollapse() {
  if (mode !== 'expanded' || !originEdge || menuOpen || dragging) return;
  api.collapseBubble();
}

bubble.addEventListener('mouseenter', () => {
  clearTimers();
  if (mode !== 'expanded') expandTimer = setTimeout(requestExpand, reducedMotion() ? 0 : 120);
});
bubble.addEventListener('mouseleave', () => {
  clearTimers();
  if (mode === 'expanded' && originEdge) collapseTimer = setTimeout(requestCollapse, reducedMotion() ? 0 : 300);
});
bubble.addEventListener('click', () => {
  if (mode !== 'expanded') { clearTimers(); requestExpand(); }
});

// Review round 4: the rightmost action jumps straight to settings instead
// of growing the toolbar to host a menu (hide/quit stay on the tray menu).
moreBtn.addEventListener('click', () => {
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
