'use strict';

(function () {
  const DEFAULT_STACK = '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif';
  const CUSTOM_FAMILY = 'FloatAsk Custom';
  let currentFace = '';

  function escapeFamily(family) {
    return String(family).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function ensureCustomFace(file) {
    if (!file) return;
    let style = document.getElementById('floatask-custom-face');
    if (!style) {
      style = document.createElement('style');
      style.id = 'floatask-custom-face';
      document.head.appendChild(style);
    }
    if (currentFace === file && style.textContent) return;
    currentFace = file;
    const url = `floatask-font://font/${encodeURIComponent(file)}`;
    style.textContent = `@font-face{font-family:"${CUSTOM_FAMILY}";src:url("${url}");font-display:swap;}`;
  }

  function stack(font) {
    if (font?.family === 'custom') {
      if (!font.customFile) return DEFAULT_STACK;
      ensureCustomFace(font.customFile);
      return `"${CUSTOM_FAMILY}", ${DEFAULT_STACK}`;
    }
    if (!font?.family || font.family === 'system') return DEFAULT_STACK;
    return `"${escapeFamily(font.family)}", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif`;
  }

  function apply(font, options = {}) {
    const value = stack(font);
    const root = document.documentElement;
    if (options.reading) root.style.setProperty('--reading-font', value);
    if (options.ui) {
      if ((font?.scope || 'all') === 'reading') root.style.removeProperty('--font');
      else root.style.setProperty('--font', value);
    }
    return value;
  }

  window.FloatAskFont = { apply, stack, ensureCustomFace, DEFAULT_STACK, CUSTOM_FAMILY };
})();
