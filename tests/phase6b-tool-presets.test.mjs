import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentDefinitions } from '../experiment-definitions.js';

const expected = {
  repetition: ['addShape','size','color','position','rotation','duplicate','delete'],
  gradation: ['addShape','size','color','lightness','position','duplicate','delete'],
  symmetry: ['addShape','size','position','rotation','duplicate','delete','grid'],
  balance: ['addShape','size','position','duplicate','delete'],
  contrast: ['addShape','size','color','position','duplicate','delete'],
  rhythm: ['addShape','size','position','rotation','duplicate','delete'],
  proportion: ['addShape','ratioSize','position','duplicate','delete'],
  unity: ['addShape','color','position','rotation','duplicate','delete'],
  harmony: ['addShape','color','lightness','size','position','duplicate','delete'],
  simplicity: ['position','size','color','delete']
};

test('the ten experiment definitions use the confirmed default tool presets', () => {
  for (const definition of experimentDefinitions) {
    const enabled = Object.entries(definition.allowedTools)
      .filter(([, value]) => value)
      .map(([tool]) => tool);
    assert.deepEqual(enabled.sort(), [...expected[definition.principleId]].sort());
  }
});
