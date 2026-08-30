import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { principles, stages } from '../data.js';
import { createAppState, markFreeReviewVisited } from '../state.js';

const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const principlesRenderer = rendererSource.slice(rendererSource.indexOf('function renderPrinciples()'), rendererSource.indexOf('function renderRecognizeStage'));

test('#principles renders ten ordered free-review cards with dedicated icon types', () => {
  assert.deepEqual(principles.map(({ id }) => id), ['repetition', 'gradation', 'symmetry', 'balance', 'contrast', 'rhythm', 'proportion', 'unity', 'harmony', 'simplicity']);
  assert.match(principlesRenderer, /principles\.map\(\(principle, index\)/);
  for (const id of principles.map(({ id }) => id)) assert.match(rendererSource, new RegExp(`${id}:`));
  assert.match(rendererSource, /icon-\$\{principleId\}/);
  assert.match(principlesRenderer, /String\(index \+ 1\)\.padStart\(2, '0'\)/);
});

test('principle icons use visible Bauhaus red, yellow, blue, and black on a light card', () => {
  for (const color of ['red', 'yellow', 'blue', 'black']) assert.match(rendererSource, new RegExp(`\\b${color}\\b`));
  assert.match(stylesSource, /\.principle-card\{[^}]*background:var\(--surface\)!important/);
  assert.match(stylesSource, /\.principle-card-icon \.yellow\{background:var\(--yellow\)\}/);
  assert.match(stylesSource, /\.principles-grid\{[^}]*grid-template-columns:repeat\(5/);
});

test('visited state is isolated from formal completion, Mastery, and Classroom Control', () => {
  const state = createAppState(stages);
  const completion = structuredClone(state.completion);
  const mastery = structuredClone(state.masteryPractice);
  const classroom = structuredClone(state.classroomUnlocks);
  markFreeReviewVisited(state, 'contrast');
  assert.deepEqual(state.freeReviewVisited, { contrast: true });
  assert.deepEqual(state.completion, completion);
  assert.deepEqual(state.masteryPractice, mastery);
  assert.deepEqual(state.classroomUnlocks, classroom);
});

test('clicking a principle marks it visited and keeps the card available for re-entry', () => {
  assert.match(principlesRenderer, /markFreeReviewVisited\(state, principleId\)/);
  assert.match(principlesRenderer, /state\.freeReviewVisited\[principle\.id\] === true/);
  assert.match(principlesRenderer, /class="sample-enter" data-principle-id/);
  assert.match(stylesSource, /\.principle-card\.visited:hover/);
  assert.doesNotMatch(stylesSource, /\.principle-card\.visited[^}]*pointer-events:none/);
});

test('#principles is a focused free-review page with a home back action and no classroom navigation', () => {
  assert.match(principlesRenderer, /10 個形式原理視覺實驗/);
  assert.match(principlesRenderer, /點選任一原理，開始自由複習與練習/);
  assert.match(principlesRenderer, /navigate\('#home'\)/);
  assert.doesNotMatch(principlesRenderer, /bindClassroomControls/);
  assert.doesNotMatch(principlesRenderer, /classroomCourseCardsMarkup/);
  assert.doesNotMatch(principlesRenderer, /正式挑戰|學習歷程|Mastery|班級管理/);
});
