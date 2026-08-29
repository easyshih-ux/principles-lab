import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { principles, stages, getStagesForPrinciple } from '../data.js';
import { resolveRoute, stageHash } from '../router.js';
import { createAppState, getStageState, markStageComplete } from '../state.js';
import { validateStage } from '../validators.js';

const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const classroomSource = readFileSync(new URL('../classroom-unlocks.js', import.meta.url), 'utf8');

function stage(id) {
  return stages.find((item) => item.id === id);
}

test('free-review wall opens only repetition, gradation, and symmetry experiments', () => {
  const available = principles.filter((item) => item.hasContent && item.status === 'available');
  assert.deepEqual(available.map((item) => item.id), ['repetition', 'gradation', 'symmetry']);
  assert.equal(principles.filter((item) => !item.hasContent).length, 7);
  assert.match(rendererSource, /視覺實驗 →/);
  assert.doesNotMatch(rendererSource, /漸層示範 →/);
});

test('repetition free-review route and three-stage data are complete', () => {
  const reviewStages = getStagesForPrinciple('repetition');
  assert.deepEqual(reviewStages.map((item) => item.id), [
    'repetition-observe', 'repetition-discover', 'repetition-experiment'
  ]);
  reviewStages.forEach((item) => assert.equal(resolveRoute(stageHash(item), stages, principles).name, 'stage'));
  assert.equal(stage('repetition-observe').options.length, 3);
  assert.equal(stage('repetition-discover').validation.correctElementId, 'repeat-wrong');
  assert.deepEqual(stage('repetition-experiment').initialState.order, ['●', '■', '■', '●', '●', '■']);
});

test('repetition cannot complete while broken and passes after the unit is restored', () => {
  const repair = stage('repetition-experiment');
  assert.equal(validateStage(repair, { order: repair.initialState.order }).isValid, false);
  assert.equal(validateStage(repair, { order: ['●', '■', '●', '■', '●', '■'] }).isValid, true);
  assert.match(repair.successFeedback, /^反覆完成！/);
});

test('symmetry free-review route and mirror data are complete', () => {
  const reviewStages = getStagesForPrinciple('symmetry');
  assert.deepEqual(reviewStages.map((item) => item.id), [
    'symmetry-observe', 'symmetry-discover', 'symmetry-experiment'
  ]);
  reviewStages.forEach((item) => assert.equal(resolveRoute(stageHash(item), stages, principles).name, 'stage'));
  assert.deepEqual(stage('symmetry-experiment').validation.target, { x: 70, y: 42 });
  assert.equal(stage('symmetry-discover').elements.find((item) => item.id === 'symmetry-middle').correctY, 42);
});

test('symmetry rejects a displaced element and accepts a reasonable tolerance', () => {
  const repair = stage('symmetry-experiment');
  assert.equal(validateStage(repair, { position: { x: 78, y: 58 } }).isValid, false);
  assert.equal(validateStage(repair, { position: { x: 73, y: 45 } }).isValid, true);
  assert.equal(validateStage(repair, { position: { x: 76, y: 42 } }).isValid, false);
  assert.match(repair.successFeedback, /^對稱完成！/);
});

test('free-review success state does not alter formal course or Mastery state', () => {
  const state = createAppState(stages);
  const coursesBefore = structuredClone(state.completion.courses);
  const masteryBefore = structuredClone(state.masteryPractice);
  markStageComplete(state, stage('repetition-experiment'));
  markStageComplete(state, stage('symmetry-experiment'));
  assert.deepEqual(state.completion.courses, coursesBefore);
  assert.deepEqual(state.masteryPractice, masteryBefore);
  assert.equal(getStageState(state, 'repetition-experiment').isComplete, true);
  assert.equal(getStageState(state, 'symmetry-experiment').isComplete, true);
});

test('gradation free-review behavior and formal routes remain available', () => {
  const gradation = getStagesForPrinciple('gradation');
  assert.equal(validateStage(stage('gradation-experiment'), { order: [18, 28, 38, 48, 58, 70] }).isValid, true);
  gradation.forEach((item) => assert.equal(resolveRoute(stageHash(item), stages, principles).name, 'stage'));
  assert.equal(resolveRoute('#level/recognize/start', stages, principles).name, 'recognizeStart');
  assert.equal(resolveRoute('#level/discover/start', stages, principles).name, 'discoverStart');
  assert.equal(resolveRoute('#level/experiment/start', stages, principles).name, 'experimentStart');
});

test('Classroom Control implementation is not bypassed by free-review additions', () => {
  assert.match(classroomSource, /isClassroomRouteAllowed/);
  assert.match(classroomSource, /requiredUnlockForRoute/);
  assert.doesNotMatch(rendererSource, /classroomUnlocks\s*\[[^\]]+\]\s*=\s*true/);
});
