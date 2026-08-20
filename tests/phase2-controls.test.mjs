import test from 'node:test';
import assert from 'node:assert/strict';

import { getControlPanelState } from '../geometry/control-panel.js';
import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  PROPORTION_LEVELS,
  ROTATION_VALUES,
  SIZE_LEVELS
} from '../geometry/config.js';
import { GeometryEngine } from '../geometry/engine.js';
import { createGeometryElement } from '../geometry/model.js';
import { getDisplayColor } from '../geometry/palette.js';

function ids() {
  let value = 0;
  return () => `phase2-${++value}`;
}

function engineWith(tools, toolConstraints = {}) {
  const engine = new GeometryEngine({
    allowedTools: ['add', 'undo', ...tools],
    toolConstraints,
    idFactory: ids()
  });
  engine.add('circle');
  return engine;
}

test('size only accepts integer levels 1 through 5', () => {
  SIZE_LEVELS.forEach((size) => assert.equal(createGeometryElement({ size }).size, size));
  [0, 3.5, 6, 80].forEach((size) => assert.throws(() => createGeometryElement({ size })));
});

test('hue only accepts the six palette family ids', () => {
  HUE_IDS.forEach((hue) => assert.equal(createGeometryElement({ hue }).hue, hue));
  ['cyan', 210, '#000'].forEach((hue) => assert.throws(() => createGeometryElement({ hue })));
});

test('lightness only accepts integer levels 1 through 5', () => {
  LIGHTNESS_LEVELS.forEach((lightness) => assert.equal(createGeometryElement({ lightness }).lightness, lightness));
  [0, 2.5, 6, 60].forEach((lightness) => assert.throws(() => createGeometryElement({ lightness })));
});

test('rotation only accepts the eight fixed angles', () => {
  ROTATION_VALUES.forEach((rotation) => assert.equal(createGeometryElement({ rotation }).rotation, rotation));
  [1, 44, 360].forEach((rotation) => assert.throws(() => createGeometryElement({ rotation })));
});

test('proportion only accepts levels 1, 2, and 3', () => {
  PROPORTION_LEVELS.forEach((proportion) => assert.equal(createGeometryElement({ proportion }).proportion, proportion));
  [0, 2.5, 4].forEach((proportion) => assert.throws(() => createGeometryElement({ proportion })));
});

test('allowedTools blocks every unauthorized property operation', () => {
  const engine = engineWith([]);
  const before = engine.getState();
  ['size', 'hue', 'lightness', 'rotation', 'proportion'].forEach((property) => {
    const values = { size: 5, hue: 'blue', lightness: 5, rotation: 90, proportion: 3 };
    assert.equal(engine.setProperty(property, values[property]).reason, 'tool-not-allowed');
  });
  assert.deepEqual(engine.getState(), before);
});

test('allowedValues and lockedValues block unavailable values', () => {
  const engine = engineWith(['color', 'size'], {
    hue: { allowedValues: ['blue'] },
    size: { allowedValues: [2, 4], lockedValues: [4] }
  });
  assert.equal(engine.setProperty('hue', 'red').reason, 'value-not-allowed');
  assert.equal(engine.setProperty('size', 4).reason, 'value-not-allowed');
  assert.equal(engine.setProperty('hue', 'blue').changed, true);
  assert.equal(engine.setProperty('size', 2).changed, true);
});

test('control operations update clean element state', () => {
  const engine = engineWith(['size', 'color', 'lightness', 'rotation', 'proportion']);
  engine.setProperty('size', 5);
  engine.setProperty('hue', 'purple');
  engine.setProperty('lightness', 2);
  engine.setProperty('rotation', 135);
  engine.setProperty('proportion', 3);
  assert.deepEqual(getControlPanelState(engine).values, {
    size: 5, hue: 'purple', lightness: 2, rotation: 135, proportion: 3
  });
});

for (const [property, tool, changedValue] of [
  ['size', 'size', 5],
  ['hue', 'color', 'blue'],
  ['lightness', 'lightness', 5],
  ['rotation', 'rotation', 90],
  ['proportion', 'proportion', 3]
]) {
  test(`undo restores ${property} changes`, () => {
    const engine = engineWith([tool]);
    const before = engine.getSelectedElement()[property];
    engine.setProperty(property, changedValue);
    engine.undo();
    assert.equal(engine.getSelectedElement()[property], before);
  });
}

test('one continuous scale adjustment creates one undo entry', () => {
  const engine = engineWith(['size']);
  engine.beginAdjustment('size');
  engine.previewProperty('size', 4);
  engine.previewProperty('size', 5);
  engine.commitAdjustment();
  assert.equal(engine.history.length, 1);
  engine.undo();
  assert.equal(engine.getSelectedElement().size, 3);
});

test('control panel state follows selection between elements', () => {
  const engine = engineWith(['size', 'color']);
  const first = engine.getSelectedElement().id;
  engine.setProperty('size', 1);
  engine.add('square', { size: 5, hue: 'blue' });
  const second = engine.getSelectedElement().id;
  assert.equal(getControlPanelState(engine).values.size, 5);
  engine.select(first);
  assert.equal(getControlPanelState(engine).values.size, 1);
  engine.select(second);
  assert.equal(getControlPanelState(engine).values.hue, 'blue');
});

test('all six hues and five lightness levels resolve to valid distinct display colors', () => {
  const colors = HUE_IDS.flatMap((hue) => (
    LIGHTNESS_LEVELS.map((lightness) => getDisplayColor(hue, lightness))
  ));
  assert.equal(colors.length, 30);
  assert.equal(new Set(colors).size, 30);
  colors.forEach((color) => assert.match(color, /^#[0-9A-F]{6}$/i));
});
