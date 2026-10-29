'use strict';
(function () {
  function normalizeHotkey(value) {
    const tokens = String(value || '').split('+').map(s => s.trim());
    const modifiers = ['Ctrl', 'Alt', 'Shift'];
    const keys = tokens.filter(s => !modifiers.includes(s));
    if (tokens.length < 2 || new Set(tokens).size !== tokens.length || keys.length !== 1) return null;
    const key = keys[0];
    if (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|num(?:[0-9]|dec|add|sub|mult|div)|Space|Tab|Enter|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right|`)$/i.test(key)) return null;
    const mods = modifiers.filter(s => tokens.includes(s));
    if (!mods.length || (mods.length === 1 && mods[0] === 'Shift')) return null;
    if (mods.includes('Alt') && ['F4','TAB'].includes(key.toUpperCase())) return null;
    const normalizedKey = /^num/i.test(key) ? key.toLowerCase() : key.length === 1 && key !== '`' ? key.toUpperCase() : key;
    return [...mods, normalizedKey].join('+');
  }
  function fromKeyboard(event) {
    if (event.metaKey || event.isComposing || event.repeat) return null;
    const names = { ' ': 'Space', ArrowUp:'Up', ArrowDown:'Down', ArrowLeft:'Left', ArrowRight:'Right' };
    let key = names[event.key] || event.key;
    if (/^Key[A-Z]$/.test(event.code)) key = event.code.slice(3);
    if (/^Digit[0-9]$/.test(event.code)) key = event.code.slice(5);
    // Electron distinguishes NumPad digit/operator accelerators from the main
    // keyboard. With NumLock off, retain the actual navigation key instead.
    if (/^Numpad[0-9]$/.test(event.code) && /^[0-9]$/.test(event.key)) key = 'num' + event.code.slice(6);
    const numpadNames = { NumpadAdd:'numadd', NumpadSubtract:'numsub', NumpadMultiply:'nummult', NumpadDivide:'numdiv' };
    if (numpadNames[event.code]) key = numpadNames[event.code];
    if (event.code === 'NumpadDecimal' && ['.', ','].includes(event.key)) key = 'numdec';
    if (event.code === 'Backquote') key = '`';
    return normalizeHotkey([event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', key].filter(Boolean).join('+'));
  }
  const api = { normalizeHotkey, fromKeyboard };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.FloatAskHotkeys = api;
})();
