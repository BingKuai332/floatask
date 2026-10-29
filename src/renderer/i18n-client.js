'use strict';

/**
 * Renderer-side i18n bootstrap. Requires shared/i18n.js (FloatAskI18N) and
 * window.floatask to be loaded first. Applies translations to any element
 * carrying data-i18n (textContent), data-i18n-html (innerHTML),
 * data-i18n-ph (placeholder) or data-i18n-title (title) attributes, and
 * re-applies whenever the main process pushes a language change.
 */
(function () {
  const I18N = window.FloatAskI18N;
  const api = window.floatask;
  if (!I18N) return;

  let current = 'zh-CN';
  let translate = I18N.createT(current);

  function applyRoot() {
    document.documentElement.lang = current === 'en' ? 'en' : 'zh-CN';
  }

  function applyStatic() {
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = translate(el.dataset.i18n);
    }
    for (const el of document.querySelectorAll('[data-i18n-html]')) {
      el.innerHTML = translate(el.dataset.i18nHtml);
    }
    for (const el of document.querySelectorAll('[data-i18n-ph]')) {
      el.setAttribute('placeholder', translate(el.dataset.i18nPh));
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
      el.setAttribute('title', translate(el.dataset.i18nTitle));
    }
    for (const [attr, data] of [['alt', 'i18nAlt'], ['aria-label', 'i18nAria']]) {
      for (const el of document.querySelectorAll('[data-' + data.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ']')) el.setAttribute(attr, translate(el.dataset[data]));
    }
    applyRoot();
  }

  function setLanguage(langCode, { broadcast = false } = {}) {
    current = I18N.normalizeLocale(langCode);
    translate = I18N.createT(current);
    window.FloatAskLang = current;
    window.FloatAskT = translate;
    applyStatic();
    document.dispatchEvent(new CustomEvent('floatask:language', { detail: { language: current } }));
    if (broadcast) {
      // Re-apply once more in case dynamic markup rendered late.
      setTimeout(applyStatic, 60);
    }
  }

  window.FloatAskI18n = {
    t: (key, params) => translate(key, params),
    get language() { return current; },
    apply: applyStatic,
    setLanguage
  };

  if (api?.onLanguageUpdated) {
    api.onLanguageUpdated(({ language }) => setLanguage(language));
  }

  const boot = api?.getLanguage
    ? api.getLanguage().then((lang) => setLanguage(lang || 'zh-CN')).catch(() => setLanguage('zh-CN'))
    : Promise.resolve(setLanguage('zh-CN'));

  // Pages may want to wait for the right locale before rendering dynamic text.
  window.FloatAskI18nReady = boot;
})();
