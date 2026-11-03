'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pref = require('../src/main/theme-preference');

test('industrial is a valid saved preference', () => {
  assert.deepEqual(pref.THEME_PREFERENCES, ['system', 'light', 'dark', 'industrial']);
  assert.equal(pref.normalizeThemePreference('industrial'), 'industrial');
  assert.equal(pref.normalizeThemePreference('neon'), 'system');
});

test('industrial drives native chrome as dark', () => {
  assert.equal(pref.nativeThemeSource('industrial'), 'dark');
  assert.equal(pref.nativeThemeSource('dark'), 'dark');
  assert.equal(pref.nativeThemeSource('light'), 'light');
  assert.equal(pref.nativeThemeSource('system'), 'system');
});

test('system still resolves only to light or dark', () => {
  assert.equal(pref.resolveThemeId('industrial', false), 'industrial');
  assert.equal(pref.resolveThemeId('system', true), 'dark');
  assert.equal(pref.resolveThemeId('system', false), 'light');
});
