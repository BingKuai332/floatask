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

const PAD = 10;
function visibleCapsule(bounds) {
  return { x: bounds.x + PAD, y: bounds.y + PAD, right: bounds.x + bounds.width - PAD, bottom: bounds.y + bounds.height - PAD };
}

test('dockAnchor places the half-capsule flush on its edge', () => {
  const floating = { x: 1500, y: 300, width: 328, height: 52 };
  assert.deepEqual(geometry.dockAnchor('right', floating, AREA), { x: 1876, y: 300, width: 44, height: 52 });
  assert.deepEqual(geometry.dockAnchor('left', floating, AREA), { x: 0, y: 300, width: 44, height: 52 });
  assert.deepEqual(geometry.dockAnchor('bottom', { x: 1700, y: 1020, width: 328, height: 52 }, AREA), { x: 1700, y: 1036, width: 64, height: 44 });
  assert.deepEqual(geometry.dockAnchor('top', { x: 200, y: 4, width: 328, height: 52 }, AREA), { x: 200, y: 0, width: 64, height: 44 });
});

test('dockedWindowBounds adds the shadow padding around the anchor', () => {
  assert.deepEqual(geometry.dockedWindowBounds({ x: 1876, y: 300, width: 44, height: 52 }, PAD), { x: 1866, y: 290, width: 64, height: 72 });
});

test('expansion grows from the anchor and keeps an 8 DIP gap on every edge', () => {
  const left = geometry.expansionPlacement('left', { x: 0, y: 100, width: 44, height: 52 }, AREA, PAD);
  assert.deepEqual(left, { axis: 'vertical', direction: 'down', bounds: { x: -2, y: 90, width: 72, height: 348 } });
  const right = geometry.expansionPlacement('right', { x: 1876, y: 800, width: 44, height: 52 }, AREA, PAD);
  assert.deepEqual(right, { axis: 'vertical', direction: 'up', bounds: { x: 1850, y: 514, width: 72, height: 348 } });
  const top = geometry.expansionPlacement('top', { x: 200, y: 0, width: 64, height: 44 }, AREA, PAD);
  assert.deepEqual(top, { axis: 'horizontal', direction: 'right', bounds: { x: 190, y: -2, width: 348, height: 72 } });
  const bottom = geometry.expansionPlacement('bottom', { x: 1600, y: 1036, width: 64, height: 44 }, AREA, PAD);
  assert.deepEqual(bottom, { axis: 'horizontal', direction: 'left', bounds: { x: 1326, y: 1010, width: 348, height: 72 } });

  assert.equal(visibleCapsule(left.bounds).x - AREA.x, 8);
  assert.equal(AREA.x + AREA.width - visibleCapsule(right.bounds).right, 8);
  assert.equal(visibleCapsule(top.bounds).y - AREA.y, 8);
  assert.equal(AREA.y + AREA.height - visibleCapsule(bottom.bounds).bottom, 8);
});

test('upward and leftward expansion stays aligned with the anchor end', () => {
  const anchorR = { x: 1876, y: 800, width: 44, height: 52 };
  const up = visibleCapsule(geometry.expansionPlacement('right', anchorR, AREA, PAD).bounds);
  assert.equal(up.bottom, anchorR.y + anchorR.height);
  const anchorB = { x: 1600, y: 1036, width: 64, height: 44 };
  const left = visibleCapsule(geometry.expansionPlacement('bottom', anchorB, AREA, PAD).bounds);
  assert.equal(left.right, anchorB.x + anchorB.width);
});

test('vertical expansion only goes upward when there is insufficient space below', () => {
  assert.equal(geometry.expansionPlacement('right', { x: 1876, y: 560, width: 44, height: 52 }, AREA, PAD).direction, 'down');
  assert.equal(geometry.expansionPlacement('right', { x: 1876, y: 800, width: 44, height: 52 }, AREA, PAD).direction, 'up');
});

test('repeated expand and collapse cycles never move the dock', () => {
  for (const [edge, anchor] of [
    ['right', { x: 1876, y: 900, width: 44, height: 52 }],
    ['bottom', { x: 1700, y: 1036, width: 64, height: 44 }],
    ['left', { x: 0, y: 300, width: 44, height: 52 }],
    ['top', { x: 1800, y: 0, width: 64, height: 44 }]
  ]) {
    const original = geometry.dockedWindowBounds(anchor, PAD);
    for (let i = 0; i < 3; i++) {
      geometry.expansionPlacement(edge, anchor, AREA, PAD);
      assert.deepEqual(geometry.dockedWindowBounds(anchor, PAD), original, `${edge} cycle ${i + 1}`);
    }
  }
});

test('sanitizeDock accepts only a known edge with a finite anchor', () => {
  assert.deepEqual(geometry.sanitizeDock({ edge: 'left', anchor: { x: 0.4, y: 300, width: 44, height: 52 } }), { edge: 'left', anchor: { x: 0, y: 300, width: 44, height: 52 } });
  assert.equal(geometry.sanitizeDock({ edge: 'middle', anchor: { x: 0, y: 0, width: 1, height: 1 } }), null);
  assert.equal(geometry.sanitizeDock({ edge: 'top', anchor: { x: 'a', y: 0, width: 1, height: 1 } }), null);
  assert.equal(geometry.sanitizeDock(null), null);
  assert.equal(geometry.sanitizeDock({ edge: 'left', anchor: { x: 0, y: 0, width: 0, height: 52 } }), null);
  assert.equal(geometry.sanitizeDock({ edge: 'left', anchor: { x: 0, y: 0, width: 44, height: -52 } }), null);
});

