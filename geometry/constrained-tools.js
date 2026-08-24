import { GEOMETRY_CANVAS } from './config.js';
import { snapPoint } from './grid.js';

function shapeMetadata(id, shapeType, directional, features) {
  return Object.freeze({ id, shapeType, directional, shapeFeature: Object.freeze(features) });
}

export const SHAPE_LIBRARY = Object.freeze({
  circle: shapeMetadata('circle', 'circle', false, ['rounded', 'closed', 'radial']),
  square: shapeMetadata('square', 'square', false, ['angular', 'closed', 'equal-sides']),
  triangle: shapeMetadata('triangle', 'triangle', true, ['angular', 'closed', 'pointed']),
  rectangle: shapeMetadata('rectangle', 'rectangle', true, ['angular', 'closed', 'elongated']),
  semicircle: shapeMetadata('semicircle', 'semicircle', true, ['rounded', 'closed', 'flat-edge']),
  line: shapeMetadata('line', 'special', true, ['open', 'linear', 'elongated'])
});

export function getShapeMetadata(shapeId) {
  const metadata = SHAPE_LIBRARY[shapeId];
  if (!metadata) throw new RangeError(`Unknown constrained shape: ${shapeId}`);
  return metadata;
}

export const SIZE_LEVELS = Object.freeze([1, 2, 3, 4, 5]);
export const SIZE_LEVEL_TO_LOGICAL = Object.freeze({ 1: 36, 2: 56, 3: 80, 4: 108, 5: 140 });
export const RATIO_LEVELS = Object.freeze([1, 2, 3]);
export const RATIO_LEVEL_TO_LOGICAL = Object.freeze({ 1: 40, 2: 80, 3: 120 });

export function logicalSizeForLevel(sizeLevel) {
  const logicalSize = SIZE_LEVEL_TO_LOGICAL[sizeLevel];
  if (!logicalSize) throw new RangeError(`Invalid sizeLevel: ${sizeLevel}`);
  return logicalSize;
}

export function logicalSizeForRatio(ratioLevel) {
  const logicalSize = RATIO_LEVEL_TO_LOGICAL[ratioLevel];
  if (!logicalSize) throw new RangeError(`Invalid ratioLevel: ${ratioLevel}`);
  return logicalSize;
}

const COLOR_ROWS = Object.freeze([
  ['red', ['#7F302B', '#AD4137', '#D95A4B', '#E77F73', '#F0AAA2']],
  ['red-orange', ['#803623', '#AD4A2D', '#D96538', '#E78662', '#F0AD91']],
  ['orange', ['#83401F', '#B25827', '#DC7832', '#E89A5D', '#F1BC8A']],
  ['yellow-orange', ['#765016', '#A46E1C', '#CF9128', '#E1B04E', '#EDD083']],
  ['yellow', ['#756019', '#A8841F', '#D5AC2D', '#E6C755', '#F0DC8A']],
  ['yellow-green', ['#52601D', '#708329', '#91A83B', '#AEC461', '#CAD98F']],
  ['green', ['#245B42', '#337B58', '#4F9D78', '#78B79A', '#A4D0BA']],
  ['blue-green', ['#1E5B5B', '#287B78', '#3D9B95', '#6BB7B0', '#9ACFC9']],
  ['blue', ['#244D75', '#2F6494', '#3E78B2', '#6998C5', '#9AB8D6']],
  ['blue-violet', ['#3D426F', '#525A94', '#6B74B3', '#8F96C8', '#B4B9DC']],
  ['violet', ['#573B6B', '#765092', '#9467B2', '#AE89C6', '#C9ACD9']],
  ['red-violet', ['#6B385B', '#914B78', '#B46094', '#C985AD', '#DBADC8']]
]);

export const HUE_FAMILIES = Object.freeze(COLOR_ROWS.map(([id]) => id));
export const COLOR_LIBRARY = Object.freeze(Object.fromEntries(
  COLOR_ROWS.flatMap(([hueFamily, colors], hueIndex) => colors.map((hex, index) => {
    const lightnessLevel = index + 1;
    const colorId = `${hueFamily}-${lightnessLevel}`;
    return [colorId, Object.freeze({ colorId, hueFamily, hueIndex, lightnessLevel, hex })];
  }))
));

export function getColorMetadata(colorId) {
  const color = COLOR_LIBRARY[colorId];
  if (!color) throw new RangeError(`Unknown constrained color: ${colorId}`);
  return color;
}

export function areNeighborHues(firstHue, secondHue) {
  const first = HUE_FAMILIES.indexOf(firstHue);
  const second = HUE_FAMILIES.indexOf(secondHue);
  if (first < 0 || second < 0 || first === second) return false;
  const distance = Math.abs(first - second);
  return distance === 1 || distance === HUE_FAMILIES.length - 1;
}

