'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { updateHover, suppressHover } = require('../src/main/hover-state');

test('leaving collapses and a fresh entry expands again consistently', () => {
  let state = { suppressed: false };
  assert.deepEqual(updateHover(state, true, false), { suppressed: false, action: 'expand' });
  assert.deepEqual(updateHover(state, true, true), { suppressed: false, action: null });
  assert.deepEqual(updateHover(state, false, true), { suppressed: false, action: 'collapse' });
  assert.deepEqual(updateHover(state, true, false), { suppressed: false, action: 'expand' });
});

test('dragging suppresses hover expansion until the pointer leaves and re-enters', () => {
  let state = suppressHover({ suppressed: false });
  assert.deepEqual(updateHover(state, true, false), { suppressed: true, action: null });
  state = updateHover(state, false, false);
  assert.deepEqual(state, { suppressed: false, action: null });
  assert.deepEqual(updateHover(state, true, false), { suppressed: false, action: 'expand' });
});

test('leaving while collapsed only rearms hover without collapsing', () => {
  assert.deepEqual(updateHover({ suppressed: true }, false, false), { suppressed: false, action: null });
});
