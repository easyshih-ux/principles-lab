import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { GeometryControlPanel } from '../geometry/control-panel.js';
import { getRotatedHalfExtents } from '../geometry/bounds.js';

// Gate 4C (10/22): "複製單元" — repetition only. Tap any shape of a unit, press the button,
// and the whole unit is copied to a free spot; the copy moves as one group.
const repetition = phase6cDefinitionsById['experiment-repetition'];
let counter = 0;
const engineWith = (elements, definition = repetition) => new ConstrainedGeometryEngine({ allowedTools: definition.allowedTools, elements, idFactory: () => `n${++counter}` });
const el = (id, values = {}) => ({ id, shape: 'circle', x: 200, y: 150, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1, ...values });
const unit = () => [el('c', { x: 160, y: 150 }), el('s', { shape: 'square', x: 240, y: 150, hue: 'blue' })];
const inside = (engine) => engine.getState().elements.every((item) => { const half = getRotatedHalfExtents(item); return item.x - half.x >= 0 && item.x + half.x <= 1000 && item.y - half.y >= 0 && item.y + half.y <= 600; });

test('Gate 4C unit copy: only the repetition question has it', () => {
  for (const definition of phase6cDefinitions) assert.equal(definition.allowedTools.unitDuplicate, definition.principleId === 'repetition', definition.principleId);
  const other = engineWith(unit(), phase6cDefinitionsById['experiment-gradation']);
  other.select('c');
  assert.equal(other.duplicateUnit().reason, 'tool-not-allowed');
});

test('Gate 4C unit copy: the button shows in repetition only', () => {
  const panel = (definition) => {
    const engine = engineWith(unit(), definition); engine.select('c');
    const container = { innerHTML: '', querySelectorAll: () => [] };
    new GeometryControlPanel({ container, engine, region: 'secondary' });
    return container.innerHTML;
  };
  assert.match(panel(repetition), /data-action="duplicate-unit">複製單元</);
  assert.match(panel(repetition), /data-action="duplicate">複製</);
  for (const definition of phase6cDefinitions.filter((item) => item.principleId !== 'repetition')) assert.doesNotMatch(panel(definition), /複製單元/, definition.principleId);
});

test('Gate 4C unit copy: a unit is the shapes that touch, overlap or almost touch', () => {
  const engine = engineWith([...unit(), el('far', { x: 700, y: 400 })]);
  assert.deepEqual(engine.unitOf('s'), ['c', 's']);
  assert.deepEqual(engine.unitOf('far'), ['far']);
});

test('Gate 4C unit copy: the copy keeps the arrangement, lands in a free spot and is selected as one group', () => {
  const engine = engineWith(unit());
  engine.select('s');
  const result = engine.duplicateUnit();
  assert.equal(result.changed, true);
  const elements = engine.getState().elements;
  assert.equal(elements.length, 4);
  const [c2, s2] = elements.slice(2);
  assert.equal(s2.x - c2.x, 80); assert.equal(s2.y - c2.y, 0);
  assert.equal(s2.hue, 'blue'); assert.equal(c2.shape, 'circle');
  assert.deepEqual(engine.groupIds, [c2.id, s2.id]);
  assert.equal(engine.selectedId, c2.id);
  assert.ok(inside(engine));
  assert.deepEqual(engine.unitOf(c2.id), [c2.id, s2.id], 'the copy does not touch the original');
});

test('Gate 4C unit copy: one unit plus four copies passes the repetition check', () => {
  const engine = engineWith(unit());
  engine.select('c');
  for (let i = 0; i < 4; i += 1) assert.equal(engine.duplicateUnit().changed, true);
  const result = validatePhase6cExperiment(repetition, { workingElements: engine.getState().elements });
  assert.equal(result.passed, true, result.studentDetail);
  assert.equal(result.metrics.unitCount, 5);
  assert.ok(inside(engine));
});

test('Gate 4C unit copy: dragging a copied unit moves every shape together and stays on the canvas', () => {
  const engine = engineWith(unit());
  engine.select('c'); engine.duplicateUnit();
  const ids = [...engine.groupIds];
  const before = engine.getState().elements.filter((item) => ids.includes(item.id));
  assert.equal(engine.moveGroup(ids, { x: 100, y: 200 }).changed, true);
  const after = engine.getState().elements.filter((item) => ids.includes(item.id));
  after.forEach((item, index) => { assert.equal(item.x - before[index].x, 100); assert.equal(item.y - before[index].y, 200); });
  engine.moveGroup(ids, { x: 5000, y: 5000 });
  assert.ok(inside(engine));
  assert.equal(after[1].x - after[0].x, 80, 'arrangement unchanged');
});

test('Gate 4C unit copy: tapping a shape outside the group goes back to moving one shape at a time', () => {
  const engine = engineWith(unit());
  engine.select('c'); engine.duplicateUnit();
  const [first] = engine.groupIds;
  engine.select(first);
  assert.ok(engine.groupIds, 'tapping inside the group keeps it');
  engine.select('c');
  assert.equal(engine.groupIds, null);
  engine.select(first);
  assert.equal(engine.groupIds, null, 'the old copy is no longer grouped');
  engine.clearSelection();
  assert.equal(engine.groupIds, null);
});

test('Gate 4C unit copy: a full canvas says so instead of making units touch', () => {
  const crowd = [];
  for (let x = 70; x <= 930; x += 140) for (let y = 70; y <= 530; y += 140) crowd.push(el(`k${x}-${y}`, { shape: 'square', x, y, size: 4 }));
  const engine = engineWith(crowd);
  engine.select(crowd[0].id);
  const result = engine.duplicateUnit();
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'no-space');
});

test('Gate 4C unit copy: a kept selection survives a redraw, a stale one is ignored', () => {
  const engine = engineWith(unit());
  engine.select('c'); engine.duplicateUnit();
  const fresh = engineWith(engine.getState().elements);
  fresh.restoreSelection(engine.selectedId, engine.groupIds);
  assert.deepEqual(fresh.groupIds, engine.groupIds);
  const empty = engineWith(unit());
  empty.restoreSelection('missing', ['missing']);
  assert.equal(empty.selectedId, null); assert.equal(empty.groupIds, null);
});
