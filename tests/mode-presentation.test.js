'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shouldDeferBounds } = require('../src/main/mode-presentation');

test('expanded windows resize once immediately', () => {
  assert.equal(shouldDeferBounds('expanded', false), false);
});

test('collapsed windows wait for the CSS transition before resizing', () => {
  assert.equal(shouldDeferBounds('right', false), true);
  assert.equal(shouldDeferBounds('left', false), true);
  assert.equal(shouldDeferBounds('top', false), true);
  assert.equal(shouldDeferBounds('bottom', false), true);
});

test('reduced motion never defers native bounds', () => {
  assert.equal(shouldDeferBounds('right', true), false);
  assert.equal(shouldDeferBounds('expanded', true), false);
});
