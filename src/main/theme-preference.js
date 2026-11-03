'use strict';
// Pure theme-preference rules shared by the store and the main process.
// `system` only ever follows Windows between 朝日 (light) and 近月 (dark).

const THEME_PREFERENCES = Object.freeze(['system', 'light', 'dark', 'industrial']);

function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : 'system';
}

/** Electron nativeTheme.themeSource for a preference: industrial is a dark theme. */
function nativeThemeSource(preference) {
  if (preference === 'light') return 'light';
  if (preference === 'dark' || preference === 'industrial') return 'dark';
  return 'system';
}

function resolveThemeId(preference, systemDark) {
  if (preference === 'light' || preference === 'dark' || preference === 'industrial') return preference;
  return systemDark ? 'dark' : 'light';
}

module.exports = { THEME_PREFERENCES, normalizeThemePreference, nativeThemeSource, resolveThemeId };
