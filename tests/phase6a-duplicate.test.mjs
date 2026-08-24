import test from 'node:test';
import assert from 'node:assert/strict';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { createValidatorPayload, engineToolsFor, normalizeAllowedTools } from '../geometry/constrained-tools.js';

function sourceElement() {
  return {
    id: 'source', shape: 'triangle', x: 200, y: 200, size: 4,
    hue: 'blue', lightness: 2, rotation: 45, proportion: 2,
    sizeLevel: 4, ratioLevel: 2, colorId: 'blue-2',
    shapeFeature: ['angular', 'closed', 'pointed'], lineStyle: 'solid', isCore: true
  };
}

function engine(duplicate) {
  let sequence = 0;
  const instance = new ConstrainedGeometryEngine({
    elements: [sourceElement()], allowedTools: { duplicate },
    idFactory: () => `copy-${++sequence}`
  });
  instance.select('source');
  return instance;
}

test('duplicate maps to the existing engine tool only when allowed', () => {
  assert.equal(normalizeAllowedTools({ duplicate: true }).duplicate, true);
  assert.ok(engineToolsFor({ duplicate: true }).includes('duplicate'));
  assert.equal(engineToolsFor({ duplicate: false }).includes('duplicate'), false);
});

test('duplicate disabled is hidden by canUse and rejected by the engine action', () => {
  const instance = engine(false);
  assert.equal(instance.canUse('duplicate'), false);
  assert.equal(instance.duplicate().reason, 'tool-not-allowed');
  assert.equal(instance.getState().elements.length, 1);
});

test('duplicate creates a unique id and preserves attributes except isCore', () => {
  const instance = engine(true);
  const original = instance.getSelectedElement();
  assert.equal(instance.duplicate().changed, true);
  const copy = instance.getSelectedElement();
  assert.notEqual(copy.id, original.id);
  for (const property of ['shape', 'size', 'sizeLevel', 'ratioLevel', 'hue', 'colorId', 'lightness', 'rotation', 'proportion', 'lineStyle']) {
    assert.deepEqual(copy[property], original[property]);
  }
  assert.deepEqual(copy.shapeFeature, original.shapeFeature);
  assert.equal(copy.isCore, false);
  assert.notDeepEqual({ x: copy.x, y: copy.y }, { x: original.x, y: original.y });
});

test('duplicate produces a valid DOM-independent validator payload', () => {
  const instance = engine(true);
  instance.duplicate();
  const payload = createValidatorPayload(instance.getState().elements);
  assert.equal(payload.elements.length, 2);
  assert.equal(new Set(payload.elements.map((item) => item.id)).size, 2);
  assert.equal(payload.elements[1].ratioLevel, 2);
  assert.equal(payload.elements[1].isCore, false);
  assert.equal('className' in payload.elements[1], false);
});

test('undo removes duplicate and restores source selection', () => {
  const instance = engine(true);
  instance.setAllowedTools([...instance.allowedTools, 'undo']);
  instance.duplicate();
  const result = instance.undo();
  assert.equal(result.undoneOperation, 'duplicate');
  assert.equal(instance.getState().elements.length, 1);
  assert.equal(instance.getState().selectedId, 'source');
  assert.equal(instance.getSelectedElement().isCore, true);
});
