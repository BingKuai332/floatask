'use strict';

function updateHover(state, inside, expanded) {
  if (!inside) return { suppressed: false, action: expanded ? 'collapse' : null };
  if (state.suppressed || expanded) return { suppressed: state.suppressed, action: null };
  return { suppressed: false, action: 'expand' };
}

function suppressHover(state) {
  return { suppressed: true };
}

module.exports = { updateHover, suppressHover };
