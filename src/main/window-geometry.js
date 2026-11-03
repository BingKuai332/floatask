'use strict';
// Pure window-geometry helpers for the floating capsule toolbar.
// All units are DIP; every function is side-effect free and testable without Electron.

const SNAP_DISTANCE = 24;
const EXPANDED_EDGE_GAP = 8;

const CAPSULE_EXPANDED = [328, 52];
const HALF_CAPSULE_VERTICAL = [44, 52];
const HALF_CAPSULE_HORIZONTAL = [64, 44];
const SHADOW_PADDING = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Keep a window bounds fully inside a work area, shrinking if it cannot fit. */
function clampToWorkArea(bounds, workArea) {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = clamp(bounds.x, workArea.x, workArea.x + workArea.width - width);
  const y = clamp(bounds.y, workArea.y, workArea.y + workArea.height - height);
  return { x: Math.round(x), y: Math.round(y), width, height };
}

/**
 * Snap a top-left position to the nearest work-area edge when it lands within
 * SNAP_DISTANCE of that edge. Returns the snapped position and the edge name
 * ('left' | 'right' | 'top' | 'bottom'), or edge null when floating.
 */
function snapToolbar(position, size, workArea) {
  const clamped = clampToWorkArea({ x: position.x, y: position.y, width: size.width, height: size.height }, workArea);
  const distances = [
    { edge: 'left', distance: clamped.x - workArea.x },
    { edge: 'right', distance: workArea.x + workArea.width - (clamped.x + clamped.width) },
    { edge: 'top', distance: clamped.y - workArea.y },
    { edge: 'bottom', distance: workArea.y + workArea.height - (clamped.y + clamped.height) }
  ];
  distances.sort((a, b) => a.distance - b.distance);
  const nearest = distances[0];
  if (nearest.distance > SNAP_DISTANCE) return { position: { x: clamped.x, y: clamped.y }, edge: null };
  const snapped = { x: clamped.x, y: clamped.y };
  if (nearest.edge === 'left') snapped.x = workArea.x;
  if (nearest.edge === 'right') snapped.x = workArea.x + workArea.width - clamped.width;
  if (nearest.edge === 'top') snapped.y = workArea.y;
  if (nearest.edge === 'bottom') snapped.y = workArea.y + workArea.height - clamped.height;
  return { position: snapped, edge: nearest.edge };
}

/** Where the expanded capsule floats when it belongs to a snapped edge: EXPANDED_EDGE_GAP DIP off the edge. */
function edgeGapPosition(edge, size, position, workArea) {
  const next = { x: position.x, y: position.y };
  if (edge === 'left') next.x = workArea.x + EXPANDED_EDGE_GAP;
  if (edge === 'right') next.x = workArea.x + workArea.width - EXPANDED_EDGE_GAP - size.width;
  if (edge === 'top') next.y = workArea.y + EXPANDED_EDGE_GAP;
  if (edge === 'bottom') next.y = workArea.y + workArea.height - EXPANDED_EDGE_GAP - size.height;
  return clampToWorkArea({ ...next, width: size.width, height: size.height }, workArea);
}

const DOCK_EDGES = ['left', 'right', 'top', 'bottom'];

function halfCapsuleSize(edge) {
  return edge === 'left' || edge === 'right'
    ? { width: HALF_CAPSULE_VERTICAL[0], height: HALF_CAPSULE_VERTICAL[1] }
    : { width: HALF_CAPSULE_HORIZONTAL[0], height: HALF_CAPSULE_HORIZONTAL[1] };
}

/** Half-capsule bounds (visible, no padding) flush on `edge`, keeping the along-edge coordinate of `capsule`. */
function dockAnchor(edge, capsule, workArea) {
  const size = halfCapsuleSize(edge);
  const anchors = {
    left: { x: workArea.x, y: capsule.y },
    right: { x: workArea.x + workArea.width - size.width, y: capsule.y },
    top: { x: capsule.x, y: workArea.y },
    bottom: { x: capsule.x, y: workArea.y + workArea.height - size.height }
  };
  return clampToWorkArea({ ...anchors[edge], ...size }, workArea);
}

