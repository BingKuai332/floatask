'use strict';

function shouldDeferBounds(mode, reducedMotion) {
  return !reducedMotion && mode !== 'expanded';
}

module.exports = { shouldDeferBounds };
