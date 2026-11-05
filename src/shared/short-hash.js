'use strict';
// Short session label (0x3F2A) derived from a history record id. Shared by
// the main process (tests) and renderers (window.FloatAskShortHash).
(function (global) {
  function shortHash(value) {
    const text = String(value || '');
    if (!text) return '';
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `0x${((hash ^ (hash >>> 16)) & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  const api = { shortHash };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.FloatAskShortHash = api;
})(typeof window !== 'undefined' ? window : globalThis);
