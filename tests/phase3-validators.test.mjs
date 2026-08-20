import test from 'node:test';
import assert from 'node:assert/strict';

import {
  experimentValidatorIds,
  validateExperiment,
  validateBalance,
  validateContrast,
  validateGradation,
  validateHarmony,
  validateProportion,
  validateRepetition,
  validateRhythm,
  validateSimplicity,
  validateSymmetry,
  validateUnity
} from '../experiment-validators.js';
import { validatorLabFixtures } from '../validator-fixtures.js';
import { hasValidator, validateStage } from '../validators.js';

function element(id, values = {}) {
  return {
    id, shape: 'circle', x: 100, y: 300, size: 3, hue: 'blue',
    lightness: 3, rotation: 0, proportion: 1, ...values
  };
}

for (const [principleId, fixture] of Object.entries(validatorLabFixtures)) {
  test(`${principleId} clear pass fixture passes`, () => {
    const validation = validateExperiment(fixture.validatorId, fixture.pass);
    assert.equal(validation.passed, true);
    assert.equal(validation.missingConditions.length, 0);
    assert.equal(validation.isValid, validation.passed);
    assert.ok(Array.isArray(validation.fulfilledConditions));
    assert.ok(Array.isArray(validation.feedback));
    assert.equal(typeof validation.metrics, 'object');
  });

  test(`${principleId} clear fail fixture reports all missing conditions`, () => {
    const validation = validateExperiment(fixture.validatorId, fixture.fail);
    assert.equal(validation.passed, false);
    assert.ok(validation.missingConditions.length >= 1);
    assert.equal(validation.feedback.length, validation.fulfilledConditions.length + validation.missingConditions.length);
  });
}

test('experiment validators are registered without breaking the Phase 1A interface', () => {
  Object.values(experimentValidatorIds).forEach((id) => assert.equal(hasValidator(id), true));
  const stage = { validatorId: experimentValidatorIds.proportion, validation: { requiredRatios: [1, 2, 3], minimumElements: 3 } };
  const result = validateStage(stage, { elements: [element('a'), element('b', { proportion: 2 }), element('c', { proportion: 3 })] });
  assert.equal(result.isValid, true);
  assert.equal(result.passed, true);
});

test('repetition accepts an exact minimum and partial target signature', () => {
  const elements = [1, 2, 3].map((number) => element(`r${number}`, { shape: 'square', hue: number === 3 ? 'red' : 'blue' }));
  const result = validateRepetition({ elements, spec: { targetSignature: { shape: 'square' }, minimumOccurrences: 3 } });
  assert.equal(result.passed, true);
  assert.equal(result.metrics.occurrenceCount, 3);
});

test('gradation passes increasing and decreasing size sequences without requiring equal intervals', () => {
  const make = (values) => values.map((size, index) => element(`g${index}`, { x: index * 100, size }));
  assert.equal(validateGradation({ elements: make([1, 2, 4, 5]), spec: { gradationMode: 'size' } }).passed, true);
  assert.equal(validateGradation({ elements: make([5, 4, 2, 1]), spec: { gradationMode: 'size' } }).passed, true);
});

test('gradation rejects 1, 3, 2, 5 and validates logical spacing changes', () => {
  const broken = [1, 3, 2, 5].map((size, index) => element(`g${index}`, { x: index * 100, size }));
  const spacing = [100, 200, 340, 520].map((x, index) => element(`s${index}`, { x }));
  assert.equal(validateGradation({ elements: broken, spec: { gradationMode: 'size' } }).passed, false);
  assert.equal(validateGradation({ elements: spacing, spec: { gradationMode: 'spacing', minimumStages: 3 } }).passed, true);
});

test('gradation supports fixed lightness levels in either direction', () => {
  const elements = [5, 4, 2, 1].map((lightness, index) => element(`l${index}`, { x: index * 100, lightness }));
  assert.equal(validateGradation({ elements, spec: { gradationMode: 'lightness' } }).passed, true);
});

test('symmetry honors small logical tolerance and reports a missing counterpart', () => {
  const nearMirror = [element('a', { x: 300, y: 200 }), element('b', { x: 700.5, y: 200.5 })];
  assert.equal(validateSymmetry({ elements: nearMirror, spec: { symmetryAxis: 500, positionTolerance: 1 } }).passed, true);
  const missing = validateSymmetry({ elements: [...nearMirror, element('c', { x: 250 })], spec: { symmetryAxis: 500, positionTolerance: 1 } });
  assert.equal(missing.passed, false);
  assert.equal(missing.metrics.unmatchedElements.length, 1);
});

test('balance rejects a perfect mirror even when moments are equal', () => {
  const mirror = [element('a', { x: 300 }), element('b', { x: 700 })];
  const validation = validateBalance({ elements: mirror, spec: { symmetryAxis: 500, balanceTolerance: 0.1 } });
  assert.equal(validation.metrics.differenceRatio, 0);
  assert.equal(validation.metrics.isMirror, true);
  assert.equal(validation.passed, false);
});

test('balance allows its mirror restriction to be disabled by experiment spec', () => {
  const mirror = [element('a', { x: 300 }), element('b', { x: 700 })];
  assert.equal(validateBalance({ elements: mirror, spec: { symmetryAxis: 500, balanceTolerance: 0, requireAsymmetry: false } }).passed, true);
});

