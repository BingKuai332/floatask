'use strict';
// Focus discipline for popup menus. Opening moves focus into the menu, arrow
// keys move between items, Enter activates, Escape closes the menu and returns
// focus to the trigger (a second Escape is left for the hosting window), and
// an outside pointer press closes the menu and returns focus as well.
(function (global) {
  function focusMenu({ trigger, menu, onClose } = {}) {
    if (!trigger || !menu) throw new Error('focusMenu requires {trigger, menu}');
    const doc = trigger.ownerDocument;
    menu.setAttribute('role', menu.getAttribute('role') || 'menu');
    trigger.setAttribute('aria-haspopup', 'menu');
    // focusMenu owns the menu's visibility; start from a closed state.
    menu.hidden = true;

    let open = false;

    const items = () => Array.from(menu.querySelectorAll('.fa-menu-item, [role="menuitem"]'))
      .filter(el => !el.disabled);

    function setOpen(value, { returnFocus = true } = {}) {
      if (open === value) return;
      open = value;
      menu.hidden = !value;
      trigger.setAttribute('aria-expanded', String(value));
      if (value) {
        const first = items()[0];
        if (first) first.focus();
      } else {
        const active = doc.activeElement;
        if (returnFocus && active && menu.contains(active)) trigger.focus();
        if (typeof onClose === 'function') onClose();
      }
    }

    function onKeyDown(event) {
      if (!open) return;
      const list = items();
      const index = list.indexOf(doc.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        (list[index + 1] || list[0] || {}).focus?.();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        (list[index - 1] || list[list.length - 1] || {}).focus?.();
      } else if (event.key === 'Tab') {
        // Let focus leave: close without stealing it back.
        setOpen(false, { returnFocus: false });
      }
    }

    function onPointerDown(event) {
      if (!open) return;
      if (menu.contains(event.target) || trigger.contains(event.target)) return;
      setOpen(false);
    }

    function onTriggerClick() {
      setOpen(!open);
    }

    trigger.addEventListener('click', onTriggerClick);
    menu.addEventListener('keydown', onKeyDown);
    doc.addEventListener('pointerdown', onPointerDown);

    return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!open),
      isOpen: () => open,
      destroy() {
        trigger.removeEventListener('click', onTriggerClick);
        menu.removeEventListener('keydown', onKeyDown);
        doc.removeEventListener('pointerdown', onPointerDown);
      }
    };
  }

  const api = { menu: focusMenu };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.FloatAskFocus = api;
})(typeof window !== 'undefined' ? window : globalThis);
