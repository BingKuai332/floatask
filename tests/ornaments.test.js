'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'src', 'renderer');
const cssPath = path.join(dir, 'ornaments.css');

test('ornaments only target the industrial theme and only use tokens', () => {
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const body = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  const selectors = [...body.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length > 10, 'ornament rules exist');
  for (const group of selectors) {
    for (const selector of group.split(',').map(s => s.trim())) {
      assert.ok(selector.startsWith('[data-theme="industrial"]'), `unscoped selector: ${selector}`);
    }
  }
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(body.replace(/url\("data:[^"]*"\)/g, '')), 'no literal colors outside the logo data URI');
});

test('every page loads ornaments.css right after theme.css', () => {
  for (const page of ['bubble', 'font', 'history', 'result', 'selection', 'settings', 'translate']) {
    const html = fs.readFileSync(path.join(dir, `${page}.html`), 'utf8');
    assert.match(html, /href="theme\.css"><link rel="stylesheet" href="ornaments\.css">/, page);
  }
});

test('contour field assets exist, stay small, and are wired into the answer window', () => {
  for (const name of ['contours.svg', 'contours-index.svg']) {
    const file = path.join(dir, 'assets', name);
    assert.ok(fs.existsSync(file), `${name} exists`);
    const size = fs.statSync(file).size;
    assert.ok(size < 150 * 1024, `${name} is ${size} bytes`);
    assert.match(fs.readFileSync(file, 'utf8'), /generate-contours\.js/, `${name} names its generator`);
  }
  const html = fs.readFileSync(path.join(dir, 'result.html'), 'utf8');
  assert.match(html, /<div class="contour-field" aria-hidden="true"><i class="contour-base"><\/i><i class="contour-index"><\/i><\/div>/);
  assert.match(fs.readFileSync(path.join(dir, 'result.css'), 'utf8'), /\.contour-field \{ display: none; \}/);
});
