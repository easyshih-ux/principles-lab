import test from 'node:test';
import assert from 'node:assert/strict';
import { createElementState } from '../geometry/constrained-tools.js';

test('general size is not replaced by the legacy default proportion field', () => {
  const state = createElementState({ id: 'legacy', size: 5, proportion: 1 });
  assert.equal(state.sizeLevel, 5);
  assert.equal(state.ratioLevel, null);
  assert.equal(state.logicalSize, 140);
});

test('ratio size is enabled only by an explicit ratioLevel', () => {
  const state = createElementState({ id: 'ratio', sizeLevel: 5, ratioLevel: 2 });
  assert.equal(state.ratioLevel, 2);
  assert.equal(state.logicalSize, 80);
});
