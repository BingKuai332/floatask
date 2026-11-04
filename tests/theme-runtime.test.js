'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// src/renderer/theme.js is the renderer runtime under test. It must be
// importable in plain Node (no window/document side effects at load time)
// and export its pure decision logic for tests.
const theme = require('../src/renderer/theme');

test('theme module exposes resolveTheme without browser globals', () => {
  assert.equal(typeof theme.resolveTheme, 'function');
});

test('resolveTheme maps explicit light/dark regardless of system preference', () => {
  assert.equal(theme.resolveTheme('light', true), 'light');
  assert.equal(theme.resolveTheme('light', false), 'light');
  assert.equal(theme.resolveTheme('dark', true), 'dark');
  assert.equal(theme.resolveTheme('dark', false), 'dark');
});

test('resolveTheme follows the system preference for system and invalid values', () => {
  assert.equal(theme.resolveTheme('system', true), 'dark');
  assert.equal(theme.resolveTheme('system', false), 'light');
  assert.equal(theme.resolveTheme('neon', true), 'dark');
  assert.equal(theme.resolveTheme(undefined, false), 'light');
  assert.equal(theme.resolveTheme(null, true), 'dark');
});
