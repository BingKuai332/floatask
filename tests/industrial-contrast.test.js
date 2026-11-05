'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadTokens } = require('../scripts/build-theme');

const tokens = loadTokens(path.join(__dirname, '..', 'design-mockups', 'graphite-system', 'design-tokens.yaml'));
const c = tokens.themes.industrial.colors;

function lum(hex) {
  const n = hex.replace('#', '').slice(0, 6);
  const ch = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ['text', 'surface', 4.5], ['body', 'surface', 4.5], ['muted', 'surface', 4.5], ['faint', 'surface', 4.5],
  ['body', 'surface2', 4.5], ['muted', 'surface2', 4.5], ['accent', 'surface', 4.5], ['onPrimary', 'primaryButton', 4.5],
  ['red', 'redSoft', 4.5], ['green', 'surface', 3], ['text', 'accentSoft', 4.5]
];

for (const [fg, bg, min] of pairs) {
  test(`industrial ${fg} on ${bg} meets ${min}:1`, () => {
    assert.ok(ratio(c[fg], c[bg]) >= min, `${fg}/${bg} = ${ratio(c[fg], c[bg]).toFixed(2)}`);
  });
}
