'use strict';

const api = window.floatask;
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

api.getAppInfo().then((info) => {
  const shortcut = info?.hotkey || 'Alt+Q';
  bubble.title = `浮问 · ${shortcut} 框选解释\n拖动左侧调整位置，右键更多`;
  askBtn.title = `框选屏幕内容（${shortcut}）`;
}).catch(() => {});
