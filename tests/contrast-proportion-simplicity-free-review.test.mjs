import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getStagesForPrinciple, principles, stages } from '../data.js';
import { resolveRoute, stageHash } from '../router.js';
import { createAppState, getStageState, markStageComplete } from '../state.js';
import { validateStage } from '../validators.js';
import { bindSquareSizePreview } from '../renderers.js';

const byId = (id) => stages.find((stage) => stage.id === id);
const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('contrast, proportion, and simplicity expose isolated three-stage routes', () => {
  for (const id of ['contrast', 'proportion', 'simplicity']) {
    const principle = principles.find((item) => item.id === id);
    const items = getStagesForPrinciple(id);
    assert.equal(principle.hasContent, true);
    assert.equal(items.length, 3);
    items.forEach((stage) => assert.equal(resolveRoute(stageHash(stage), stages, principles).name, 'stage'));
  }
});

test('contrast Q1 and Q2 use multicolor compositions, option validation, and distinct difference animations', () => {
  const observe = byId('contrast-observe');
  observe.options.forEach((option) => assert.ok(new Set(option.colors).size >= 2));
  assert.equal(validateStage(observe, { selectedOptionId: 'b' }).isValid, true);
  assert.match(rendererSource, /contrastComposition\(option, shouldAnimate\)/);
  assert.match(stylesSource, /contrast-large-answer/);

  const discover = byId('contrast-discover');
  assert.equal(validateStage(discover, { selectedOptionId: 'a' }).isValid, true);
  assert.match(rendererSource, /renderRelationshipDiagnoseStage/);
  assert.match(stylesSource, /contrast-gap-large/);
});

