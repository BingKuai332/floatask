'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const geometry = require('../src/main/window-geometry');
const {
  SNAP_DISTANCE,
  EXPANDED_EDGE_GAP,
  CAPSULE_EXPANDED,
  HALF_CAPSULE_VERTICAL,
  HALF_CAPSULE_HORIZONTAL,
  snapToolbar,
  clampToWorkArea,
  physicalSize,
  edgeGapPosition
} = geometry;

const AREA = { x: 0, y: 0, width: 1920, height: 1080 };
const SIZE = { width: CAPSULE_EXPANDED[0], height: CAPSULE_EXPANDED[1] };

test('constants match the design tokens', () => {
  assert.equal(SNAP_DISTANCE, 24);
  assert.equal(EXPANDED_EDGE_GAP, 8);
  assert.deepEqual(CAPSULE_EXPANDED, [328, 52]);
  assert.deepEqual(HALF_CAPSULE_VERTICAL, [44, 64]);
  assert.deepEqual(HALF_CAPSULE_HORIZONTAL, [64, 44]);
});

test('snapToolbar docks to the nearest edge within 24 DIP', () => {
  const left = snapToolbar({ x: 20, y: 500 }, SIZE, AREA);
  assert.equal(left.edge, 'left');
  assert.equal(left.position.x, AREA.x);
  assert.equal(left.position.y, 500);

  const right = snapToolbar({ x: AREA.width - SIZE.width - 10, y: 300 }, SIZE, AREA);
  assert.equal(right.edge, 'right');
  assert.equal(right.position.x, AREA.x + AREA.width - SIZE.width);

  const top = snapToolbar({ x: 700, y: 12 }, SIZE, AREA);
  assert.equal(top.edge, 'top');
  assert.equal(top.position.y, AREA.y);

  const bottom = snapToolbar({ x: 700, y: AREA.height - SIZE.height - 20 }, SIZE, AREA);
  assert.equal(bottom.edge, 'bottom');
  assert.equal(bottom.position.y, AREA.y + AREA.height - SIZE.height);
});

test('snapToolbar keeps floating position away from edges', () => {
  const result = snapToolbar({ x: 800, y: 500 }, SIZE, AREA);
  assert.equal(result.edge, null);
  assert.deepEqual(result.position, { x: 800, y: 500 });
});

test('snapToolbar clamps position into the work area first', () => {
  const result = snapToolbar({ x: -30, y: 500 }, SIZE, AREA);
  assert.equal(result.position.x, AREA.x);
  assert.equal(result.edge, 'left');
});

test('clampToWorkArea keeps a window fully inside any work area', () => {
  const area = { x: 100, y: 50, width: 800, height: 600 };
  assert.deepEqual(clampToWorkArea({ x: 0, y: 0, width: 328, height: 52 }, area), { x: 100, y: 50, width: 328, height: 52 });
  assert.deepEqual(clampToWorkArea({ x: 2000, y: 2000, width: 328, height: 52 }, area), { x: 100 + 800 - 328, y: 50 + 600 - 52, width: 328, height: 52 });
  // Window larger than the work area shrinks instead of escaping.
  const shrunk = clampToWorkArea({ x: 500, y: 500, width: 2000, height: 900 }, area);
  assert.equal(shrunk.width, 800);
  assert.equal(shrunk.height, 600);
});

test('physicalSize maps DIP to physical pixels at 100/125/150 percent', () => {
  assert.deepEqual(physicalSize([480, 360], 1), [480, 360]);
  assert.deepEqual(physicalSize([480, 360], 1.25), [600, 450]);
  assert.deepEqual(physicalSize([480, 360], 1.5), [720, 540]);
});

test('edgeGapPosition floats the expanded capsule 8 DIP off its edge', () => {
  const left = edgeGapPosition('left', SIZE, { x: 0, y: 500 }, AREA);
  assert.equal(left.x, AREA.x + EXPANDED_EDGE_GAP);
  assert.equal(left.y, 500);

  const right = edgeGapPosition('right', SIZE, { x: 1600, y: 500 }, AREA);
  assert.equal(right.x, AREA.x + AREA.width - EXPANDED_EDGE_GAP - SIZE.width);

  const top = edgeGapPosition('top', SIZE, { x: 700, y: 0 }, AREA);
  assert.equal(top.y, AREA.y + EXPANDED_EDGE_GAP);

  const bottom = edgeGapPosition('bottom', SIZE, { x: 700, y: 900 }, AREA);
  assert.equal(bottom.y, AREA.y + AREA.height - EXPANDED_EDGE_GAP - SIZE.height);
});