test('rhythm rejects flat lines and a sequence with only one turn', () => {
  const make = (ys) => ys.map((y, index) => element(`y${index}`, { x: index * 100, y }));
  assert.equal(validateRhythm({ elements: make([300, 300, 300, 300, 300]), spec: { minimumTurns: 2, minimumYRange: 80 } }).passed, false);
  const oneTurn = validateRhythm({ elements: make([300, 200, 100, 200, 300]), spec: { minimumTurns: 2, minimumYRange: 80 } });
  assert.equal(oneTurn.metrics.turnCount, 1);
  assert.equal(oneTurn.passed, false);
});

test('rhythm ignores y noise below minimumDelta', () => {
  const elements = [300, 305, 295, 304, 298].map((y, index) => element(`n${index}`, { x: index * 100, y }));
  const validation = validateRhythm({ elements, spec: { minimumDelta: 20, minimumYRange: 40, minimumTurns: 2 } });
  assert.equal(validation.metrics.turnCount, 0);
  assert.equal(validation.metrics.isFlat, true);
});

test('harmony fails both complete sameness and mixed hue families', () => {
  const shapes = ['circle', 'square', 'triangle'];
  const same = shapes.map((shape, index) => element(`h${index}`, { shape, lightness: 3 }));
  const mixed = shapes.map((shape, index) => element(`m${index}`, { shape, lightness: index + 1, hue: index === 2 ? 'red' : 'blue' }));
  assert.equal(validateHarmony({ elements: same, spec: { minimumShapes: 3, minimumLightnessLevels: 3 } }).passed, false);
  assert.equal(validateHarmony({ elements: mixed, spec: { minimumShapes: 3, minimumLightnessLevels: 3 } }).passed, false);
});

test('unity passes exactly at required ratio and supports metadata modes', () => {
  const elements = [
    element('a', { featureTags: ['rounded'] }),
    element('b', { shape: 'square', featureTags: ['rounded'] }),
    element('c', { shape: 'triangle', featureTags: ['rounded'] }),
    element('d', { shape: 'rectangle', featureTags: [] })
  ];
  const validation = validateUnity({ elements, spec: { unityMode: 'shapeFeature', requiredFeatureTag: 'rounded', requiredUnityRatio: 0.75, minimumShapes: 3 } });
  assert.equal(validation.metrics.matchingRatio, 0.75);
  assert.equal(validation.passed, true);
});

test('unity supports rotation and declared lineStyle metadata without image guessing', () => {
  const rotationElements = [element('a', { rotation: 90 }), element('b', { shape: 'square', rotation: 90 }), element('c', { shape: 'triangle', rotation: 0 })];
  assert.equal(validateUnity({ elements: rotationElements, spec: { unityMode: 'rotation', targetRotation: 90, requiredUnityRatio: 2 / 3 } }).passed, true);
  const lineElements = [element('a', { lineStyle: 'solid' }), element('b', { lineStyle: 'solid' }), element('c', { lineStyle: 'dashed' })];
  assert.equal(validateUnity({ elements: lineElements, spec: { unityMode: 'lineStyle', requiredLineStyle: 'solid', requiredUnityRatio: 2 / 3 } }).passed, true);
});

test('contrast only evaluates the declared mode', () => {
  const elements = [element('a', { size: 2, hue: 'red', shape: 'circle' }), element('b', { size: 3, hue: 'green', shape: 'triangle' })];
  assert.equal(validateContrast({ elements, spec: { contrastMode: 'size', minimumSizeDifference: 3 } }).passed, false);
  assert.equal(validateContrast({ elements, spec: { contrastMode: 'color' } }).passed, true);
  assert.equal(validateContrast({ elements, spec: { contrastMode: 'shape', requiredShapePair: ['circle', 'triangle'] } }).passed, true);
});

test('proportion passes at six elements and reports ratio 2 when only 1 and 3 are used', () => {
  const exact = [1, 2, 3, 1, 2, 3].map((proportion, index) => element(`p${index}`, { proportion }));
  assert.equal(validateProportion({ elements: exact, spec: { requiredRatios: [1, 2, 3], minimumElements: 6 } }).passed, true);
  const missing = validateProportion({ elements: exact.map((item) => ({ ...item, proportion: item.proportion === 2 ? 1 : item.proportion })), spec: { requiredRatios: [1, 2, 3], minimumElements: 6 } });
  assert.deepEqual(missing.metrics.missingRatios, [2]);
});

test('simplicity rejects removing a core element and rejects unchanged complexity', () => {
  const before = [element('core'), element('extra', { isDecoration: true })];
  const removedCore = validateSimplicity({ beforeState: before, afterState: [element('extra')], spec: { coreElementIds: ['core'], minimumActions: 1 } });
  assert.equal(removedCore.metrics.coreElementsPreserved, false);
  assert.equal(removedCore.passed, false);
  const unchanged = validateSimplicity({ beforeState: before, afterState: before.map((item) => ({ ...item })), spec: { coreElementIds: ['core'], minimumActions: 1 } });
  assert.equal(unchanged.metrics.beforeComplexity, unchanged.metrics.afterComplexity);
  assert.equal(unchanged.passed, false);
});
