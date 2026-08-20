import test from 'node:test';
import assert from 'node:assert/strict';

import { principles, stages } from '../data.js';
import { nextHashForStage, resolveRoute, stageHash } from '../router.js';
import {
  createAppState,
  getStageState,
  updateStageState
} from '../state.js';
import { hasValidator, validateStage } from '../validators.js';

test('formal principle metadata contains the ten confirmed names', () => {
  assert.deepEqual(
    principles.map((principle) => principle.name),
    ['反覆', '漸層', '對稱', '均衡', '對比', '律動', '比例', '統一', '調和', '單純']
  );
  assert.equal(principles.length, 10);
  principles.forEach((principle) => {
    assert.equal(typeof principle.id, 'string');
    assert.equal(typeof principle.shortDescription, 'string');
    assert.equal(typeof principle.hasContent, 'boolean');
  });
});

test('valid stage routes resolve from data and invalid routes fall back safely', () => {
  const stage = stages[0];
  const validRoute = resolveRoute(stageHash(stage), stages, principles);
  assert.equal(validRoute.name, 'stage');
  assert.equal(validRoute.stage.id, stage.id);

  const invalidRoute = resolveRoute('#stage/unknown/missing', stages, principles);
  assert.equal(invalidRoute.name, 'home');
  assert.equal(invalidRoute.hash, '#home');
  assert.equal(invalidRoute.isFallback, true);
});

test('legacy prototype routes remain compatible', () => {
  const route = resolveRoute('#task-observe', stages, principles);
  assert.equal(route.name, 'stage');
  assert.equal(route.stage.id, 'gradation-observe');
  assert.equal(route.isLegacyAlias, true);
});

test('validator registry exposes and runs current gradation validators', () => {
  const recognize = stages.find((stage) => stage.id === 'gradation-observe');
  const discover = stages.find((stage) => stage.id === 'gradation-discover');
  const experiment = stages.find((stage) => stage.id === 'gradation-experiment');

  assert.equal(hasValidator(recognize.validatorId), true);
  assert.equal(hasValidator(discover.validatorId), true);
  assert.equal(hasValidator(experiment.validatorId), true);
  assert.equal(validateStage(recognize, { selectedOptionId: 'a' }).isValid, true);
  assert.equal(validateStage(discover, { selectedElementId: 'dot-4' }).isValid, true);
  assert.equal(validateStage(experiment, { order: [18, 28, 38, 48, 58, 70] }).isValid, true);
  assert.equal(validateStage(experiment, { order: [18, 38, 28, 48, 58, 70] }).isValid, false);
});

test('stage state is isolated by stage id', () => {
  const state = createAppState(stages);
  updateStageState(state, 'gradation-observe', {
    selectedOptionId: 'b',
    attempts: 1
  });

  assert.equal(getStageState(state, 'gradation-observe').selectedOptionId, 'b');
  assert.equal(getStageState(state, 'gradation-discover').selectedElementId, null);
  assert.deepEqual(
    getStageState(state, 'gradation-experiment').order,
    [58, 28, 70, 18, 48, 38]
  );
});

test('gradation stages form the original three-step flow', () => {
  const [recognize, discover, experiment] = stages;
  assert.equal(nextHashForStage(recognize, stages), stageHash(discover));
  assert.equal(nextHashForStage(discover, stages), stageHash(experiment));
  assert.equal(nextHashForStage(experiment, stages), '#complete/gradation');
});
