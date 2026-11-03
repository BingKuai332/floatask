'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');
const tokensPath = path.join(repoRoot, 'design-mockups', 'graphite-system', 'design-tokens.yaml');
const buildScript = path.join(repoRoot, 'scripts', 'build-theme.js');
const themeCssPath = path.join(repoRoot, 'src', 'renderer', 'theme.css');

// Lazy require: scripts/build-theme.js is the production code under test.
// Loading it inside each test keeps RED failures per-test instead of
// crashing the whole file, and enforces that the module is side-effect free.
function loadBuildTheme() {
  return require('../scripts/build-theme');
}

function runBuild(args) {
  return spawnSync(process.execPath, [buildScript, ...args], { cwd: repoRoot, windowsHide: true, encoding: 'utf8' });
}

test('design tokens parse with a 1.5.x version and dark/industrial/light/system theme ids', () => {
  const { loadTokens } = loadBuildTheme();
  const tokens = loadTokens(tokensPath);
  assert.match(tokens.version, /^1\.5\.\d+$/, 'patch versions evolve without pinning the suite');
  assert.deepEqual(Object.keys(tokens.themeIds).sort(), ['dark', 'industrial', 'light', 'system']);
  assert.ok(tokens.themes.dark && tokens.themes.light, 'both themes present');
  assert.ok(tokens.themes.industrial, 'industrial theme present');
});

test('generated CSS exposes dark surface #171A20 and light surface #F4F3ED under data-theme selectors', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
  const light = css.match(/\[data-theme="light"\]\s*\{([^}]*)\}/);
  assert.ok(dark, 'dark theme block exists');
  assert.ok(light, 'light theme block exists');
  assert.match(dark[1], /--fa-surface:\s*#171A20\b/);
  assert.match(light[1], /--fa-surface:\s*#F4F3ED\b/);
  assert.match(dark[1], /--fa-accent:\s*#8FA6C9\b/);
  assert.match(light[1], /--fa-primary-button:\s*#506B92\b/);
});

test('radius scale emits 16/12/10/8 px and pill variables', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  assert.match(css, /--fa-radius-window:\s*16px/);
  assert.match(css, /--fa-radius-container:\s*12px/);
  assert.match(css, /--fa-radius-control:\s*10px/);
  assert.match(css, /--fa-radius-small:\s*8px/);
  assert.match(css, /--fa-radius-pill:\s*999px/);
});

test('registered micro sizes and dense radii emit as variables', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  for (const variable of ['--fa-size-kicker: 7.5px', '--fa-size-micro: 8.5px', '--fa-size-nano: 9px', '--fa-size-caption: 9.5px']) {
    assert.ok(css.includes(variable), `${variable} defined`);
  }
  for (const variable of ['--fa-radius-media: 9px', '--fa-radius-compact: 7px', '--fa-radius-mini: 5px']) {
    assert.ok(css.includes(variable), `${variable} defined`);
  }
  assert.match(css, /--fa-border-danger:\s*#E1A0A84D/);
  assert.match(css, /--fa-border-danger:\s*#A14D584D/);
});

test('component geometry constants emit from the token source', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  assert.match(css, /--fa-answer-compact-width:\s*800px/);
  assert.match(css, /--fa-answer-compact-height:\s*1425px/);
  assert.match(css, /--fa-answer-expanded-width:\s*960px/);
  assert.match(css, /--fa-answer-expanded-height:\s*1600px/);
  assert.match(css, /--fa-toolbar-primary-radius:\s*21px/);
  assert.match(css, /--fa-toolbar-collapsed-radius:\s*22px/);
  assert.match(css, /\[data-density='compact'\]\s*\{\s*--fa-density-factor:\s*0\.92;?\s*\}/);
  assert.match(css, /\[data-density='relaxed'\]\s*\{\s*--fa-density-factor:\s*1\.12;?\s*\}/);
});

test('keyboard focus outline uses 2px active outline with 2px offset', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  assert.match(css, /--fa-focus-outline-width:\s*2px/);
  assert.match(css, /--fa-focus-outline-offset:\s*2px/);
});

test('legacy hand-written variables remain as aliases to semantic tokens', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  for (const alias of ['--bg', '--text', '--muted', '--accent', '--danger', '--ok', '--font', '--mono']) {
    assert.ok(css.includes(`${alias}:`), `alias ${alias} still defined`);
  }
  assert.match(css, /--accent:\s*var\(--fa-accent\)/);
  assert.match(css, /--danger:\s*var\(--fa-red\)/);
});