/** Window bounds for a docked half-capsule: the anchor plus the transparent shadow padding. */
function dockedWindowBounds(anchor, padding = SHADOW_PADDING) {
  return { x: anchor.x - padding, y: anchor.y - padding, width: anchor.width + padding * 2, height: anchor.height + padding * 2 };
}

/**
 * Expanded window bounds for a docked capsule. The capsule grows from the
 * anchor (down/right when there is room, otherwise up/left from the anchor's
 * far end) and sits EXPANDED_EDGE_GAP DIP off its edge on all four sides.
 */
function expansionPlacement(edge, anchor, workArea, padding = SHADOW_PADDING) {
  const [length, thickness] = CAPSULE_EXPANDED;
  const vertical = edge === 'left' || edge === 'right';
  const axis = vertical ? 'vertical' : 'horizontal';
  const areaRight = workArea.x + workArea.width;
  const areaBottom = workArea.y + workArea.height;
  const direction = vertical
    ? (anchor.y + length + EXPANDED_EDGE_GAP > areaBottom ? 'up' : 'down')
    : (anchor.x + length + EXPANDED_EDGE_GAP > areaRight ? 'left' : 'right');
  const width = (vertical ? thickness : length) + padding * 2;
  const height = (vertical ? length : thickness) + padding * 2;
  let capsuleX;
  let capsuleY;
  if (vertical) {
    capsuleX = edge === 'left' ? workArea.x + EXPANDED_EDGE_GAP : areaRight - EXPANDED_EDGE_GAP - thickness;
    capsuleY = direction === 'down' ? anchor.y : anchor.y + anchor.height - length;
  } else {
    capsuleY = edge === 'top' ? workArea.y + EXPANDED_EDGE_GAP : areaBottom - EXPANDED_EDGE_GAP - thickness;
    capsuleX = direction === 'right' ? anchor.x : anchor.x + anchor.width - length;
  }
  const paddedArea = {
    x: workArea.x - padding,
    y: workArea.y - padding,
    width: workArea.width + padding * 2,
    height: workArea.height + padding * 2
  };
  return {
    axis,
    direction,
    bounds: clampToWorkArea({ x: capsuleX - padding, y: capsuleY - padding, width, height }, paddedArea)
  };
}

/** Validate a persisted dock ({ edge, anchor }); returns null when unusable. */
function sanitizeDock(dock) {
  if (!dock || !DOCK_EDGES.includes(dock.edge)) return null;
  const a = dock.anchor || {};
  if (![a.x, a.y, a.width, a.height].every(Number.isFinite)) return null;
  return { edge: dock.edge, anchor: { x: Math.round(a.x), y: Math.round(a.y), width: Math.round(a.width), height: Math.round(a.height) } };
}

function translateDragBounds(start, delta, workArea, shadowPadding = 0) {
  const paddedArea = {
    x: workArea.x - shadowPadding,
    y: workArea.y - shadowPadding,
    width: workArea.width + shadowPadding * 2,
    height: workArea.height + shadowPadding * 2
  };
  return clampToWorkArea({
    x: start.x + Math.round(Number(delta?.x) || 0),
    y: start.y + Math.round(Number(delta?.y) || 0),
    width: start.width,
    height: start.height
  }, paddedArea);
}

/** DIP size to physical pixels for a display scale factor (100/125/150% → 1/1.25/1.5). */
function physicalSize(dipSize, scaleFactor) {
  const scale = Number(scaleFactor) > 0 ? Number(scaleFactor) : 1;
  return [Math.round(dipSize[0] * scale), Math.round(dipSize[1] * scale)];
}

module.exports = {
  SNAP_DISTANCE,
  EXPANDED_EDGE_GAP,
  SHADOW_PADDING,
  CAPSULE_EXPANDED,
  HALF_CAPSULE_VERTICAL,
  HALF_CAPSULE_HORIZONTAL,
  clampToWorkArea,
  snapToolbar,
  edgeGapPosition,
  dockAnchor,
  dockedWindowBounds,
  expansionPlacement,
  sanitizeDock,
  translateDragBounds,
  physicalSize
};
