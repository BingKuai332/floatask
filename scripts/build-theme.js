'use strict';
// Generates src/renderer/theme.css from design-mockups/graphite-system/design-tokens.yaml.
// theme.css is a build artifact: resolve conflicts in the YAML or here, then regenerate.
// Usage:
//   node scripts/build-theme.js              write src/renderer/theme.css
//   node scripts/build-theme.js --out <path> write a different file
//   node scripts/build-theme.js --check      fail (exit 1) if the target drifts from the tokens
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const DEFAULT_TOKENS_PATH = path.join(REPO_ROOT, 'design-mockups', 'graphite-system', 'design-tokens.yaml');
const DEFAULT_OUT_PATH = path.join(REPO_ROOT, 'src', 'renderer', 'theme.css');

function loadTokens(tokensPath = DEFAULT_TOKENS_PATH) {
  const tokens = YAML.parse(fs.readFileSync(tokensPath, 'utf8'));
  // Fail loudly on a malformed token source instead of emitting `undefinedpx`.
  const numericPaths = [
    ['radius', 'window'], ['radius', 'container'], ['radius', 'control'], ['radius', 'small'],
    ['radius', 'media'], ['radius', 'compact'], ['radius', 'mini'],
    ['typography', 'microText', 'kicker'], ['typography', 'microText', 'micro'],
    ['typography', 'microText', 'nano'], ['typography', 'microText', 'caption'],
    ['components', 'answerWindow', 'compactSize'], ['components', 'answerWindow', 'expandedSize'],
    ['components', 'toolbar', 'expandedSize'], ['components', 'toolbar', 'collapsedVertical'],
    ['components', 'toolbar', 'collapsedHorizontal'], ['components', 'toolbar', 'outerRadius'],
    ['components', 'toolbar', 'collapsedOuterRadius'], ['components', 'toolbar', 'primaryRadius'],
    ['components', 'toolbar', 'padding'],
    ['readingDensity', 'compact'], ['readingDensity', 'relaxed'], ['readingDensity', 'standard']
  ];
  for (const segments of numericPaths) {
    let node = tokens;
    for (const key of segments) node = node?.[key];
    const values = Array.isArray(node) ? node : [node];
    if (!values.length || !values.every((value) => Number.isFinite(value))) {
      throw new Error(`design-tokens.yaml: ${segments.join('.')} must be a finite number or an array of finite numbers`);
    }
  }
  return tokens;
}

function kebab(name) {
  // Split on case changes and on letter→digit boundaries: surface2 -> surface-2.
  return name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}

function shadow({ blur, color, offset }) {
  return `${offset[0]}px ${offset[1]}px ${blur}px ${color}`;
}

function themeBlock(id, theme, extraSelector) {
  const lines = [];
  const selector = extraSelector ? `${extraSelector},\n[data-theme="${id}"]` : `[data-theme="${id}"]`;
  lines.push(`${selector} {`);
  lines.push(`  color-scheme: ${id};`);
  for (const [role, value] of Object.entries(theme.colors)) {
    lines.push(`  --fa-${kebab(role)}: ${value};`);
  }
  for (const [border, spec] of Object.entries(theme.borders)) {
    lines.push(`  --fa-border-${border}: ${spec.color};`);
  }
  for (const [name, spec] of Object.entries(theme.shadows)) {
    lines.push(`  --fa-shadow-${name}: ${shadow(spec)};`);
  }
  // Migration aliases: the pre-migration hand-written variable names keep
  // working by pointing at the semantic tokens. Remove per deprecation rule
  // once component CSS no longer references them (Task 3+).
  const aliases = {
    'bg': 'fa-bg',
    'bg-soft': 'fa-surface',
    'panel': 'fa-surface',
    'panel-2': 'fa-surface-2',
    'text': 'fa-text',
    'muted': 'fa-muted',
    'muted-2': 'fa-faint',
    'line': 'fa-border-control',
    'line-strong': 'fa-border-floating',
    'accent': 'fa-accent',
    'accent-2': 'fa-accent',
    'accent-3': 'fa-accent',
    'danger': 'fa-red',
    'ok': 'fa-green',
    'radius': 'fa-radius-control',
    'font': 'fa-font-ui',
    'mono': 'fa-font-code'
  };
  for (const [alias, target] of Object.entries(aliases)) {
    lines.push(`  --${alias}: var(--${target});`);
  }
  lines.push('}');
  return lines.join('\n');
}

