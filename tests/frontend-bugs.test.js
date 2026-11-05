'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function bubbleRenderer() {
  const listeners = new Map();
  const timers = new Map();
  const calls = [];
  let nextTimer = 0;
  let modeCallback;
  function element(id) {
    return {
      id,
      dataset: {},
      title: '',
      capturedPointer: null,
      classList: { add() {} },
      addEventListener(type, callback) { listeners.set(`${id}:${type}`, callback); },
      setPointerCapture(pointerId) { this.capturedPointer = pointerId; },
      releasePointerCapture() { this.capturedPointer = null; },
      hasPointerCapture(pointerId) { return this.capturedPointer === pointerId; }
    };
  }
  const elements = new Map();
  for (const id of ['bubble', 'grip', 'askBtn', 'multiBtn', 'transBtn', 'clipBtn', 'historyBtn', 'moreBtn']) {
    elements.set(id, element(id));
  }
  const window = {
    floatask: {
      onBubbleMode(callback) { modeCallback = callback; },
      expandBubble() { calls.push('expand'); },
      collapseBubble() { calls.push('collapse'); },
      beginBubbleDrag() { calls.push(['drag-start']); },
      moveBubbleDrag(delta) { calls.push(['drag-move', delta.x, delta.y]); },
      endBubbleDrag() { calls.push(['drag-end']); },
      openSettings() { calls.push(['open-settings']); },
      getFont() { return new Promise(() => {}); },
      onFontUpdated() {},
      getAppInfo() { return new Promise(() => {}); }
    },
    FloatAskI18n: { t: key => key },
    FloatAskI18nReady: new Promise(() => {}),
    FloatAskFont: { apply() {} },
    matchMedia() { return { matches: false }; },
    addEventListener(type, callback) { listeners.set(`window:${type}`, callback); }
  };
  const document = {
    body: { dataset: {} },
    getElementById(id) { return elements.get(id); },
    addEventListener(type, callback) { listeners.set(`document:${type}`, callback); }
  };
  const context = vm.createContext({
    window,
    document,
    console,
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/renderer/bubble.js'), 'utf8'), context);
  return {
    calls,
    timers,
    body: document.body,
    setMode(mode, edge, axis = 'horizontal', direction = 'right') { modeCallback({ mode, edge, axis, direction }); },
    fire(id, type, event = {}) {
      listeners.get(`${id}:${type}`)?.({ button: 0, pointerId: 1, screenX: 0, screenY: 0, preventDefault() {}, ...event });
    },
    runTimers() {
      for (const [id, callback] of [...timers]) {
        timers.delete(id);
        callback();
      }
    }
  };
}

test('clicking a collapsed capsule still requests expansion', () => {
  const app = bubbleRenderer();
  app.setMode('left', 'left');
  app.fire('bubble', 'click');
  assert.deepEqual(app.calls, ['expand']);
});

test('grip and more button both forward pointer dragging to the main process', () => {
  for (const id of ['grip', 'moreBtn']) {
    const app = bubbleRenderer();
    app.setMode('expanded', 'left');
    app.fire(id, 'pointerdown', { pointerId: 7, screenX: 600, screenY: 300 });
    app.fire(id, 'pointermove', { pointerId: 7, screenX: 630, screenY: 340 });
    app.fire(id, 'pointerup', { pointerId: 7, screenX: 630, screenY: 340 });
    assert.deepEqual(app.calls, [
      ['drag-start'],
      ['drag-move', 30, 40],
      ['drag-end']
    ], `${id} completes a full drag lifecycle`);
  }
});

test('more button still opens settings after a click but not after a drag', () => {
  const app = bubbleRenderer();
  app.fire('moreBtn', 'pointerdown', { screenX: 600, screenY: 300 });
  app.fire('moreBtn', 'pointerup', { screenX: 600, screenY: 300 });
  app.fire('moreBtn', 'click');
  assert.deepEqual(app.calls, [['open-settings']]);

  app.calls.length = 0;
  app.fire('moreBtn', 'pointerdown', { screenX: 600, screenY: 300 });
  app.fire('moreBtn', 'pointermove', { screenX: 620, screenY: 300 });
  app.fire('moreBtn', 'pointerup', { screenX: 620, screenY: 300 });
  app.fire('moreBtn', 'click');
  assert.equal(app.calls.some(call => Array.isArray(call) && call[0] === 'open-settings'), false);
});

test('side expansion carries its axis and floating restores horizontal layout', () => {
  const app = bubbleRenderer();
  app.setMode('expanded', 'right', 'vertical', 'up');
  assert.equal(app.body.dataset.axis, 'vertical');
  assert.equal(app.body.dataset.direction, 'up');
  app.setMode('expanded', null, 'horizontal', 'right');
  assert.equal(app.body.dataset.axis, 'horizontal');
  assert.equal(app.body.dataset.direction, 'right');
});