test('expansion respects a work area that is not at the origin', () => {
  const SECOND = { x: 1920, y: 0, width: 1920, height: 1040 };
  assert.deepEqual(
    geometry.expansionPlacement('right', { x: 3796, y: 100, width: 44, height: 52 }, SECOND, 10),
    { axis: 'vertical', direction: 'down', bounds: { x: 3770, y: 90, width: 72, height: 348 } }
  );
});

test('snapDock keeps a dragged bottom half-capsule on the bottom near the right end', () => {
  const anchor = { x: 1800, y: 1036, width: 64, height: 44 };
  const result = geometry.snapDock(anchor, { width: 64, height: 44 }, AREA, 'bottom');
  assert.equal(result.edge, 'bottom');
  assert.deepEqual(result.position, { x: 1800, y: 1036 });
});

test('snapDock prefers the previous edge on a distance tie', () => {
  // Top anchor in the top-left corner: left and top distances are both 0.
  const top = geometry.snapDock({ x: 0, y: 0 }, { width: 64, height: 44 }, AREA, 'top');
  assert.equal(top.edge, 'top');
  // Even with the full capsule width, a tie with the right edge keeps the bottom dock.
  const bottom = geometry.snapDock({ x: 1800, y: 1036 }, SIZE, AREA, 'bottom');
  assert.equal(bottom.edge, 'bottom');
  // Without a preference, ties keep snapToolbar's original order.
  assert.equal(geometry.snapDock({ x: 0, y: 0 }, { width: 64, height: 44 }, AREA).edge, 'left');
  assert.deepEqual(geometry.snapDock({ x: 0, y: 0 }, SIZE, AREA), snapToolbar({ x: 0, y: 0 }, SIZE, AREA));
  // A strictly nearer edge still wins over the preference.
  assert.equal(geometry.snapDock({ x: 5, y: 20 }, { width: 64, height: 44 }, AREA, 'top').edge, 'left');
});

test('dragSnapCapsule snaps a floating drag with the expanded capsule', () => {
  assert.deepEqual(
    geometry.dragSnapCapsule({ x: 700, y: 400, width: 348, height: 72 }, PAD),
    { capsule: { x: 710, y: 410, width: 328, height: 52 }, preferredEdge: null }
  );
});

test('dockDragResult keeps an expanded bottom dock on its edge, moving the anchor by the delta', () => {
  // Anchor at the bottom-right corner expands leftward; a tiny drag must not hop to the right edge.
  const dock = { edge: 'bottom', anchor: { x: 1856, y: 1036, width: 64, height: 44 } };
  assert.deepEqual(
    geometry.dockDragResult(dock, { x: -3, y: -2 }, AREA),
    { edge: 'bottom', anchor: { x: 1853, y: 1036, width: 64, height: 44 } }
  );
});

test('dockDragResult keeps an expanded right dock in place, moving the anchor by the delta', () => {
  // Anchor near the bottom expands upward; the expanded capsule's top must not become the anchor.
  const dock = { edge: 'right', anchor: { x: 1876, y: 1000, width: 44, height: 52 } };
  assert.deepEqual(
    geometry.dockDragResult(dock, { x: -3, y: -2 }, AREA),
    { edge: 'right', anchor: { x: 1876, y: 998, width: 44, height: 52 } }
  );
});

test('dockDragResult slides a dock along its edge', () => {
  const dock = { edge: 'left', anchor: { x: 0, y: 400, width: 44, height: 52 } };
  assert.deepEqual(
    geometry.dockDragResult(dock, { x: 5, y: 120 }, AREA),
    { edge: 'left', anchor: { x: 0, y: 520, width: 44, height: 52 } }
  );
});

test('dockDragResult undocks when pulled more than SNAP_DISTANCE off the edge', () => {
  const dock = { edge: 'bottom', anchor: { x: 900, y: 1036, width: 64, height: 44 } };
  assert.deepEqual(geometry.dockDragResult(dock, { x: 0, y: -(SNAP_DISTANCE + 1) }, AREA), { edge: null });
  // Exactly at the snap distance it still docks.
  assert.equal(geometry.dockDragResult(dock, { x: 0, y: -SNAP_DISTANCE }, AREA).edge, 'bottom');
});

test('padArea grows a work area by the shadow padding on every side', () => {
  assert.deepEqual(geometry.padArea(AREA, PAD), { x: -10, y: -10, width: 1940, height: 1100 });
  // A floating expanded window opened from a bottom-right half-capsule stays on screen.
  const target = clampToWorkArea({ x: 1790, y: 1026, width: 348, height: 72 }, geometry.padArea(AREA, PAD));
  assert.deepEqual(target, { x: 1582, y: 1018, width: 348, height: 72 });
});
