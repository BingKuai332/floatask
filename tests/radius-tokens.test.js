'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'src', 'renderer');

test('component CSS uses radius tokens instead of literal px values above 2px', () => {
  const offenders = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.css') && f !== 'theme.css')) {
    fs.readFileSync(path.join(dir, file), 'utf8').split('\n').forEach((line, i) => {
      const decl = line.match(/border-radius:\s*([^;}]*)/);
      if (!decl) return;
      const literal = decl[1].replace(/var\([^)]*\)|calc\([^)]*\)/g, '').match(/\b([3-9]|\d{2,})px/);
      if (literal) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
