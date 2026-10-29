'use strict';

const { createT, normalizeLocale } = require('../shared/i18n');
const store = require('./store');

let cachedLang = null;
let cachedT = null;

function lang() {
  return normalizeLocale(store.getConfig().language);
}

/**
 * Translate in the main process. The language is read from the config on
 * every call so a settings change applies immediately.
 */
function t(key, params) {
  const current = lang();
  if (current !== cachedLang || !cachedT) {
    cachedT = createT(current);
    cachedLang = current;
  }
  return cachedT(key, params);
}

module.exports = { t, lang };
