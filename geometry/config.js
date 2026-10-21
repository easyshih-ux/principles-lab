export const GEOMETRY_SHAPES = Object.freeze([
  'circle',
  'square',
  'triangle',
  'rectangle',
  'semicircle',
  'line'
]);

export const GEOMETRY_CANVAS = Object.freeze({
  width: 1000,
  height: 600
});

export const GEOMETRY_GRID = Object.freeze({
  step: 20
});

export const SIZE_LEVELS = Object.freeze([1, 2, 3, 4, 5]);
export const SIZE_TO_LOGICAL = Object.freeze({
  1: 36,
  2: 56,
  3: 80,
  4: 108,
  5: 140
});

export const HUE_IDS = Object.freeze([
  'red', 'red-orange', 'orange', 'yellow-orange', 'yellow', 'yellow-green',
  'green', 'blue-green', 'blue', 'blue-violet', 'violet', 'red-violet'
]);

export const LIGHTNESS_LEVELS = Object.freeze([1, 2, 3, 4, 5]);
export const ROTATION_VALUES = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
export const PROPORTION_LEVELS = Object.freeze([1, 2, 3]);
// Gradation-only seven-step scale (Gate 4). Other questions keep the five-level size and lightness.
export const STEP_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
// 10/21: level 7 lowered from 140 to 84 so a worst-case row (7 shapes, size and spacing both growing) fits the 1000-wide canvas.
export const STEP_SIZE_TO_LOGICAL = Object.freeze({ 1: 36, 2: 41, 3: 48, 4: 55, 5: 63, 6: 73, 7: 84 });

export const DEFAULT_ELEMENT_VALUES = Object.freeze({
  shape: 'circle',
  x: 500,
  y: 300,
  size: 3,
  hue: 'red',
  lightness: 3,
  rotation: 0,
  proportion: 1
});

export const GEOMETRY_TOOLS = Object.freeze({
  add: 'add',
  move: 'move',
  duplicate: 'duplicate',
  delete: 'delete',
  undo: 'undo',
  size: 'size',
  color: 'color',
  lightness: 'lightness',
  rotation: 'rotation',
  proportion: 'proportion'
});

export const CONTROL_TOOL_PRESETS = Object.freeze({
  transform: Object.freeze(['move', 'duplicate', 'delete', 'rotation', 'undo']),
  colorStudy: Object.freeze(['color', 'lightness', 'undo']),
  proportionStudy: Object.freeze(['proportion', 'undo']),
  all: Object.freeze(Object.values(GEOMETRY_TOOLS))
});
