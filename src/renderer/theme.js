'use strict';
// Theme runtime: resolves the saved preference (system/light/dark) against the
// OS appearance and pins the concrete variant on <html data-theme="...">.
// Windows high contrast is handled by generated CSS (forced-colors); it never
// changes the saved preference or the data-theme attribute.
(function (global) {
  function resolveTheme(preference, systemDark) {
    if (preference === 'light' || preference === 'dark') return preference;
    return systemDark ? 'dark' : 'light';
  }

  function systemPrefersDark() {
    try {
      return Boolean(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return true;
    }
  }

  function apply(theme) {
    if (!global.document || !theme) return;
    global.document.documentElement.dataset.theme = theme;
  }

  async function init() {
    const api = global.floatask;
    if (!api || typeof api.getSettings !== 'function') return;
    let preference = 'system';
    try {
      preference = (await api.getSettings()).theme || 'system';
    } catch { /* keep system default */ }
    apply(resolveTheme(preference, systemPrefersDark()));
    if (typeof api.onThemeUpdated === 'function') {
      api.onThemeUpdated(payload => {
        if (!payload) return;
        if (payload.preference) preference = payload.preference;
        if (payload.theme) apply(payload.theme);
      });
    }
    // Belt and braces for system mode: also react to OS-level changes locally.
    try {
      const media = global.matchMedia('(prefers-color-scheme: dark)');
      if (media && typeof media.addEventListener === 'function') {
        media.addEventListener('change', () => {
          if (preference === 'system') apply(resolveTheme(preference, systemPrefersDark()));
        });
      }
    } catch { /* matchMedia unavailable */ }
  }

  const api = { resolveTheme };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global.document && global.document.documentElement) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
