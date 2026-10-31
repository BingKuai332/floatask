'use strict';
// Single source for main-process geometry constants: values come from
// design-tokens.yaml, so renderer CSS and main-process window sizing can
// never drift apart. Renderer-side consumers read the generated CSS
// variables in theme.css instead.

const path = require('node:path');
const { loadTokens } = require('../../scripts/build-theme');

const tokens = loadTokens(path.join(__dirname, '..', '..', 'design-mockups', 'graphite-system', 'design-tokens.yaml'));

module.exports = Object.freeze({
  ANSWER_COMPACT_SIZE: Object.freeze([...tokens.components.answerWindow.compactSize]),
  ANSWER_EXPANDED_SIZE: Object.freeze([...tokens.components.answerWindow.expandedSize]),
  CAPSULE_EXPANDED: Object.freeze([...tokens.components.toolbar.expandedSize]),
  CAPSULE_COLLAPSED_VERTICAL: Object.freeze([...tokens.components.toolbar.collapsedVertical]),
  CAPSULE_COLLAPSED_HORIZONTAL: Object.freeze([...tokens.components.toolbar.collapsedHorizontal]),
  TOOLBAR_OUTER_RADIUS: tokens.components.toolbar.outerRadius,
  TOOLBAR_COLLAPSED_RADIUS: tokens.components.toolbar.collapsedOuterRadius,
  TOOLBAR_PRIMARY_RADIUS: tokens.components.toolbar.primaryRadius,
  TOOLBAR_PADDING: tokens.components.toolbar.padding,
  DENSITY: Object.freeze({
    compact: tokens.readingDensity.compact,
    relaxed: tokens.readingDensity.relaxed,
    standard: tokens.readingDensity.standard
  })
});
