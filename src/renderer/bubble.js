'use strict';

const api = window.floatask;
const tt = (key, params) => window.FloatAskI18n.t(key, params);
const bubble = document.getElementById('bubble');
const askBtn = document.getElementById('askBtn');

function applyUiFont(font) {
  window.FloatAskFont.apply(font, { ui: true });
}

askBtn.addEventListener('click', () => api.startSelection());
bubble.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  api.bubbleMenu();
});

api.getFont().then(applyUiFont).catch(() => {});
api.onFontUpdated(applyUiFont);

async function updateTitles() {
  const info = await api.getAppInfo(); const hotkey = info?.hotkey || 'Alt+Q';
  bubble.title = tt('bubble.tooltip', { hotkey }); askBtn.title = tt('bubble.button', { hotkey });
}
document.addEventListener('floatask:language', () => updateTitles().catch(() => {}));
window.FloatAskI18nReady.then(updateTitles).catch(() => {});
