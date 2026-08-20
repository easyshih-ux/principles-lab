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

export const DEFAULT_ELEMENT_VALUES = Object.freeze({
  shape: 'circle',
  x: 500,
  y: 300,
  size: 80,
  hue: 8,
  lightness: 60,
  rotation: 0
});

export const GEOMETRY_TOOLS = Object.freeze({
  add: 'add',
  move: 'move',
  duplicate: 'duplicate',
  delete: 'delete',
  undo: 'undo'
});
