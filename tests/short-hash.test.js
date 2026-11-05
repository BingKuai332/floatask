'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shortHash } = require('../src/shared/short-hash');

test('shortHash is a stable 4-digit hex label', () => {
  const id = 'h-1762150327000-ab12cd';
  assert.match(shortHash(id), /^0x[0-9A-F]{4}$/);
  assert.equal(shortHash(id), shortHash(id));
  assert.notEqual(shortHash(id), shortHash('h-1762150327000-ab12ce'));
});

test('shortHash is empty for a missing id', () => {
  assert.equal(shortHash(''), '');
  assert.equal(shortHash(null), '');
});