function systemMedia() {
  // Windows high contrast takes the palette away from both themes: system
  // semantic colors win, shadows and glows disappear, borders stay 1px.
  return `\
@media (forced-colors: active) {
  :root,
  [data-theme="dark"],
  [data-theme="light"] {
    --fa-bg: Canvas;
    --fa-surface: Canvas;
    --fa-surface-2: Canvas;
    --fa-surface-3: ButtonFace;
    --fa-divider: CanvasText;
    --fa-text: CanvasText;
    --fa-body: CanvasText;
    --fa-muted: GrayText;
    --fa-faint: GrayText;
    --fa-accent: LinkText;
    --fa-accent-soft: Highlight;
    --fa-green: CanvasText;
    --fa-red: CanvasText;
    --fa-red-soft: Canvas;
    --fa-primary-button: ButtonFace;
    --fa-on-primary: ButtonText;
    --fa-overlay: Canvas;
    --fa-border-floating: CanvasText;
    --fa-border-control: CanvasText;
    --fa-border-active: Highlight;
    --fa-border-danger: CanvasText;
    --fa-shadow-floating: none;
    --fa-shadow-toolbar: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --fa-motion-theme-color: 0ms;
    --fa-motion-toolbar: 0ms;
    --fa-motion-toolbar-fade: 0ms;
    --fa-motion-toolbar-expand-delay: 0ms;
    --fa-motion-hover-expand: 0ms;
    --fa-motion-leave-collapse: 0ms;
  }
}`;
}

