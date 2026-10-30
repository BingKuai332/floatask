'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildDiagnostics } = require('../src/main/diagnostics');

const SAMPLE = {
  version: '0.3.2',
  platform: 'win32',
  osRelease: '10.0.26100',
  displays: [
    { width: 2560, height: 1440, scaleFactor: 1, workArea: { width: 2560, height: 1392 } },
    { width: 1920, height: 1080, scaleFactor: 1.25, workArea: { width: 1920, height: 1020 } }
  ],
  lastUpdateError: 'update.network'
};

test('buildDiagnostics reports version, OS, DPI and display configuration', () => {
  const text = buildDiagnostics(SAMPLE);
  assert.ok(text.includes('FloatAsk 0.3.2'));
  assert.ok(text.includes('OS: win32 10.0.26100'));
  assert.ok(text.includes('Displays: 2'));
  assert.ok(text.includes('2560x1440 @ 1x'));
  assert.ok(text.includes('1920x1080 @ 1.25x'));
  assert.ok(text.includes('workArea 1920x1020'), 'taskbar exclusion is visible');
  assert.ok(text.includes('Last update error: update.network'));
});

test('buildDiagnostics never carries secrets, OCR text, screenshots or conversation', () => {
  const hostile = {
    ...SAMPLE,
    lastUpdateError: 'update.installFailed\napiKey=sk-super-secret 识别文字=screenshot text'
  };
  const text = buildDiagnostics(hostile);
  assert.ok(!text.includes('sk-super-secret'), 'secret leaked');
  assert.ok(!text.includes('screenshot text'), 'OCR text leaked');
  assert.ok(!text.includes('Last update error'), 'a code with smuggled content is dropped entirely');
});

test('buildDiagnostics drops malformed error values', () => {
  assert.equal(buildDiagnostics({ ...SAMPLE, lastUpdateError: 'random failure with spaces' }).includes('Last update error'), false);
  assert.equal(buildDiagnostics({ ...SAMPLE, lastUpdateError: 'update.' }).includes('Last update error'), false);
  assert.ok(buildDiagnostics({ ...SAMPLE, lastUpdateError: '' }).includes('Displays: 2'));
});
