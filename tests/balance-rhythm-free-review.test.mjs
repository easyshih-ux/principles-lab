import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getStagesForPrinciple, principles, stages } from '../data.js';
import { resolveRoute, stageHash } from '../router.js';
import { createAppState, getStageState, markStageComplete } from '../state.js';
import { validateStage } from '../validators.js';

const byId = (id) => stages.find((item) => item.id === id);
const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('balance free-review route contains the existing three-stage flow', () => {
  const items = getStagesForPrinciple('balance');
  assert.deepEqual(items.map(({ id }) => id), ['balance-observe', 'balance-discover', 'balance-experiment']);
  items.forEach((item) => assert.equal(resolveRoute(stageHash(item), stages, principles).name, 'stage'));
});

test('visual balance rejects the initial imbalance and accepts asymmetric stability', () => {
  const stage = byId('balance-experiment');
  assert.equal(validateStage(stage, { position: { x: 88, y: 69 } }).isValid, false);
  assert.equal(validateStage(stage, { position: { x: 74, y: 65 } }).isValid, true);
  assert.equal(stage.elements.length, 3);
  assert.equal(stage.elements.filter(({ shape }) => shape === 'circle').length, 1);
  assert.equal(stage.elements.filter(({ shape }) => shape === 'square').length, 2);
  assert.ok(stage.elements.every(({ x }) => x !== 70));
});

test('balance success remains isolated from formal courses and Mastery', () => {
  const state = createAppState(stages);
  const courses = structuredClone(state.completion.courses);
  const mastery = structuredClone(state.masteryPractice);
  markStageComplete(state, byId('balance-experiment'));
  assert.equal(getStageState(state, 'balance-experiment').isComplete, true);
  assert.deepEqual(state.completion.courses, courses);
  assert.deepEqual(state.masteryPractice, mastery);
});

