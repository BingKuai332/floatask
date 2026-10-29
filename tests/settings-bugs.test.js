'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { fromKeyboard, normalizeHotkey } = require('../src/shared/hotkeys');

test('recorded NumPad shortcuts do not turn into main keyboard digits', () => {
  assert.equal(fromKeyboard({key:'1',code:'Numpad1',ctrlKey:true}), 'Ctrl+num1');
  assert.equal(fromKeyboard({key:'1',code:'Digit1',ctrlKey:true}), 'Ctrl+1');
  assert.equal(fromKeyboard({key:'End',code:'Numpad1',ctrlKey:true}), 'Ctrl+End');
  assert.equal(fromKeyboard({key:'+',code:'NumpadAdd',altKey:true}), 'Alt+numadd');
  assert.equal(fromKeyboard({key:',',code:'NumpadDecimal',ctrlKey:true}), 'Ctrl+numdec');
  assert.equal(fromKeyboard({key:'Delete',code:'NumpadDecimal',ctrlKey:true}), 'Ctrl+Delete');
  assert.equal(normalizeHotkey('Ctrl+NUM1'), 'Ctrl+num1');
});

function renderer(filename) {
  const elements = new Map(), windowEvents = new Map(), documentEvents = new Map(), timers = new Map(), calls = [], acknowledgements = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: id === 'hotkey' ? 'Alt+Q' : '', textContent: '', dataset: {}, checked: false, hidden: false,
      listeners: new Map(), classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, callback) { this.listeners.set(type, callback); },
      append() {}, replaceChildren() {}, querySelectorAll() { return []; }, focus() {},
      fire(type, event = {}) { return this.listeners.get(type)?.(event); }
    });
    return elements.get(id);
  }
  const api = {
    setHotkeyRecording(enabled) {
      calls.push(enabled);
      return enabled ? new Promise((resolve, reject) => acknowledgements.push({ resolve, reject })) : Promise.resolve(true);
    },
    onUpdateState() {}, getUpdateState: async () => undefined, onFontUpdated() {}
  };
  const window = {
    floatask: api, FloatAskI18n: { t: key => key, apply() {} },
    FloatAskI18nReady: new Promise(() => {}), FloatAskAdvanced: { validate: () => null },
    FloatAskHotkeys: require('../src/shared/hotkeys'),
    addEventListener(type, callback) { windowEvents.set(type, callback); }
  };
  let nextTimer = 0;
  const context = vm.createContext({
    window, document: {
      getElementById: element, createElement: () => element('created-' + elements.size),
      addEventListener(type, callback) { documentEvents.set(type, callback); }
    },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }, URL, console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/renderer', filename), 'utf8'), context);
  return { context, window, element, windowEvents, documentEvents, timers, calls, acknowledgements };
}

test('blur while recorder startup IPC is pending cancels its late acknowledgement', async () => {
  const app = renderer('settings-advanced.js');
  const started = app.element('recordHotkeyBtn').fire('click');
  assert.equal(app.window.FloatAskAdvanced.recording, true);
  await app.windowEvents.get('blur')();
  app.acknowledgements[0].resolve(true); await started;
  assert.equal(app.window.FloatAskAdvanced.recording, false);
  assert.equal(app.element('hotkey').value, 'Alt+Q');
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.calls, [true, false]);
});

test('second click while recorder startup is pending cancels rather than creating duplicate timers', async () => {
  const app = renderer('settings-advanced.js');
  const started = app.element('recordHotkeyBtn').fire('click');
  await app.element('recordHotkeyBtn').fire('click');
  app.acknowledgements[0].resolve(true); await started;
  assert.equal(app.window.FloatAskAdvanced.recording, false);
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.calls, [true, false]);
});

test('failed recorder startup restores shortcut handling without an unhandled rejection', async () => {
  const app = renderer('settings-advanced.js');
  const started = app.element('recordHotkeyBtn').fire('click');
  app.acknowledgements[0].reject(new Error('IPC disconnected')); await started;
  assert.equal(app.window.FloatAskAdvanced.recording, false);
  assert.equal(app.element('hotkeyHelp').textContent, 'IPC disconnected');
  assert.deepEqual(app.calls, [true, false]);
});

test('explicit default Key removal can be saved while missing credentials still block ordinary saves', () => {
  const app = renderer('settings.js');
  const draft = { baseUrl: 'https://example.test/v1', model: 'model', apiKey: '', clearApiKey: true, searchProvider: 'off' };
  app.context.draft = draft;
  assert.equal(vm.runInContext('validate(draft)', app.context), null);
  draft.clearApiKey = false;
  assert.equal(vm.runInContext('validate(draft).message', app.context), 'settings.validateKey');
});

test('explicit profile Key removal can be saved without disabling that task', () => {
  const app = renderer('settings-advanced.js');
  app.window.FloatAskAdvanced.populate({ presets: [], modelProfiles: { initial: { hasApiKey: true } } }, () => ({}));
  const draft = { hotkey: 'Alt+Q', modelProfiles: { initial: {
    enabled: true, customService: true, baseUrl: 'https://profile.test/v1', model: 'model', apiKey: '',
    clearApiKey: true, temperature: 0.4, maxTokens: 1200
  } } };
  assert.equal(app.window.FloatAskAdvanced.validate(draft), null);
});
