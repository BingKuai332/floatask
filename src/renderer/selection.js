'use strict';

const stage = document.getElementById('stage');
const box = document.getElementById('box');
const sizeLabel = document.getElementById('size');
const tip = document.getElementById('tip');
const hintText = document.getElementById('hintText');
const crosshairX = document.getElementById('crosshairX');
const crosshairY = document.getElementById('crosshairY');
const flash = document.getElementById('flash');
const api = window.floatask;

function applyUiFont(font) {
  window.FloatAskFont.apply(font, { ui: true });
}

api.onSelectionInit((payload) => {
  if (payload?.font) applyUiFont(payload.font);
});

let start = null;
let rect = null;
let dragging = false;
let done = false;

function normalize(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { x, y, width, height };
}

function setBox(value) {
  if (!value) {
    box.classList.remove('visible');
    return;
  }
  box.classList.add('visible');
  box.style.left = `${value.x}px`;
  box.style.top = `${value.y}px`;
  box.style.width = `${value.width}px`;
  box.style.height = `${value.height}px`;
  sizeLabel.textContent = `${Math.round(value.width)} × ${Math.round(value.height)}`;
}

function placeTip(clientX, clientY) {
  const pad = 16;
  const w = tip.offsetWidth || 110;
  const h = tip.offsetHeight || 26;
  let x = clientX + pad;
  let y = clientY + pad;
  if (x + w > window.innerWidth - 8) x = clientX - w - pad;
  if (y + h > window.innerHeight - 8) y = clientY - h - pad;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

function updateCursor(clientX, clientY) {
  crosshairX.style.top = `${clientY}px`;
  crosshairY.style.left = `${clientX}px`;
  stage.classList.add('hovering');
  placeTip(clientX, clientY);
}

stage.addEventListener('pointermove', (event) => {
  const x = Math.min(window.innerWidth, Math.max(0, event.clientX));
  const y = Math.min(window.innerHeight, Math.max(0, event.clientY));
  updateCursor(x, y);
  if (!dragging || !start) return;
  rect = normalize(start.x, start.y, x, y);
  setBox(rect);
  tip.textContent = '松开鼠标开始解释';
});

stage.addEventListener('pointerdown', (event) => {
  if (done) return;
  if (event.button !== 0) {
    api.cancelSelection();
    return;
  }
  event.preventDefault();
  start = { x: event.clientX, y: event.clientY };
  dragging = true;
  stage.classList.add('dragging');
  stage.classList.remove('hovering');
  tip.style.display = 'none';
  setBox({ x: start.x, y: start.y, width: 0, height: 0 });
});

window.addEventListener('pointerup', (event) => {
  if (!dragging || done) return;
  dragging = false;
  stage.classList.remove('dragging');
  const x = Math.min(window.innerWidth, Math.max(0, event.clientX));
  const y = Math.min(window.innerHeight, Math.max(0, event.clientY));
  rect = normalize(start.x, start.y, x, y);

  if (rect.width < 8 || rect.height < 8) {
    setBox(null);
    tip.style.display = '';
    hintText.textContent = '选区太小，再拖一次';
    stage.classList.add('hovering');
    placeTip(x, y);
    setTimeout(() => { hintText.textContent = '拖拽框选要解释的内容'; }, 1400);
    start = null;
    rect = null;
    return;
  }

  done = true;
  setBox(rect);
  stage.style.cursor = 'wait';
  flash.classList.add('on');
  setTimeout(() => {
    api.finishSelection({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    });
  }, 45);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    api.cancelSelection();
  }
});

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  api.cancelSelection();
});

window.addEventListener('resize', () => {
  if (rect) setBox(rect);
});
