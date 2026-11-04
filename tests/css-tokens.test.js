'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Component CSS must take every color from the generated --fa-* tokens so a
// new theme never needs to touch it. theme.css is the generated source.
// Exempt: data: URIs (embedded artwork) and mask declarations (alpha only).
const DIR = path.join(__dirname, '..', 'src', 'renderer');
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;

function stripNoise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/url\(\s*(["']?)data:[\s\S]*?\1\s*\)/g, 'url()')
    // Mask images only read alpha, so their rgb(0 0 0 / a) stops are not colors.
    .replace(/(?:-webkit-)?mask(?:-image)?\s*:[^;]*;/g, '');
}

test('component CSS contains no literal colors', () => {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.css') && f !== 'theme.css');
  assert.ok(files.length > 0);
  const offenders = [];
  for (const file of files) {
    const css = stripNoise(fs.readFileSync(path.join(DIR, file), 'utf8'));
    for (const match of css.match(LITERAL_COLOR) || []) offenders.push(`${file}: ${match}`);
  }
  assert.deepEqual(offenders, []);
});

test('the guard catches literal colors outside data URIs', () => {
  const sample = stripNoise('a{color:#fff;background:url("data:image/svg+xml,%23000 fill=\'#123\'")}b{color:rgba(0,0,0,.5);mask-image:linear-gradient(rgb(0 0 0 / .5),black);}');
  assert.deepEqual(sample.match(LITERAL_COLOR), ['#fff', 'rgba(']);
});