test('all balance stages use varied preset Bauhaus colors without changing validation', () => {
  const observe = byId('balance-observe');
  observe.options.forEach((option) => assert.ok(new Set(option.colors).size >= 2));
  assert.equal(observe.validation.correctOptionId, 'b');
  assert.ok(new Set(byId('balance-discover').elements.map(({ color }) => color)).size >= 3);
  const experiment = byId('balance-experiment');
  assert.ok(new Set([...experiment.elements.map(({ color }) => color), experiment.initialState.color]).size >= 3);
  assert.equal(experiment.validatorId, 'visual-balance');
  assert.match(rendererSource, /balanceComposition\(option\)/);
  assert.match(rendererSource, /--balance-color:var\(--\$\{element\.color\}\)/);
  assert.match(stylesSource, /\.balance-shape,\.position-element\{background:var\(--balance-color,var\(--blue\)\)\}/);
  assert.doesNotMatch(stylesSource, /@keyframes balance-[^{]+\{[^}]*background/);
});

test('rhythm free-review route contains the existing three-stage flow', () => {
  const items = getStagesForPrinciple('rhythm');
  assert.deepEqual(items.map(({ id }) => id), ['rhythm-observe', 'rhythm-discover', 'rhythm-experiment']);
  items.forEach((item) => assert.equal(resolveRoute(stageHash(item), stages, principles).name, 'stage'));
  assert.equal(byId('rhythm-discover').interactionType, 'rhythm-follow');
  assert.equal(byId('rhythm-experiment').interactionType, 'rhythm-drag');
});

test('rhythm second stage follows six dots instead of choosing or repairing', () => {
  const stage = byId('rhythm-discover');
  assert.equal(stage.title, '跟著節奏');
  assert.equal(stage.prompt, '跟著畫面的節奏，依序點擊圓點。');
  assert.equal(stage.options.length, 0);
  assert.equal(stage.positions.length, 6);
  const state = createAppState(stages);
  assert.deepEqual(getStageState(state, stage.id), {
    attempts: 0, feedback: '', isComplete: false, nextIndex: 0, demoComplete: false, pulseIndex: null
  });
});

test('visual rhythm uses only a visible minimum height difference', () => {
  const stage = byId('rhythm-experiment');
  assert.deepEqual(validateStage(stage, { positions: [50, 50, 50, 50, 50, 50] }), { isValid: false, code: 'height-difference-small' });
  assert.equal(validateStage(stage, { positions: [50, 52, 48, 53, 49, 51] }).isValid, false);
  assert.equal(validateStage(stage, { positions: [50, 50, 50, 62, 50, 50] }).isValid, true);
  assert.equal(validateStage(stage, { positions: [62, 48, 34, 50, 66, 44] }).isValid, true);
  assert.equal(validateStage(stage, { positions: [30, 58, 46, 70, 38, 60] }).isValid, true);
});

test('rhythm success state remains isolated from formal progress', () => {
  const state = createAppState(stages);
  const courses = structuredClone(state.completion.courses);
  markStageComplete(state, byId('rhythm-experiment'));
  assert.equal(getStageState(state, 'rhythm-experiment').isComplete, true);
  assert.deepEqual(state.completion.courses, courses);
});

test('symmetry and balance animations are gated by successful validation state', () => {
  assert.match(rendererSource, /stageState\.isComplete \? 'mirror-success' : ''/);
  assert.match(rendererSource, /stageState\.isComplete \? 'balance-success balance-success-repair' : ''/);
  assert.match(stylesSource, /\.mirror-success \.symmetry-axis\{animation:symmetry-axis-success 1s/);
  assert.match(stylesSource, /\.balance-success\{[^}]*animation:balance-settle \.9s/);
  assert.match(rendererSource, /if \(result\.isValid\) \{ markStageComplete\(state, stage\)/);
  assert.match(rendererSource, /else updateStageState\(state, stage\.id, \{ feedback:/);
});

test('all three balance stages use distinct principle-led settle animations', () => {
  assert.match(rendererSource, /balance-success balance-success-recognize/);
  assert.match(rendererSource, /balance-success balance-success-discover/);
  assert.match(rendererSource, /balance-success balance-success-repair/);
  assert.match(stylesSource, /@keyframes balance-settle\{[\s\S]*?translateX\(5px\)[\s\S]*?translateX\(-3px\)[\s\S]*?100%\{transform:none\}/);
  assert.match(stylesSource, /balance-success-discover \.position-element:last-of-type\{animation:balance-heavy-side/);
  assert.match(stylesSource, /balance-success-recognize \.balance-shape\.large\{animation:balance-large-weight/);
  assert.match(stylesSource, /balance-success-recognize \.balance-shape\.small:nth-of-type\(4\)\{animation-delay/);
  assert.match(stylesSource, /balance-success-repair\{animation:balance-settle/);
  assert.doesNotMatch(stylesSource, /balance-success[^\n]*symmetry-axis/);
});

test('all released principles bind success animation state and delay next actions', () => {
  assert.match(rendererSource, /shouldAnimate \? 'sequence-glow'/);
  assert.match(rendererSource, /shouldAnimate \? 'repeat-success'/);
  assert.match(rendererSource, /symmetryComposition\(option, shouldAnimate\)/);
  assert.match(rendererSource, /shouldAnimate \? 'balance-success balance-success-recognize'/);
  assert.match(rendererSource, /stageState\.isComplete \? 'rhythm-success' : ''/);
  assert.match(rendererSource, /stageState\.isComplete \? 'rhythm-success' : ''/);
  assert.match(rendererSource, /stageState\.isComplete \? \(stage\.principleId === 'repetition' \? 'repeat-success' : 'gradation-success'\) : ''/);
  assert.match(rendererSource, /data-success-delay/);
  assert.match(rendererSource, /action\.disabled = false/);
  assert.match(rendererSource, /stageState\.isComplete\s*\? successActionButton\('完成實驗', stage\)/);
});

test('rhythm stages animate the saved student positions from left to right', () => {
  assert.match(rendererSource, /stageState\.positions\.map\(\(y, index\)/);
  assert.match(rendererSource, /--y:\$\{y\}%;--delay:\$\{index \* \.1\}s/);
  assert.match(stylesSource, /\.rhythm-success \.rhythm-element/);
  assert.match(stylesSource, /@keyframes rhythm-wave\{50%\{transform:translate\(-50%,calc\(-50% - 9px\)\)\}/);
});

test('all rhythm stages preserve Bauhaus colors while animating position', () => {
  assert.match(rendererSource, /'rhythm-bauhaus'/);
  assert.match(rendererSource, /--rhythm-color:\$\{\['var\(--blue\)', 'var\(--red\)', 'var\(--yellow\)'\]\[index % 3\]\}/);
  assert.match(stylesSource, /\.rhythm-bauhaus i:nth-child\(3n\+1\)\{background:var\(--blue\)\}/);
  assert.match(stylesSource, /\.rhythm-bauhaus i:nth-child\(3n\+2\)\{background:var\(--red\)\}/);
  assert.match(stylesSource, /\.rhythm-bauhaus i:nth-child\(3n\)\{background:var\(--yellow\)\}/);
  assert.doesNotMatch(stylesSource, /@keyframes rhythm-wave\{[^}]*background|@keyframes rhythm-tap\{[^}]*background/);
});

test('rhythm follow stage demonstrates, accepts sequential clicks, and completes without old repair UI', () => {
  assert.match(rendererSource, /rhythm-follow-demo/);
  assert.match(rendererSource, /data-rhythm-follow-index/);
  assert.match(rendererSource, /index !== stageState\.nextIndex/);
  assert.match(rendererSource, /feedback: stage\.hints\[0\]/);
  assert.match(rendererSource, /nextIndex === stage\.positions\.length/);
  assert.match(rendererSource, /markStageComplete\(state, stage\)/);
  assert.match(stylesSource, /\.rhythm-follow-demo \.rhythm-element/);
  assert.match(stylesSource, /\.rhythm-follow-board\.rhythm-success \.rhythm-element/);
  assert.match(stylesSource, /\.rhythm-bauhaus \.rhythm-element:nth-child\(3n\+1\)/);
  assert.doesNotMatch(rendererSource, /rhythm-create-board|data-rhythm-create-index|isRhythmCreate|rhythm-repair-board|data-rhythm-repair/);
});

test('failed validation cannot create completion-gated animation state', () => {
  const state = createAppState(stages);
  const stage = byId('rhythm-experiment');
  const result = validateStage(stage, { positions: stage.initialState.positions });
  assert.equal(result.isValid, false);
  assert.equal(getStageState(state, stage.id).isComplete, false);
  assert.doesNotMatch(stylesSource, /confetti|particle|彩帶/i);
});
