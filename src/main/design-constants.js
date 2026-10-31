'use strict';
// Single source for main-process geometry constants, mirroring
// design-mockups/graphite-system/design-tokens.yaml so renderer CSS and
// main-process window sizing cannot drift apart. Renderer-side consumers
// read the generated CSS variables in theme.css instead.
//
// These values are literals on purpose: the packaged app excludes the
// scripts/ and yaml toolchain, and never reads the YAML at runtime. The
// design-tokens unit tests reconcile this module against the YAML on every
// test run (development), so the two cannot silently diverge.

module.exports = Object.freeze({
  ANSWER_COMPACT_SIZE: Object.freeze([480, 360]),
  ANSWER_EXPANDED_SIZE: Object.freeze([560, 640]),
  CAPSULE_EXPANDED: Object.freeze([328, 52]),
  CAPSULE_COLLAPSED_VERTICAL: Object.freeze([44, 64]),
  CAPSULE_COLLAPSED_HORIZONTAL: Object.freeze([64, 44]),
  TOOLBAR_OUTER_RADIUS: 26,
  TOOLBAR_COLLAPSED_RADIUS: 22,
  TOOLBAR_PRIMARY_RADIUS: 21,
  TOOLBAR_PADDING: 5,
  DENSITY: Object.freeze({ compact: 0.92, relaxed: 1.12, standard: 1 })
});
