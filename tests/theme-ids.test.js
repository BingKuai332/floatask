'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = require('../src/shared/theme-ids');
const { loadTokens, renderTheme } = require('../scripts/build-theme');

test('registry lists the explicit themes with their native color scheme', () => {
  assert.deepEqual(registry.THEMES.map(t => [t.id, t.scheme]), [
    ['light', 'light'], ['dark', 'dark'], ['industrial', 'dark']
  ]);
  assert.equal(registry.isExplicitTheme('industrial'), true);
  assert.equal(registry.isExplicitTheme('system'), false);
  assert.equal(registry.isExplicitTheme('neon'), false);
  assert.equal(registry.isExplicitTheme(undefined), false);
  assert.equal(registry.schemeOf('industrial'), 'dark');
  assert.equal(registry.schemeOf('light'), 'light');
  assert.equal(registry.schemeOf('system'), null);
});

test('registry stays in sync with design-tokens.yaml themes', () => {
  const tokens = loadTokens();
  const yamlIds = Object.keys(tokens.themeIds).filter(id => id !== 'system');
  assert.deepEqual([...registry.THEMES.map(t => t.id)].sort(), [...yamlIds].sort(),
    'themeIds in design-tokens.yaml must match src/shared/theme-ids.js');
  assert.deepEqual(Object.keys(tokens.themes).sort(), [...yamlIds].sort(),
    'every themeIds entry needs a themes block');
  for (const { id, scheme } of registry.THEMES) {
    assert.equal(scheme, tokens.themes[id].colorScheme || id, `scheme of ${id}`);
  }
});

test('renderTheme emits one block per theme in tokens.themes', () => {
  const tokens = loadTokens();
  const extra = JSON.parse(JSON.stringify(tokens.themes.light));
  extra.colorScheme = 'light';
  tokens.themes.probe = extra;
  const css = renderTheme(tokens);
  assert.match(css, /^\[data-theme="probe"\] \{\n  color-scheme: light;/m);
});

test('renderers load the shared theme registry before theme.js', () => {
  const dir = path.join(__dirname, '..', 'src', 'renderer');
  for (const page of ['bubble', 'font', 'history', 'result', 'selection', 'settings', 'translate']) {
    const html = fs.readFileSync(path.join(dir, `${page}.html`), 'utf8');
    const registryAt = html.indexOf('<script src="../shared/theme-ids.js"></script>');
    const themeAt = html.indexOf('<script src="theme.js"></script>');
    assert.ok(registryAt >= 0, `${page}.html loads theme-ids.js`);
    assert.ok(themeAt > registryAt, `${page}.html loads theme-ids.js before theme.js`);
  }
});

test('settings preview resolves themes through the shared registry', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings.js'), 'utf8');
  const theme = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'theme.js'), 'utf8');
  for (const [name, text] of [['settings.js', src], ['theme.js', theme]]) {
    assert.doesNotMatch(text, /===\s*'industrial'/, `${name} must not hardcode theme ids`);
    assert.match(text, /FloatAskThemeIds|theme-ids/, `${name} uses the registry`);
  }
});
