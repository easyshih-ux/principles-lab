import test from 'node:test';
import assert from 'node:assert/strict';

import { clampElementPosition } from '../geometry/bounds.js';
import { GEOMETRY_CANVAS, GEOMETRY_SHAPES } from '../geometry/config.js';
import { logicalToScreen, screenToLogical } from '../geometry/coordinates.js';
import { GeometryEngine } from '../geometry/engine.js';
import { snapPoint, snapValue } from '../geometry/grid.js';
import { createGeometryElement } from '../geometry/model.js';

function deterministicIds() {
  let number = 0;
  return () => `test-${++number}`;
}

function createEngine(allowedTools = ['add', 'move', 'duplicate', 'delete', 'undo']) {
  return new GeometryEngine({ allowedTools, idFactory: deterministicIds() });
}

test('each created element has a unique stable id', () => {
  const engine = createEngine();
  engine.add('circle');
  engine.add('square');
  const ids = engine.getState().elements.map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, engine.getState().elements.map((element) => element.id));
});

test('duplicate creates a new id while retaining geometry fields', () => {
  const engine = createEngine();
  engine.add('triangle', { size: 4, hue: 'yellow', lightness: 3, rotation: 0 });
  const original = engine.getSelectedElement();
  engine.duplicate();
  const duplicate = engine.getSelectedElement();
  assert.notEqual(duplicate.id, original.id);
  ['shape', 'size', 'hue', 'lightness', 'rotation'].forEach((field) => {
    assert.equal(duplicate[field], original[field]);
  });
});

test('grid snap uses the centralized step', () => {
  assert.equal(snapValue(31, 20), 40);
  assert.deepEqual(snapPoint({ x: 49, y: 71 }, 20), { x: 40, y: 80 });
});

test('boundary clamp considers shape dimensions', () => {
  const rectangle = createGeometryElement({ id: 'rect', shape: 'rectangle', x: 0, y: 0, size: 3 });
  assert.deepEqual(
    clampElementPosition(rectangle, { x: -50, y: -50 }, GEOMETRY_CANVAS),
    { x: 60, y: 40 }
  );
});

test('logical coordinates round-trip independently of screen pixel size', () => {
  const logical = { x: 250, y: 450 };
  const smallRect = { left: 10, top: 20, width: 500, height: 300 };
  const largeRect = { left: 40, top: 60, width: 1500, height: 900 };
  const smallScreen = logicalToScreen(logical, smallRect, GEOMETRY_CANVAS);
  const largeScreen = logicalToScreen(logical, largeRect, GEOMETRY_CANVAS);
  assert.notDeepEqual(smallScreen, largeScreen);
  assert.deepEqual(screenToLogical({ x: smallScreen.x + 10, y: smallScreen.y + 20 }, smallRect, GEOMETRY_CANVAS), logical);
  assert.deepEqual(screenToLogical({ x: largeScreen.x + 40, y: largeScreen.y + 60 }, largeRect, GEOMETRY_CANVAS), logical);
});

test('move commits snapped clean state', () => {
  const engine = createEngine();
  engine.add('circle', { x: 200, y: 200 });
  const id = engine.getSelectedElement().id;
  engine.move(id, { x: 273, y: 331 });
  assert.deepEqual(
    { x: engine.getSelectedElement().x, y: engine.getSelectedElement().y },
    { x: 280, y: 340 }
  );
});

test('duplicate appends state and selects the new element', () => {
  const engine = createEngine();
  engine.add('square');
  const firstId = engine.getSelectedElement().id;
  engine.duplicate();
  assert.equal(engine.getState().elements.length, 2);
  assert.notEqual(engine.getState().selectedId, firstId);
});

test('delete removes selected state cleanly', () => {
  const engine = createEngine();
  engine.add('circle');
  engine.delete();
  assert.equal(engine.getState().elements.length, 0);
  assert.equal(engine.getState().selectedId, null);
});

test('undo restores a move', () => {
  const engine = createEngine();
  engine.add('circle', { x: 200, y: 200 });
  const id = engine.getSelectedElement().id;
  engine.move(id, { x: 400, y: 400 });
  engine.undo();
  assert.deepEqual({ x: engine.getSelectedElement().x, y: engine.getSelectedElement().y }, { x: 200, y: 200 });
});

test('undo removes a duplicate', () => {
  const engine = createEngine();
  engine.add('circle');
  engine.duplicate();
  engine.undo();
  assert.equal(engine.getState().elements.length, 1);
});

test('undo restores a deletion and prior selection', () => {
  const engine = createEngine();
  engine.add('circle');
  const id = engine.getSelectedElement().id;
  engine.delete();
  engine.undo();
  assert.equal(engine.getState().elements.length, 1);
  assert.equal(engine.getState().selectedId, id);
});

test('allowedTools blocks unauthorized operations', () => {
  const engine = createEngine(['add']);
  engine.add('circle');
  const before = engine.getState();
  assert.equal(engine.move(before.selectedId, { x: 300, y: 300 }).reason, 'tool-not-allowed');
  assert.equal(engine.duplicate().reason, 'tool-not-allowed');
  assert.equal(engine.delete().reason, 'tool-not-allowed');
  assert.deepEqual(engine.getState(), before);
});

test('all six supported shapes create valid clean state', () => {
  const engine = createEngine();
  GEOMETRY_SHAPES.forEach((shape) => engine.add(shape));
  assert.deepEqual(engine.getState().elements.map((element) => element.shape), GEOMETRY_SHAPES);
  engine.getState().elements.forEach((element) => {
    assert.deepEqual(Object.keys(element), ['shape', 'x', 'y', 'size', 'hue', 'lightness', 'rotation', 'proportion', 'id']);
  });
});

test('preview movement does not mutate committed state', () => {
  const engine = createEngine();
  engine.add('circle', { x: 200, y: 200 });
  const id = engine.getSelectedElement().id;
  const preview = engine.previewPosition(id, { x: 333, y: 377 });
  assert.deepEqual(preview, { x: 333, y: 377 });
  assert.deepEqual({ x: engine.getSelectedElement().x, y: engine.getSelectedElement().y }, { x: 200, y: 200 });
});
