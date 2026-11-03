'use strict';
// Pure window-geometry helpers for the floating capsule toolbar.
// All units are DIP; every function is side-effect free and testable without Electron.

const SNAP_DISTANCE = 24;
const EXPANDED_EDGE_GAP = 8;

const CAPSULE_EXPANDED = [328, 52];
const HALF_CAPSULE_VERTICAL = [44, 52];
const HALF_CAPSULE_HORIZONTAL = [64, 44];

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

function expansionPlacement(edge, position, workArea) {
  const vertical = edge === 'left' || edge === 'right';
  const axis = vertical ? 'vertical' : 'horizontal';
  const direction = vertical
    ? (position.y + 328 + EXPANDED_EDGE_GAP > workArea.y + workArea.height ? 'up' : 'down')
    : (position.x + 328 + EXPANDED_EDGE_GAP > workArea.x + workArea.width ? 'left' : 'right');
  const width = vertical ? 72 : 348;
  const height = vertical ? 348 : 72;
  let x = position.x - 10;
  let y = position.y - 10;
  if (vertical) {
    x = edge === 'left' ? workArea.x + EXPANDED_EDGE_GAP - 10 : workArea.x + workArea.width - EXPANDED_EDGE_GAP - width;
    if (direction === 'up') y = workArea.y + workArea.height - EXPANDED_EDGE_GAP - height;
  } else {
    if (direction === 'left') x = workArea.x + workArea.width - EXPANDED_EDGE_GAP - width;
    if (edge === 'top') y = workArea.y + EXPANDED_EDGE_GAP - 10;
    if (edge === 'bottom') y = workArea.y + workArea.height - EXPANDED_EDGE_GAP - height;
  }
  const paddedArea = {
    x: workArea.x - 10,
    y: workArea.y - 10,
    width: workArea.width + 20,
    height: workArea.height + 20
  };
  return {
    axis,
    direction,
    bounds: clampToWorkArea({ x, y, width, height }, paddedArea)
  };
}

function collapseStartBounds(target, axis, direction) {
  const start = { ...target };
  if (axis === 'vertical') {
    start.height = 348;
    if (direction === 'up') start.y -= 276;
  } else {
    start.width = 348;
    if (direction === 'left') start.x -= 284;
  }
  return start;
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
  CAPSULE_EXPANDED,
  HALF_CAPSULE_VERTICAL,
  HALF_CAPSULE_HORIZONTAL,
  clampToWorkArea,
  snapToolbar,
  edgeGapPosition,
  expansionPlacement,
  collapseStartBounds,
  translateDragBounds,
  physicalSize
};
