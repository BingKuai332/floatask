'use strict';
// Pure theme-preference rules shared by the store and the main process.
// `system` only ever follows Windows between 朝日 (light) and 近月 (dark).
// Explicit themes come from the shared registry (src/shared/theme-ids.js).
const { IDS, isExplicitTheme, schemeOf } = require('../shared/theme-ids');

const THEME_PREFERENCES = Object.freeze(['system', ...IDS]);

function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : 'system';
}

/** Electron nativeTheme.themeSource for a preference: each theme drives native chrome by its scheme. */
function nativeThemeSource(preference) {
  return schemeOf(preference) || 'system';
}

function resolveThemeId(preference, systemDark) {
  if (isExplicitTheme(preference)) return preference;
  return systemDark ? 'dark' : 'light';
}

module.exports = { THEME_PREFERENCES, normalizeThemePreference, nativeThemeSource, resolveThemeId };
