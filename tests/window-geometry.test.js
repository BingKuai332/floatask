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
  assert.deepEqual(HALF_CAPSULE_VERTICAL, [44, 52]);
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

test('left and right edges expand vertically with the available direction', () => {
  const top = geometry.expansionPlacement('left', { x: 0, y: 100 }, AREA);
  assert.deepEqual(top, {
    axis: 'vertical', direction: 'down',
    bounds: { x: -2, y: 90, width: 72, height: 348 }
  });
  const bottom = geometry.expansionPlacement('right', { x: 1800, y: 800 }, AREA);
  assert.deepEqual(bottom, {
    axis: 'vertical', direction: 'up',
    bounds: { x: 1840, y: 724, width: 72, height: 348 }
  });
});

test('top and bottom edges expand horizontally away from the screen center', () => {
  const topLeft = geometry.expansionPlacement('top', { x: 200, y: 0 }, AREA);
  assert.deepEqual(topLeft, {
    axis: 'horizontal', direction: 'right',
    bounds: { x: 190, y: -2, width: 348, height: 72 }
  });
  const bottomRight = geometry.expansionPlacement('bottom', { x: 1600, y: 900 }, AREA);
  assert.deepEqual(bottomRight, {
    axis: 'horizontal', direction: 'left',
    bounds: { x: 1564, y: 1000, width: 348, height: 72 }
  });
});

test('collapse keeps the edge associated with its expansion direction anchored', () => {
  assert.deepEqual(
    geometry.collapseStartBounds({ x: 1856, y: 300, width: 64, height: 72 }, 'horizontal', 'left'),
    { x: 1572, y: 300, width: 348, height: 72 }
  );
  assert.deepEqual(
    geometry.collapseStartBounds({ x: 100, y: 724, width: 72, height: 72 }, 'vertical', 'up'),
    { x: 100, y: 448, width: 72, height: 348 }
  );
  assert.deepEqual(
    geometry.collapseStartBounds({ x: 100, y: 100, width: 72, height: 72 }, 'vertical', 'down'),
    { x: 100, y: 100, width: 72, height: 348 }
  );
});

test('vertical expansion only goes upward when there is insufficient space below', () => {
  assert.equal(geometry.expansionPlacement('right', { x: 1800, y: 560 }, AREA).direction, 'down');
  assert.equal(geometry.expansionPlacement('right', { x: 1800, y: 800 }, AREA).direction, 'up');
});

test('collapsed capsule drag clamps with its actual size rather than expanded width', () => {
  const collapsed = { x: 1866, y: 300, width: 64, height: 84 };
  assert.deepEqual(
    geometry.translateDragBounds(collapsed, { x: -2, y: 0 }, AREA, 10),
    { x: 1864, y: 300, width: 64, height: 84 }
  );
  const expanded = { x: 1572, y: 300, width: 348, height: 72 };
  assert.deepEqual(
    geometry.translateDragBounds(expanded, { x: -2, y: 0 }, AREA),
    { x: 1570, y: 300, width: 348, height: 72 }
  );
});