function renderTheme(tokens) {
  const t = tokens.typography;
  const m = tokens.motion;
  const c = tokens.components;
  const root = `\
:root {
  /* radius: ${tokens.radius.window}/${tokens.radius.container}/${tokens.radius.control}/${tokens.radius.small} px + pill */
  --fa-radius-window: ${tokens.radius.window}px;
  --fa-radius-container: ${tokens.radius.container}px;
  --fa-radius-control: ${tokens.radius.control}px;
  --fa-radius-small: ${tokens.radius.small}px;
  --fa-radius-media: ${tokens.radius.media}px;
  --fa-radius-compact: ${tokens.radius.compact}px;
  --fa-radius-mini: ${tokens.radius.mini}px;
  --fa-radius-pill: 999px;
  /* spacing */
  --fa-space-unit: ${tokens.spacing.unit}px;
  --fa-window-padding: ${tokens.spacing.windowPadding}px;
  --fa-container-padding: ${tokens.spacing.containerPadding}px;
  --fa-control-gap: ${tokens.spacing.controlGap}px;
  --fa-section-gap: ${tokens.spacing.sectionGap}px;
  --fa-floating-gap: ${tokens.spacing.floatingGap}px;
  /* fonts */
  --fa-font-latin: "${tokens.fonts.latin}";
  --fa-font-cjk: "${tokens.fonts.cjk}";
  --fa-font-code: "Cascadia Mono", "Cascadia Code", Consolas, "Liberation Mono", monospace;
  --fa-font-ui: "${tokens.fonts.latin}", "${tokens.fonts.cjk}", "Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  /* typography */
  --fa-size-window-title: ${t.windowTitle.size}px;
  --fa-weight-window-title: ${t.windowTitle.weight};
  --fa-size-section-title: ${t.sectionTitle.size}px;
  --fa-weight-section-title: ${t.sectionTitle.weight};
  --fa-size-answer-title: ${t.answerTitle.size}px;
  --fa-weight-answer-title: ${t.answerTitle.weight};
  --fa-size-answer: ${t.defaultAnswerSize}px;
  --fa-answer-sizes: ${t.answerSizes.join('px, ')}px;
  --fa-line-height-answer: ${t.answerBodyLarge.lineHeight};
  --fa-size-answer-body: ${t.answerBody.size}px;
  --fa-line-height-body: ${t.answerBody.lineHeight};
  --fa-size-control: ${t.control.size}px;
  --fa-line-height-control: ${t.control.lineHeight};
  --fa-size-aux: ${t.auxiliaryMin}px;
  --fa-size-kicker: ${t.microText.kicker}px;
  --fa-size-micro: ${t.microText.micro}px;
  --fa-size-nano: ${t.microText.nano}px;
  --fa-size-caption: ${t.microText.caption}px;
  /* motion */
  --fa-motion-theme-color: ${m.themeColorDuration}ms;
  --fa-motion-toolbar: ${m.toolbarDuration}ms;
  --fa-motion-toolbar-fade: ${m.toolbarCollapseFade}ms;
  --fa-motion-toolbar-expand-delay: ${m.toolbarExpandDelay}ms;
  --fa-motion-hover-expand: ${m.hoverExpandDelay}ms;
  --fa-motion-leave-collapse: ${m.leaveCollapseDelay}ms;
  --fa-easing: ${m.easing};
  /* keyboard focus: ${tokens.accessibility.keyboardFocusOutlineWidth} DIP outline + ${tokens.accessibility.keyboardFocusOutlineOffset} DIP offset */
  --fa-focus-outline-width: ${tokens.accessibility.keyboardFocusOutlineWidth}px;
  --fa-focus-outline-offset: ${tokens.accessibility.keyboardFocusOutlineOffset}px;
  /* component geometry */
  --fa-answer-compact-width: ${c.answerWindow.compactSize[0]}px;
  --fa-answer-compact-height: ${c.answerWindow.compactSize[1]}px;
  --fa-answer-expanded-width: ${c.answerWindow.expandedSize[0]}px;
  --fa-answer-expanded-height: ${c.answerWindow.expandedSize[1]}px;
  --fa-settings-sidebar-width: ${c.settingsWindow.sidebarWidth}px;
  --fa-toolbar-width: ${c.toolbar.expandedSize[0]}px;
  --fa-toolbar-height: ${c.toolbar.expandedSize[1]}px;
  --fa-toolbar-radius: ${c.toolbar.outerRadius}px;
  --fa-toolbar-collapsed-radius: ${c.toolbar.collapsedOuterRadius}px;
  --fa-toolbar-primary-radius: ${c.toolbar.primaryRadius}px;
  --fa-toolbar-padding: ${c.toolbar.padding}px;
  --fa-more-menu-width: ${c.moreMenu.size[0]}px;
  --fa-more-menu-height: ${c.moreMenu.size[1]}px;
  --fa-button-height: ${c.controls.buttonHeight}px;
  --fa-input-height: ${c.controls.inputHeight}px;
  --fa-chip-height: ${c.controls.chipHeight}px;
  --fa-switch-width: ${c.controls.switchSize[0]}px;
  --fa-switch-height: ${c.controls.switchSize[1]}px;
  --fa-snap-distance: ${c.toolbar.snapDistance}px;
  --fa-expanded-edge-gap: ${c.toolbar.expandedEdgeGap}px;
}`;

  const base = `\
/* Base layer: resets and shared primitives. Component classes (.fa-*) arrive with Task 3. */
/* Bundled typefaces; license notes live in resources/fonts/LICENSE.txt. */
@font-face {
  font-family: 'Liter';
  src: url('../../resources/fonts/Liter.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'MiSans';
  src: url('../../resources/fonts/MiSans.ttf') format('truetype');
  font-display: swap;
}

* { box-sizing: border-box; }

[hidden] { display: none !important; }

html, body {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--fa-text);
  font-family: var(--fa-font-ui);
  font-size: 13px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  user-select: none;
}

button, input, textarea, select { font-family: inherit; color: inherit; }
button { cursor: pointer; }

::selection { background: var(--fa-accent-soft); color: var(--fa-text); }

[data-density='compact'] { --fa-density-factor: ${tokens.readingDensity.compact}; }
[data-density='relaxed'] { --fa-density-factor: ${tokens.readingDensity.relaxed}; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--fa-border-floating); border-radius: var(--fa-radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--fa-muted); }

.drag { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--fa-radius-control);
  background: transparent;
  color: var(--fa-muted);
  transition: background var(--fa-motion-theme-color) var(--fa-easing), color var(--fa-motion-theme-color) var(--fa-easing), border-color var(--fa-motion-theme-color) var(--fa-easing);
}
.icon-btn:hover { background: var(--fa-accent-soft); color: var(--fa-accent); border-color: var(--fa-border-control); }
.icon-btn:active { transform: translateY(1px); }
.icon-btn svg { width: 15px; height: 15px; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: var(--fa-button-height);
  padding: 0 14px;
  border-radius: var(--fa-radius-control);
  border: 1px solid var(--fa-border-control);
  background: var(--fa-surface-2);
  color: var(--fa-text);
  font-size: var(--fa-size-control);
  font-weight: 550;
  letter-spacing: 0.04em;
  transition: background var(--fa-motion-theme-color) var(--fa-easing), border-color var(--fa-motion-theme-color) var(--fa-easing), color var(--fa-motion-theme-color) var(--fa-easing);
}
.btn:hover { background: var(--fa-surface-3); border-color: var(--fa-border-floating); }
.btn:active { transform: translateY(1px); }
.btn.primary { border-color: var(--fa-primary-button); background: var(--fa-primary-button); color: var(--fa-on-primary); font-weight: 650; }
.btn.primary:hover { border-color: var(--fa-primary-button); background: var(--fa-primary-button); color: var(--fa-on-primary); }
.btn.ghost { border-color: transparent; background: transparent; color: var(--fa-muted); }
.btn.ghost:hover { color: var(--fa-text); background: var(--fa-surface-2); }
.btn.danger { color: var(--fa-red); border-color: var(--fa-red); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.kbd {
  display: inline-flex;
  align-items: center;
  height: 19px;
  padding: 0 6px;
  border-radius: var(--fa-radius-small);
  border: 1px solid var(--fa-border-control);
  background: var(--fa-surface-2);
  color: var(--fa-muted);
  font-family: var(--fa-font-code);
  font-size: var(--fa-size-caption);
  letter-spacing: 0.05em;
}

.dot { width: 5px; height: 5px; border-radius: var(--fa-radius-pill); background: var(--fa-accent); }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}`;

  const header = `/* Generated by scripts/build-theme.js from design-mockups/graphite-system/design-tokens.yaml (v${tokens.version}). */\n/* Do not edit by hand: fix the tokens or the generator, then run \`npm run build:tokens\`. */`;
  return [header, root, themeBlock('dark', tokens.themes.dark, ':root'), themeBlock('light', tokens.themes.light), systemMedia(), base, ''].join('\n\n');
}

function parseArgs(argv) {
  const args = { check: false, out: DEFAULT_OUT_PATH };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--out') {
      const value = argv[++i];
      if (!value) { console.error('--out requires a path'); process.exit(2); }
      args.out = path.resolve(value);
    }
    else { console.error(`unknown argument: ${argv[i]}`); process.exit(2); }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const css = renderTheme(loadTokens());
  if (args.check) {
    let current = null;
    try { current = fs.readFileSync(args.out, 'utf8'); } catch { /* missing file */ }
    if (current !== css) {
      console.error(`theme drift: ${path.relative(REPO_ROOT, args.out)} is not in sync with design-tokens.yaml. Run \`npm run build:tokens\`.`);
      process.exit(1);
    }
    console.log(`theme in sync: ${path.relative(REPO_ROOT, args.out)}`);
    return;
  }
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, css);
  console.log(`wrote ${path.relative(REPO_ROOT, args.out)}`);
}

if (require.main === module) main();

module.exports = { loadTokens, renderTheme, DEFAULT_TOKENS_PATH, DEFAULT_OUT_PATH };
