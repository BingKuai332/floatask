'use strict';
// Single registry of the explicit themes and their native color scheme.
// Shared by the main process (module.exports) and renderers
// (window.FloatAskThemeIds). `system` is a preference, not a theme: it only
// ever resolves to light or dark. Keep in sync with design-tokens.yaml
// (themeIds / themes); tests/theme-ids.test.js fails when they drift.
(function (global) {
  const THEMES = Object.freeze([
    Object.freeze({ id: 'light', scheme: 'light' }),
    Object.freeze({ id: 'dark', scheme: 'dark' }),
    Object.freeze({ id: 'industrial', scheme: 'dark' })
  ]);
  const IDS = Object.freeze(THEMES.map(theme => theme.id));

  function isExplicitTheme(id) {
    return IDS.includes(id);
  }

  /** Native color scheme ('light' | 'dark') of an explicit theme, else null. */
  function schemeOf(id) {
    const theme = THEMES.find(entry => entry.id === id);
    return theme ? theme.scheme : null;
  }

  const api = { THEMES, IDS, isExplicitTheme, schemeOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.FloatAskThemeIds = api;
})(typeof window !== 'undefined' ? window : globalThis);
