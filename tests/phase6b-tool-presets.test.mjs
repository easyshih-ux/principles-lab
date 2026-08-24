import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentDefinitions } from '../experiment-definitions.js';

const expected = {
  repetition: ['shape', 'size', 'color', 'position', 'rotation', 'duplicate', 'delete'],
  gradation: ['size', 'color', 'position'],
  symmetry: ['shape', 'size', 'position', 'rotation', 'duplicate', 'grid'],
  balance: ['shape', 'size', 'position', 'duplicate', 'delete'],
  contrast: ['shape', 'size', 'color', 'position'],
  rhythm: ['shape', 'size', 'position', 'rotation', 'duplicate'],
  proportion: ['shape', 'ratioSize', 'position', 'duplicate', 'delete'],
  unity: ['shape', 'color', 'position', 'rotation', 'duplicate'],
  harmony: ['shape', 'color', 'size', 'position', 'duplicate'],
  simplicity: ['position', 'size', 'color', 'delete']
};

test('the ten experiment definitions use the confirmed default tool presets', () => {
  for (const definition of experimentDefinitions) {
    const enabled = Object.entries(definition.allowedTools)
      .filter(([, value]) => value)
      .map(([tool]) => tool);
    assert.deepEqual(enabled.sort(), [...expected[definition.principleId]].sort());
  }
});