export function neighboringHues(hueFamily) {
  const index = HUE_FAMILIES.indexOf(hueFamily);
  if (index < 0) throw new RangeError(`Unknown hue family: ${hueFamily}`);
  const count = HUE_FAMILIES.length;
  return Object.freeze([HUE_FAMILIES[(index - 1 + count) % count], HUE_FAMILIES[(index + 1) % count]]);
}

export const ROTATION_LEVELS = Object.freeze([0, 45, 90, 135]);

export function normalizeRotation(rotation) {
  if (!ROTATION_LEVELS.includes(rotation)) throw new RangeError(`Invalid constrained rotation: ${rotation}`);
  return rotation;
}

export const GRID_AXIS_MODES = Object.freeze(['none', 'vertical', 'horizontal', 'cross']);

export function createGridConfig({ enabled = false, visible = false, step = 20, axis = 'none' } = {}) {
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('Grid step must be positive.');
  if (!GRID_AXIS_MODES.includes(axis)) throw new RangeError(`Invalid grid axis: ${axis}`);
  return Object.freeze({ enabled: Boolean(enabled), visible: Boolean(visible), step, axis });
}

export function snapLogicalPoint(point, grid = createGridConfig()) {
  const logicalPoint = { x: Number(point.x), y: Number(point.y) };
  if (!Number.isFinite(logicalPoint.x) || !Number.isFinite(logicalPoint.y)) throw new TypeError('Logical coordinates must be finite.');
  return grid.enabled ? snapPoint(logicalPoint, grid.step) : logicalPoint;
}

export const ALLOWED_TOOL_DEFAULTS = Object.freeze({
  shape: false, size: false, ratioSize: false, color: false,
  position: false, rotation: false, delete: false, grid: false
});

const ENGINE_TOOL_MAP = Object.freeze({
  shape: ['add'], size: ['size'], ratioSize: ['proportion'], color: ['color', 'lightness'],
  position: ['move'], rotation: ['rotation'], delete: ['delete'], grid: []
});

export function normalizeAllowedTools(allowedTools = {}) {
  const source = Array.isArray(allowedTools) ? Object.fromEntries(allowedTools.map((tool) => [tool, true])) : allowedTools;
  return Object.freeze(Object.fromEntries(
    Object.keys(ALLOWED_TOOL_DEFAULTS).map((tool) => [tool, Boolean(source[tool])])
  ));
}

export function engineToolsFor(allowedTools) {
  const normalized = normalizeAllowedTools(allowedTools);
  return [...new Set(Object.entries(normalized).flatMap(([tool, enabled]) => enabled ? ENGINE_TOOL_MAP[tool] : []))];
}

export function isToolAllowed(tool, allowedTools) {
  return tool in ALLOWED_TOOL_DEFAULTS && normalizeAllowedTools(allowedTools)[tool];
}

export function createElementState(values = {}) {
  const shape = values.shape ?? 'circle';
  const shapeData = getShapeMetadata(shape);
  const sizeLevel = values.sizeLevel ?? values.size ?? 3;
  const ratioLevel = values.ratioLevel ?? null;
  const logicalSize = ratioLevel == null ? logicalSizeForLevel(sizeLevel) : logicalSizeForRatio(ratioLevel);
  const colorId = values.colorId ?? `${values.hueFamily ?? values.hue ?? 'blue'}-${values.lightnessLevel ?? values.lightness ?? 3}`;
  const color = getColorMetadata(colorId);
  const logicalX = values.logicalX ?? values.x ?? GEOMETRY_CANVAS.width / 2;
  const logicalY = values.logicalY ?? values.y ?? GEOMETRY_CANVAS.height / 2;
  if (!Number.isFinite(logicalX) || !Number.isFinite(logicalY)) throw new TypeError('Logical coordinates must be finite.');
  return Object.freeze({
    id: String(values.id ?? ''), shape, shapeType: shapeData.shapeType,
    shapeFeature: shapeData.shapeFeature, directional: shapeData.directional,
    sizeLevel, ratioLevel, logicalSize, colorId: color.colorId,
    hueFamily: color.hueFamily, hueIndex: color.hueIndex,
    lightnessLevel: color.lightnessLevel, hex: color.hex,
    rotation: normalizeRotation(values.rotation ?? 0), logicalX, logicalY,
    lineStyle: values.lineStyle ?? 'solid', isCore: Boolean(values.isCore)
  });
}

export function toValidatorElement(element) {
  const state = createElementState(element);
  return Object.freeze({ ...state, x: state.logicalX, y: state.logicalY,
    size: state.sizeLevel, hue: state.hueFamily, lightness: state.lightnessLevel,
    proportion: state.ratioLevel ?? 1 });
}

export function createValidatorPayload(elements, spec = {}) {
  return Object.freeze({ elements: Object.freeze(elements.map(toValidatorElement)), spec: Object.freeze({ ...spec }) });
}
