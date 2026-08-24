import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_LIBRARY, HUE_FAMILIES, RATIO_LEVELS, ROTATION_LEVELS, SHAPE_LIBRARY,
  areNeighborHues, createElementState, createGridConfig, createValidatorPayload,
  engineToolsFor, getColorMetadata, isToolAllowed, logicalSizeForLevel,
  logicalSizeForRatio, neighboringHues, normalizeAllowedTools, normalizeRotation,
  snapLogicalPoint
} from '../geometry/constrained-tools.js';

test('five size levels map to stable logical sizes', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(logicalSizeForLevel), [36, 56, 80, 108, 140]);
  assert.throws(() => logicalSizeForLevel(6), RangeError);
});

test('ratio levels preserve a fixed 1:2:3 linear ratio', () => {
  const sizes = RATIO_LEVELS.map(logicalSizeForRatio);
  assert.deepEqual(sizes, [40, 80, 120]);
  assert.deepEqual(sizes.map((size) => size / sizes[0]), [1, 2, 3]);
});

test('shape metadata includes direction and validator features', () => {
  assert.deepEqual(Object.keys(SHAPE_LIBRARY), ['circle', 'square', 'triangle', 'rectangle', 'semicircle', 'line']);
  assert.equal(SHAPE_LIBRARY.circle.directional, false);
  assert.equal(SHAPE_LIBRARY.semicircle.directional, true);
  assert.equal(SHAPE_LIBRARY.line.shapeType, 'special');
  assert.ok(SHAPE_LIBRARY.semicircle.shapeFeature.includes('flat-edge'));
});

test('color metadata contains twelve hue families and five lightness levels', () => {
  assert.equal(HUE_FAMILIES.length, 12);
  assert.equal(Object.keys(COLOR_LIBRARY).length, 60);
  assert.deepEqual(getColorMetadata('blue-3'), {
    colorId: 'blue-3', hueFamily: 'blue', hueIndex: 8, lightnessLevel: 3, hex: '#3E78B2'
  });
});

test('neighbor hue lookup wraps around the hue ring', () => {
  assert.equal(areNeighborHues('red', 'red-orange'), true);
  assert.equal(areNeighborHues('red', 'red-violet'), true);
  assert.equal(areNeighborHues('red', 'orange'), false);
  assert.deepEqual([...neighboringHues('red')], ['red-violet', 'red-orange']);
});

test('rotation accepts only four fixed directions', () => {
  ROTATION_LEVELS.forEach((rotation) => assert.equal(normalizeRotation(rotation), rotation));
  assert.throws(() => normalizeRotation(180), RangeError);
});

test('grid snapping operates on logical coordinates', () => {
  const grid = createGridConfig({ enabled: true, visible: true, step: 20, axis: 'cross' });
  assert.deepEqual(snapLogicalPoint({ x: 111, y: 289 }, grid), { x: 120, y: 280 });
  assert.deepEqual(snapLogicalPoint({ x: 111, y: 289 }, createGridConfig()), { x: 111, y: 289 });
});

test('logical coordinates do not contain display pixel data', () => {
  const state = createElementState({ id: 'logical', logicalX: 375, logicalY: 240 });
  assert.equal(state.logicalX, 375);
  assert.equal(state.logicalY, 240);
  assert.equal('clientX' in state, false);
  assert.equal('pixelX' in state, false);
});

test('allowedTools exposes only requested experiment and engine tools', () => {
  const allowed = normalizeAllowedTools({ size: true, position: true, grid: true });
  assert.equal(isToolAllowed('size', allowed), true);
  assert.equal(isToolAllowed('color', allowed), false);
  assert.deepEqual(engineToolsFor(allowed).sort(), ['move', 'size']);
});

test('element state becomes a clean validator payload', () => {
  const payload = createValidatorPayload([{
    id: 'element-1', shape: 'triangle', sizeLevel: 4, colorId: 'blue-green-2',
    rotation: 45, logicalX: 240, logicalY: 320, lineStyle: 'solid', isCore: true
  }], { minimumElements: 1 });
  const element = payload.elements[0];
  assert.equal(element.logicalSize, 108);
  assert.equal(element.hueFamily, 'blue-green');
  assert.equal(element.x, 240);
  assert.equal(element.y, 320);
  assert.equal(element.size, 4);
  assert.equal(element.isCore, true);
  assert.equal('className' in element, false);
  assert.equal('style' in element, false);
  assert.equal(payload.spec.minimumElements, 1);
});
