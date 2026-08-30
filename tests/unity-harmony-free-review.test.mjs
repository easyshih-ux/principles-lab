import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getStagesForPrinciple, principles, stages } from '../data.js';
import { resolveRoute, stageHash } from '../router.js';
import { createAppState, getStageState, markStageComplete } from '../state.js';
import { validateStage } from '../validators.js';

const byId = (id) => stages.find((stage) => stage.id === id);
const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('unity and harmony expose isolated three-stage free-review routes', () => {
  for (const id of ['unity', 'harmony']) {
    const principle = principles.find((item) => item.id === id);
    const items = getStagesForPrinciple(id);
    assert.equal(principle.hasContent, true);
    assert.equal(items.length, 3);
    items.forEach((stage) => assert.equal(resolveRoute(stageHash(stage), stages, principles).name, 'stage'));
  }
});

test('unity Q1 keeps all choices multicolor and preserves option validation', () => {
  const stage = byId('unity-observe');
  stage.options.forEach(({ colors }) => assert.ok(new Set(colors).size >= 3));
  assert.equal(validateStage(stage, { selectedOptionId: 'a' }).isValid, true);
  assert.equal(validateStage(stage, { selectedOptionId: 'b' }).isValid, false);
  assert.equal(validateStage(stage, { selectedOptionId: 'c' }).isValid, false);
  assert.match(rendererSource, /unityComposition\(option, shouldAnimate\)/);
  assert.match(stylesSource, /unity-recognize-success i\{animation:unity-family-response/);
});

test('unity Q2 identifies only the direction outlier and has a distinct animation', () => {
  const stage = byId('unity-discover');
  assert.equal(validateStage(stage, { selectedElementId: 'u4' }).isValid, true);
  assert.equal(validateStage(stage, { selectedElementId: 'u2' }).isValid, false);
  assert.equal(new Set(stage.elements.map(({ color }) => color)).size >= 3, true);
  assert.match(stylesSource, /unity-diagnose-success \.direction-arrow:not\(\.outlier\)/);
  assert.match(stylesSource, /unity-diagnose-success \.direction-arrow\.outlier/);
});

test('unity Q3 accepts a tolerant shared direction without using color', () => {
  const stage = byId('unity-experiment');
  assert.equal(stage.validation.tolerance, 12);
  assert.equal(validateStage(stage, { rotation: 45 }).isValid, true);
  assert.equal(validateStage(stage, { rotation: 55 }).isValid, true);
  assert.equal(validateStage(stage, { rotation: 70 }).isValid, false);
  assert.equal(validateStage(stage, { rotation: 45, color: 'violet' }).isValid, true);
  assert.match(rendererSource, /renderUnityRotateStage/);
  assert.match(stylesSource, /unity-rotate-success \.direction-arrow\{animation:unity-flow-together/);
});

test('harmony Q1 holds geometry constant and validates the neighboring color group', () => {
  const stage = byId('harmony-observe');
  stage.options.forEach(({ colors }) => assert.equal(colors.length, 6));
  assert.equal(validateStage(stage, { selectedOptionId: 'a' }).isValid, true);
  assert.equal(validateStage(stage, { selectedOptionId: 'b' }).isValid, false);
  assert.equal(validateStage(stage, { selectedOptionId: 'c' }).isValid, false);
  assert.match(rendererSource, /harmonyComposition\(option, shouldAnimate\)/);
  assert.match(stylesSource, /harmony-recognize-success i\{animation:harmony-color-answer/);
});

test('harmony Q2 identifies the isolated hue with matching shapes and sizes', () => {
  const stage = byId('harmony-discover');
  assert.equal(validateStage(stage, { selectedElementId: 'h4' }).isValid, true);
  assert.equal(validateStage(stage, { selectedElementId: 'h3' }).isValid, false);
  assert.match(rendererSource, /class="harmony-dot/);
  assert.match(stylesSource, /harmony-diagnose-success \.harmony-dot:not\(\.outlier\)/);
  assert.match(stylesSource, /harmony-diagnose-success \.harmony-dot\.outlier/);
});

test('harmony Q3 renders six dots and exposes three visual candidates only after clicking the target', () => {
  const stage = byId('harmony-experiment');
  assert.equal(stage.elements.length, 6);
  assert.equal(stage.elements[stage.targetIndex].color, 'blue');
  assert.equal(stage.candidates.length, 3);
  assert.equal(stage.candidates.indexOf('orange'), 1);
  const state = createAppState(stages);
  assert.equal(getStageState(state, stage.id).paletteOpen, false);
  assert.match(rendererSource, /id="harmony-repair-target"/);
  assert.match(rendererSource, /data-harmony-color/);
  assert.match(rendererSource, /paletteOpen: true/);
  assert.match(rendererSource, /stageState\.paletteOpen && !stageState\.isComplete/);
  assert.doesNotMatch(rendererSource, /type="color"/);
});

test('harmony Q3 immediately validates color choices and retains retries or final color', () => {
  const stage = byId('harmony-experiment');
  assert.equal(validateStage(stage, { selectedHue: 'red' }).isValid, true);
  assert.equal(validateStage(stage, { selectedHue: 'red-orange' }).isValid, true);
  assert.equal(validateStage(stage, { selectedHue: 'orange' }).isValid, true);
  assert.equal(validateStage(stage, { selectedHue: 'yellow-orange' }).isValid, true);
  assert.equal(validateStage(stage, { selectedHue: 'blue-violet' }).isValid, false);
  assert.equal(validateStage(stage, { selectedHue: 'green' }).isValid, false);
  assert.match(rendererSource, /const result = validateStage\(stage, \{ selectedHue \}\)/);
  assert.match(rendererSource, /selectedHue, paletteOpen: true, feedback: stage\.feedbackByCode/);
  assert.match(rendererSource, /selectedHue, paletteOpen: false, feedback: stage\.successFeedback/);
  assert.match(rendererSource, /markStageComplete\(state, stage\)/);
  assert.match(stylesSource, /harmony-repair-success \.harmony-repair-dot\{animation:harmony-repair-breathe/);
  assert.match(stylesSource, /harmony-repair-success\{animation:harmony-group-breathe/);
});

test('new free-review completion does not alter courses, Mastery, or Classroom Control', () => {
  const state = createAppState(stages);
  const courses = structuredClone(state.completion.courses);
  const mastery = structuredClone(state.masteryPractice);
  const classroom = structuredClone(state.classroomUnlocks);
  markStageComplete(state, byId('unity-experiment'));
  markStageComplete(state, byId('harmony-experiment'));
  assert.equal(getStageState(state, 'unity-experiment').isComplete, true);
  assert.equal(getStageState(state, 'harmony-experiment').isComplete, true);
  assert.deepEqual(state.completion.courses, courses);
  assert.deepEqual(state.masteryPractice, mastery);
  assert.deepEqual(state.classroomUnlocks, classroom);
});
