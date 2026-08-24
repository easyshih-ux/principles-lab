import test from 'node:test';
import assert from 'node:assert/strict';
import {
  experimentDefinitions,
  experimentDefinitionsById,
  getExperimentDefinition
} from '../experiment-definitions.js';
import { experimentValidators } from '../experiment-validators.js';
import { hintLevelForAttempt, resolveDiagnosticHint } from '../experiment-hints.js';
import {
  createExperimentSessionState,
  getExperimentState,
  updateExperimentState
} from '../experiment-session.js';
import { validateExperiment } from '../experiment-adapter.js';
import { ALLOWED_TOOL_DEFAULTS } from '../geometry/constrained-tools.js';

const principleIds = ['repetition', 'gradation', 'symmetry', 'balance', 'contrast', 'rhythm', 'proportion', 'unity', 'harmony', 'simplicity'];

test('ten formal experiment definitions exist with complete unique principles', () => {
  assert.equal(experimentDefinitions.length, 10);
  assert.deepEqual(experimentDefinitions.map((item) => item.principleId), principleIds);
  assert.equal(new Set(experimentDefinitions.map((item) => item.id)).size, 10);
  assert.equal(new Set(experimentDefinitions.map((item) => item.principleId)).size, 10);
  assert.equal(getExperimentDefinition('experiment-gradation'), experimentDefinitionsById['experiment-gradation']);
});

test('all definitions implement the common schema and keep engineering values out of task copy', () => {
  const required = ['id', 'principleId', 'title', 'task', 'studentConcept', 'allowedTools', 'initialState', 'experimentOptions', 'validatorId', 'validationSpec', 'diagnosticHints', 'successFeedback', 'discoveryFeedback', 'randomization', 'status'];
  for (const definition of experimentDefinitions) {
    required.forEach((field) => assert.ok(field in definition, `${definition.id}/${field}`));
    assert.doesNotMatch(definition.task, /minimum|tolerance|requiredUnityRatio|turnCount|\d+\.\d+/i);
  }
});

test('allowedTools uses exactly the Phase 6A constrained fields', () => {
  const legalTools = Object.keys(ALLOWED_TOOL_DEFAULTS).sort();
  for (const definition of experimentDefinitions) {
    assert.deepEqual(Object.keys(definition.allowedTools).sort(), legalTools);
    Object.values(definition.allowedTools).forEach((value) => assert.equal(typeof value, 'boolean'));
  }
});

test('each validator id exists and is marked pending calibration', () => {
  for (const definition of experimentDefinitions) {
    assert.equal(typeof experimentValidators[definition.validatorId], 'function');
    assert.equal(definition.validatorStatus, 'existing-pending-calibration');
    assert.equal(typeof definition.validationSpec, 'object');
  }
});

test('diagnostic hint schema is student-facing and resolves three attempt levels', () => {
  for (const definition of experimentDefinitions) {
    const hint = definition.diagnosticHints['conditions-missing'];
    assert.deepEqual(Object.keys(hint), ['observe', 'think', 'action']);
    Object.values(hint).forEach((text) => {
      assert.equal(typeof text, 'string');
      assert.doesNotMatch(text, /minimum|tolerance|validator|false|ratio \d/i);
    });
  }
  const definition = experimentDefinitions[0];
  assert.equal(hintLevelForAttempt(1), 'observe');
  assert.equal(hintLevelForAttempt(2), 'think');
  assert.equal(hintLevelForAttempt(3), 'action');
  assert.equal(hintLevelForAttempt(8), 'action');
  assert.equal(resolveDiagnosticHint(definition, 'conditions-missing', 2).level, 'think');
});

test('success feedback supports general, byMethod and discovery data', () => {
  for (const definition of experimentDefinitions) {
    assert.equal(typeof definition.successFeedback.general, 'string');
    assert.equal(typeof definition.successFeedback.byMethod, 'object');
    assert.equal(typeof definition.discoveryFeedback, 'object');
  }
  assert.equal(experimentDefinitionsById['experiment-gradation'].successFeedback.byMethod.spacing, '間距形成漸層。');
});

test('symmetry metadata supports all modes, grid and selected mode', () => {
  const symmetry = experimentDefinitionsById['experiment-symmetry'];
  assert.deepEqual(symmetry.experimentOptions.symmetryModes, ['vertical', 'horizontal', 'cross']);
  assert.deepEqual(symmetry.validationSpec.allowedSymmetryModes, ['vertical', 'horizontal', 'cross']);
  assert.equal(symmetry.initialState.selectedSymmetryMode, 'vertical');
  assert.equal(symmetry.initialState.gridConfig.enabled, true);
  assert.equal(symmetry.initialState.gridConfig.step, 20);
});

test('simplicity metadata supports before state, core ids and methods', () => {
  const simplicity = experimentDefinitionsById['experiment-simplicity'];
  assert.ok(Array.isArray(simplicity.initialState.beforeState));
  assert.ok(Array.isArray(simplicity.initialState.coreElementIds));
  assert.deepEqual(simplicity.experimentOptions.simplificationMethods, ['reduce', 'organize', 'simplifyVariety']);
  assert.equal(simplicity.validationSpec.coreProtection, true);
});

test('experiment session states are isolated by experiment id', () => {
  const session = createExperimentSessionState(experimentDefinitions);
  updateExperimentState(session, 'experiment-repetition', {
    workingElements: [{ id: 'only-repetition' }], attemptCount: 2, detectedMethods: ['single']
  });
  const repetition = getExperimentState(session, 'experiment-repetition');
  const gradation = getExperimentState(session, 'experiment-gradation');
  assert.equal(repetition.workingElements.length, 1);
  assert.equal(gradation.workingElements.length, 0);
  assert.equal(gradation.attemptCount, 0);
  assert.notEqual(repetition.workingElements, gradation.workingElements);
});

test('validator adapter reads validationSpec and preserves the Phase 3 interface', () => {
  const definition = experimentDefinitionsById['experiment-repetition'];
  const state = {
    workingElements: [0, 1, 2].map((index) => ({
      id: `repeat-${index}`, shape: 'circle', sizeLevel: 3, colorId: 'blue-3',
      rotation: 0, logicalX: 200 + index * 100, logicalY: 300
    })),
    detectedMethods: ['single'], selectedExperimentOption: { targetElementId: 'repeat-0' }
  };
  const result = validateExperiment(definition, state);
  for (const field of ['passed', 'isValid', 'code', 'fulfilledConditions', 'missingConditions', 'feedback', 'metrics']) {
    assert.ok(field in result, field);
  }
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['single']);
  assert.equal(result.primaryDiagnosticCode, 'valid');
});
