'use strict';
// Guards every screen-selection entry (global hotkey, tray, tray icon,
// launcher bubble, result-window button) against silently discarding a
// pending OCR correction. Deliberately dependency-free so the unit tests can
// require it directly.

function createSelectionGuard(deps) {
  const {
    hasPendingCorrection,
    hasResultWindow,
    showResultWindow,
    askRenderer,
    askNative,
    timeoutMs = 15000
  } = deps;

  return {
    async confirm() {
      if (!hasPendingCorrection()) return true;
      if (hasResultWindow()) {
        showResultWindow();
        // A rejected or broken renderer reply is a refusal, never a pass.
        const reply = Promise.resolve()
          .then(() => askRenderer())
          .catch(() => false);
        const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
        return Boolean(await Promise.race([reply, timeout]));
      }
      return Boolean(await Promise.resolve().then(() => askNative()).catch(() => false));
    }
  };
}

module.exports = { createSelectionGuard };