test('contrast Q3 adjusts only two sizes and accepts multiple clear ratios', () => {
  const stage = byId('contrast-experiment');
  assert.equal(validateStage(stage, { sizes: [70, 40] }).isValid, true);
  assert.equal(validateStage(stage, { sizes: [40, 70] }).isValid, true);
  assert.equal(validateStage(stage, { sizes: [50, 42] }).isValid, false);
  assert.deepEqual(stage.allowedTools, ['size', 'undo', 'hint', 'validate']);
  assert.match(rendererSource, /data-contrast-size/);
  assert.match(rendererSource, /data-contrast-shape/);
  assert.match(rendererSource, /class="size-stage-layout"/);
  assert.match(stylesSource, /\.size-stage-layout\{height:100%;min-height:0;display:grid/);
  assert.match(rendererSource, /Math\.max\(\.\.\.stageState\.sizes\) \? 'larger' : 'smaller'/);
  const redInput = new EventTarget(); redInput.value = '46';
  const blueInput = new EventTarget(); blueInput.value = '42';
  const redShape = { style: { width: '46px', height: '46px' } };
  const blueShape = { style: { width: '42px', height: '42px' } };
  const sizes = [46, 42];
  bindSquareSizePreview(redInput, redShape, (size) => { sizes[0] = size; });
  bindSquareSizePreview(blueInput, blueShape, (size) => { sizes[1] = size; });
  redInput.value = '70'; redInput.dispatchEvent(new Event('input'));
  assert.deepEqual([redShape.style.width, blueShape.style.width, ...sizes], ['70px', '42px', 70, 42]);
  blueInput.value = '24'; blueInput.dispatchEvent(new Event('input'));
  assert.deepEqual([redShape.style.width, blueShape.style.width, ...sizes], ['70px', '24px', 70, 24]);
  assert.match(stylesSource, /contrast-result-emphasis/);
});

test('proportion Q1 and Q2 establish a multicolor main/support hierarchy', () => {
  const observe = byId('proportion-observe');
  observe.options.forEach((option) => assert.ok(new Set(option.colors).size >= 3));
  assert.equal(validateStage(observe, { selectedOptionId: 'b' }).isValid, true);
  assert.match(rendererSource, /proportionComposition\(option, shouldAnimate\)/);
  assert.match(stylesSource, /proportion-main-answer/);

  const discover = byId('proportion-discover');
  assert.equal(validateStage(discover, { selectedOptionId: 'a' }).isValid, true);
  assert.match(stylesSource, /proportion-emerge/);
});

test('proportion Q3 changes only the designated subject and rejects too little or too much dominance', () => {
  const stage = byId('proportion-experiment');
  assert.equal(validateStage(stage, { mainSize: 42, supportSize: 26 }).isValid, true);
  assert.equal(validateStage(stage, { mainSize: 34, supportSize: 26 }).isValid, false);
  assert.equal(validateStage(stage, { mainSize: 76, supportSize: 26 }).isValid, false);
  assert.deepEqual(stage.allowedTools, ['size', 'undo', 'hint', 'validate']);
  assert.match(rendererSource, /id="proportion-size"/);
  const mainInput = new EventTarget(); mainInput.value = '34';
  const mainShape = { style: { width: '34px', height: '34px' } };
  const supportWidths = ['26px', '23px', '27px', '24px'];
  let mainSize = 34;
  bindSquareSizePreview(mainInput, mainShape, (size) => { mainSize = size; });
  mainInput.value = '64'; mainInput.dispatchEvent(new Event('input'));
  assert.equal(mainSize, 64);
  assert.deepEqual([mainShape.style.width, mainShape.style.height], ['64px', '64px']);
  assert.deepEqual(supportWidths, ['26px', '23px', '27px', '24px']);
  assert.match(stylesSource, /proportion-focus-result/);
});

test('simplicity Q1 keeps the correct choice distinct from the emptiest choice', () => {
  const stage = byId('simplicity-observe');
  assert.equal(stage.options.find((option) => option.id === 'b').kind, 'clear');
  assert.equal(stage.options.find((option) => option.id === 'c').kind, 'empty');
  assert.equal(validateStage(stage, { selectedOptionId: 'b' }).isValid, true);
  stage.options.forEach((option) => assert.ok(new Set(option.colors).size >= 2));
  assert.match(rendererSource, /simplicityComposition\(option, shouldAnimate\)/);
  assert.match(stylesSource, /simplicity-interference-fade/);
});

test('simplicity Q2 protects core elements and accepts several extra selections', () => {
  const stage = byId('simplicity-discover');
  assert.equal(validateStage(stage, { selectedIds: ['core-1', 'extra-1', 'extra-2', 'extra-3'] }).code, 'core-selected');
  assert.equal(validateStage(stage, { selectedIds: ['extra-1', 'extra-2'] }).isValid, false);
  assert.equal(validateStage(stage, { selectedIds: ['extra-1', 'extra-2', 'extra-4'] }).isValid, true);
  assert.match(rendererSource, /renderSimplicityDiscoverStage/);
  assert.match(stylesSource, /simplicity-selected-fade/);
});

test('simplicity Q3 accepts varied reductions while preserving the full core', () => {
  const stage = byId('simplicity-experiment');
  assert.equal(stage.elements.length, 9);
  assert.equal(stage.validation.coreIds.length, 2);
  assert.equal(validateStage(stage, { remainingIds: ['s-core-1', 's-core-2', 's-3', 's-4'] }).isValid, true);
  assert.equal(validateStage(stage, { remainingIds: ['s-core-1', 's-core-2', 's-5', 's-6', 's-7', 's-8'] }).isValid, true);
  assert.equal(validateStage(stage, { remainingIds: ['s-core-1', 's-3', 's-4', 's-5'] }).code, 'core-missing');
  assert.equal(validateStage(stage, { remainingIds: ['s-core-1', 's-core-2', 's-3'] }).code, 'too-empty');
  assert.equal(validateStage(stage, { remainingIds: stage.initialState.remainingIds }).code, 'not-simple-enough');
  assert.equal(validateStage(stage, { remainingIds: [] }).code, 'too-empty');
  assert.deepEqual(stage.allowedTools, ['delete', 'undo', 'hint', 'validate']);
  assert.match(stage.prompt, /做減法/);
  assert.match(rendererSource, /poster-composition/);
  assert.match(stylesSource, /poster-frame/);
  assert.match(rendererSource, /data-delete-id/);
  assert.match(rendererSource, /deletedIds: \[\.\.\.stageState\.deletedIds, id\]/);
  assert.match(rendererSource, /remainingIds: \[\.\.\.stageState\.remainingIds, restored\]/);
  assert.match(rendererSource, /deleted-ghost/);
  assert.match(stylesSource, /simplicity-ghost-away/);
});

test('new free-review completion remains isolated from formal progress and classroom state', () => {
  const state = createAppState(stages);
  const courses = structuredClone(state.completion.courses);
  const mastery = structuredClone(state.masteryPractice);
  const classroom = structuredClone(state.classroomUnlocks);
  for (const id of ['contrast-experiment', 'proportion-experiment', 'simplicity-experiment']) markStageComplete(state, byId(id));
  assert.equal(getStageState(state, 'simplicity-experiment').isComplete, true);
  assert.deepEqual(state.completion.courses, courses);
  assert.deepEqual(state.masteryPractice, mastery);
  assert.deepEqual(state.classroomUnlocks, classroom);
});