test('CLI --check passes on freshly generated CSS and fails after a manual edit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatask-theme-'));
  const out = path.join(dir, 'theme.css');
  try {
    const write = runBuild(['--out', out]);
    assert.equal(write.status, 0, write.stderr);

    const ok = runBuild(['--check', '--out', out]);
    assert.equal(ok.status, 0, '--check should accept generated CSS');

    fs.writeFileSync(out, fs.readFileSync(out, 'utf8').replace('#171A20', '#171A21'));
    const tampered = runBuild(['--check', '--out', out]);
    assert.notEqual(tampered.status, 0, '--check must reject a hand-edited value');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('committed theme.css is in sync with the token source', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const check = runBuild(['--check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.equal(fs.readFileSync(themeCssPath, 'utf8'), renderTheme(loadTokens(tokensPath)));
});

test('forced-colors media block hands palette to system colors', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, 'forced-colors block exists');
  const body = block[1];
  assert.match(body, /--fa-surface:\s*Canvas\b/);
  assert.match(body, /--fa-text:\s*CanvasText\b/);
  assert.match(body, /--fa-accent:\s*LinkText\b/);
  assert.match(body, /--fa-border-danger:\s*CanvasText\b/);
  assert.match(body, /--fa-shadow-floating:\s*none/);
  assert.match(body, /--fa-shadow-toolbar:\s*none/);
});

test('prefers-reduced-motion collapses motion durations to instant', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, 'reduced-motion block exists');
  for (const variable of ['--fa-motion-theme-color', '--fa-motion-toolbar', '--fa-motion-toolbar-fade', '--fa-motion-hover-expand', '--fa-motion-leave-collapse']) {
    assert.match(block[1], new RegExp(variable + ':\\s*0ms'), `${variable} zeroed`);
  }
});

test('bundled fonts are declared locally for both typefaces', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  for (const family of ['Liter', 'MiSans']) {
    const block = css.split('@font-face').slice(1).find(chunk => chunk.includes(`font-family: '${family}'`));
    assert.ok(block, `@font-face for ${family} exists`);
    assert.ok(block.includes('../../resources/fonts/'), `${family} loads from the local bundle`);
    assert.ok(!block.includes('http'), `${family} never loads from a CDN`);
  }
});

test('digit-suffixed roles emit dashed variable names', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  for (const variable of ['--fa-surface-2', '--fa-surface-3', '--fa-accent-soft', '--fa-red-soft', '--fa-primary-button', '--fa-on-primary']) {
    assert.ok(css.includes(`${variable}:`), `${variable} defined`);
  }
  assert.ok(!css.includes('--fasurface2') && !/--fa-surface2\b/.test(css), 'no digit-suffixed variable names');
});

test('every theme block emits its corner shape and radius scale', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = (id) => css.match(new RegExp(`\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`))[1];
  assert.match(block('dark'), /--fa-corner-shape:\s*round;/);
  assert.match(block('light'), /--fa-corner-shape:\s*round;/);
  assert.match(block('light'), /--fa-radius-window:\s*16px;/);
  const industrial = block('industrial');
  assert.match(industrial, /color-scheme:\s*dark;/);
  assert.match(industrial, /--fa-corner-shape:\s*bevel;/);
  assert.match(industrial, /--fa-radius-container:\s*10px;/);
  assert.match(industrial, /--fa-radius-control:\s*7px;/);
  assert.match(industrial, /--fa-accent:\s*#FFE400\b/);
  assert.match(industrial, /--fa-border-accent-line:\s*#FFE40080\b/);
  assert.match(industrial, /--fa-grid-line:\s*#FFFFFF14;/);
  assert.match(industrial, /--fa-hazard:\s*repeating-linear-gradient\(45deg, #FFE400 0 4px, #141414 4px 8px\);/);
  assert.match(industrial, /--fa-font-label:\s*var\(--fa-font-code\);/);
  assert.match(css, /:root \{[^}]*--fa-corner-shape:\s*round;/);
  assert.match(css, /--fa-toolbar-logo-radius:\s*16px;/);
});

test('forced colors cover the industrial theme and drop its ornaments', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/)[1];
  assert.match(block, /\[data-theme="industrial"\]/);
  assert.match(block, /--fa-hazard:\s*none;/);
  assert.match(block, /--fa-grid-line:\s*transparent;/);
});

test('base layer applies the theme corner shape to every element', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  assert.match(css, /\*, \*::before, \*::after \{ corner-shape: var\(--fa-corner-shape, round\); \}/);
});
