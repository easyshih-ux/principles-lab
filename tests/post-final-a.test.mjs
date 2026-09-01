import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

import { recognizeQuestions } from '../recognize-questions.js';
import { recognizeTemplateCount, recognizeTemplatePools, getRecognizeVariant } from '../recognize-template-pool.js';
import { createRecognizeSession, fisherYates } from '../recognize-randomizer.js';
import {
  applyRecognizeValidation,
  createRecognizeCourseState,
  firstIncompleteQuestion,
  getRecognizeSessionQuestion,
  getRecognizeSessionQuestions,
  resetRecognizeCourse
} from '../recognize-course-state.js';
import { getRotatedHalfExtents } from '../geometry/bounds.js';
import { HUE_IDS } from '../geometry/config.js';
import { validateBalance } from '../experiment-validators.js';
import { principles, stages } from '../data.js';
import { resolveRoute } from '../router.js';

const source = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const byPrinciple = Object.fromEntries(recognizeQuestions.map((question) => [question.principleId, question]));
const template = (principleId, variantId) => getRecognizeVariant(byPrinciple[principleId], variantId);
const expectedOrder = ['repetition', 'gradation', 'symmetry', 'balance', 'rhythm', 'contrast', 'harmony', 'unity'];

const approvedVariantAHashes = Object.freeze({
  repetition: '14250cebb9346d6db4c067b7732ff2f4cfa5382fa99b6f80eef0d437d284f819',
  gradation: 'abfad55850b2571c8b0bdc85aea6376fb1ba26c686a9341502d8eae193d77de9',
  symmetry: '7ec0fac205174b95f3a13593392108ab314283dfde3d22eb867e069709200dbf',
  balance: '85ba8b92a25782a30212575b8c8eb67ed61ec4db33e6f6e0ae5413c66bf3547a',
  rhythm: '1effe98fbb00b64e6a10f0f42b75230e224a444f5118703302c9af5bd8ff7ead',
  contrast: 'b4ebf240a5b45ecff4986ae654dbcda991a72dcda48d68a5e030e5ccdfa872d6',
  harmony: '0f61a55be12758ed1af89e629f249d3b141340212f9a70784afeba09526e3ef6',
  unity: '69425e99d705d59299c39ba66b651ef82f672fdc98400c43b37e5c2bf501f0b9'
});

function variantHash(question) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ elements: question.elements, guides: question.guides ?? [] }))
    .digest('hex');
}

function constantRandom(value) {
  return () => value;
}

function turns(values) {
  const signs = values.slice(1).map((value, index) => Math.sign(value - values[index])).filter(Boolean);
  return signs.slice(1).filter((sign, index) => sign !== signs[index]).length;
}

test('formal recognize order stays fixed and each principle owns only A B C', () => {
  assert.deepEqual(recognizeQuestions.map(({ principleId }) => principleId), expectedOrder);
  assert.equal(recognizeQuestions.length, 8);
  assert.equal(recognizeTemplateCount, 24);
  expectedOrder.forEach((principleId) => {
    assert.deepEqual(Object.keys(recognizeTemplatePools[principleId]), ['A', 'B', 'C']);
    assert.equal('D' in recognizeTemplatePools[principleId], false);
  });
});

test('all approved Variant A compositions retain original references and exact snapshots', () => {
  recognizeQuestions.forEach((question) => {
    const variantA = template(question.principleId, 'A');
    assert.equal(variantA.elements, question.elements);
    if (question.guides) assert.equal(variantA.guides, question.guides);
    else assert.deepEqual(variantA.guides, []);
    assert.equal(variantHash(variantA), approvedVariantAHashes[question.principleId]);
  });
});

test('every fixed template remains inside the 1000 by 600 composition bounds', () => {
  Object.values(recognizeTemplatePools).flatMap((variants) => Object.values(variants)).forEach((item) => {
    item.elements.forEach((element) => {
      const half = getRotatedHalfExtents(element);
      assert.ok(element.x - half.x >= 0 && element.x + half.x <= 1000, `${item.variantLabel}:${element.id}:x`);
      assert.ok(element.y - half.y >= 0 && element.y + half.y <= 600, `${item.variantLabel}:${element.id}:y`);
    });
  });
});

test('repetition B and C preserve repeated features without adding size or color ramps', () => {
  const b = template('repetition', 'B').elements;
  assert.equal(b.length, 5);
  assert.equal(new Set(b.map(({ shape }) => shape)).size, 1);
  assert.equal(b[0].shape, 'circle');
  assert.equal(new Set(b.map(({ x }) => x)).size, 1);
  assert.deepEqual(new Set(b.map(({ size, hue, lightness, rotation }) => `${size}/${hue}/${lightness}/${rotation}`)).size, 1);
  const c = template('repetition', 'C').elements;
  assert.equal(c.length, 6);
  assert.deepEqual(new Set(c.map(({ shape }) => shape)), new Set(['square']));
  assert.deepEqual(new Set(c.map(({ hue }) => hue)), new Set(['yellow']));
  assert.equal(new Set(c.map(({ size, lightness, rotation }) => `${size}/${lightness}/${rotation}`)).size, 1);
  assert.ok(new Set(c.map(({ x }) => x)).size > 3 && new Set(c.map(({ y }) => y)).size > 3);
});

test('gradation B changes only lightness and C follows adjacent official hues', () => {
  const b = template('gradation', 'B').elements;
  assert.deepEqual(b.map(({ lightness }) => lightness), [1, 2, 3, 4, 5]);
  assert.equal(new Set(b.map(({ shape, size, hue, y }) => `${shape}/${size}/${hue}/${y}`)).size, 1);
  const bGaps = b.slice(1).map((item, index) => item.x - b[index].x);
  assert.equal(new Set(bGaps).size, 1);
  const c = template('gradation', 'C').elements;
  assert.deepEqual(c.map(({ hue }) => hue), ['red', 'red-orange', 'orange', 'yellow-orange', 'yellow']);
  assert.deepEqual(c.slice(1).map((item, index) => HUE_IDS.indexOf(item.hue) - HUE_IDS.indexOf(c[index].hue)), [1, 1, 1, 1]);
  assert.equal(new Set(c.map(({ shape, size, lightness, y }) => `${shape}/${size}/${lightness}/${y}`)).size, 1);
});

test('symmetry B mirrors across a horizontal axis while C mirrors positions with different objects', () => {
  const bVariant = template('symmetry', 'B');
  assert.deepEqual(bVariant.guides, [{ type: 'horizontal-axis', y: 300 }]);
  for (let index = 0; index < bVariant.elements.length; index += 2) {
    const top = bVariant.elements[index];
    const bottom = bVariant.elements[index + 1];
    assert.equal(top.x, bottom.x);
    assert.equal(top.y + bottom.y, 600);
    assert.equal(top.shape, bottom.shape);
    assert.equal(top.size, bottom.size);
    assert.equal(top.hue, bottom.hue);
  }
  const cVariant = template('symmetry', 'C');
  assert.deepEqual(cVariant.guides, [{ type: 'vertical-axis', x: 500 }]);
  for (let index = 0; index < cVariant.elements.length; index += 2) {
    const left = cVariant.elements[index];
    const right = cVariant.elements[index + 1];
    assert.equal(left.x + right.x, 1000);
    assert.equal(left.y, right.y);
    assert.notEqual(left.shape, right.shape);
  }
});

test('balance B and C remain non-mirrored stable fixed compositions', () => {
  for (const variantId of ['B', 'C']) {
    const result = validateBalance({
      elements: template('balance', variantId).elements,
      spec: { symmetryAxis: 500, balanceTolerance: 0.35, disallowMirror: true }
    });
    assert.equal(result.passed, true);
    assert.equal(result.metrics.isMirror, false);
  }
  assert.ok(template('balance', 'B').elements.some(({ size, x }) => size >= 4 && x < 500));
  assert.ok(new Set(template('balance', 'C').elements.map(({ y }) => y)).size > 2);
});

test('rhythm B follows a fixed wave path while C keeps a traceable irregular path', () => {
  const b = template('rhythm', 'B').elements;
  assert.equal(new Set(b.map(({ shape, size, hue, lightness }) => `${shape}/${size}/${hue}/${lightness}`)).size, 1);
  assert.deepEqual(new Set(b.map(({ shape }) => shape)), new Set(['triangle']));
  assert.ok(b.slice(1).every((item, index) => item.x > b[index].x));
  assert.ok(new Set(b.map(({ y }) => y)).size > 4);
  assert.equal(turns(b.map(({ y }) => y)), 1);
  const lowPoint = b.findIndex(({ y }) => y === Math.max(...b.map((item) => item.y)));
  assert.equal(lowPoint, 3);
  assert.ok(b.slice(0, lowPoint).every(({ rotation }) => rotation > 90));
  assert.ok(b.slice(lowPoint + 1).every(({ rotation }) => rotation < 90));
  const c = template('rhythm', 'C').elements;
  assert.ok(c.slice(1).every((item, index) => item.x > c[index].x));
  assert.ok(turns(c.map(({ y }) => y)) >= 2);
  assert.ok(new Set(c.slice(1).map((item, index) => item.x - c[index].x)).size > 1);
  assert.ok(new Set(c.map(({ rotation }) => rotation)).size > 3);
});
test('contrast B isolates size and C isolates two group hues', () => {
  const b = template('contrast', 'B').elements;
  assert.equal(new Set(b.map(({ shape, hue, lightness }) => `${shape}/${hue}/${lightness}`)).size, 1);
  assert.deepEqual([...new Set(b.map(({ size }) => size))].sort(), [2, 5]);
  assert.equal(b.filter(({ size }) => size === 5).length, 1);
  const c = template('contrast', 'C').elements;
  assert.equal(new Set(c.map(({ shape, size, lightness }) => `${shape}/${size}/${lightness}`)).size, 1);
  assert.deepEqual(new Set(c.map(({ hue }) => hue)), new Set(['red', 'blue']));
  assert.equal(c.filter(({ hue }) => hue === 'red').length, 3);
  assert.equal(c.filter(({ hue }) => hue === 'blue').length, 3);
});

test('harmony B uses unordered analogous warm hues and C scatters one hue family lightnesses', () => {
  const b = template('harmony', 'B').elements;
  assert.deepEqual(new Set(b.map(({ hue }) => hue)), new Set(['red', 'red-orange', 'orange']));
  assert.ok(new Set(b.map(({ shape }) => shape)).size > 2);
  const bByX = [...b].sort((a, z) => a.x - z.x).map(({ hue }) => HUE_IDS.indexOf(hue));
  assert.ok(turns(bByX) >= 1);
  const c = template('harmony', 'C').elements;
  assert.deepEqual(new Set(c.map(({ hue }) => hue)), new Set(['blue']));
  assert.ok(new Set(c.map(({ lightness }) => lightness)).size >= 3);
  const cByX = [...c].sort((a, z) => a.x - z.x).map(({ lightness }) => lightness);
  assert.ok(turns(cByX) >= 1);
});

test('unity B shares one shape across colors and C uses arrows with one direction', () => {
  const b = template('unity', 'B').elements;
  assert.equal(b.length, 5);
  assert.deepEqual(new Set(b.map(({ shape }) => shape)), new Set(['circle']));
  assert.equal(new Set(b.map(({ size }) => size)).size, 1);
  assert.ok(new Set(b.map(({ hue }) => hue)).size >= 3);
  assert.equal(new Set(b.map(({ lightness }) => lightness)).size, 1);
  const c = template('unity', 'C').elements;
  assert.equal(c.length, 5);
  assert.deepEqual(new Set(c.map(({ shape }) => shape)), new Set(['arrow']));
  assert.deepEqual(new Set(c.map(({ rotation }) => rotation)), new Set([45]));
  assert.ok(new Set(c.map(({ hue }) => hue)).size >= 3);
  assert.ok(new Set(c.map(({ size }) => size)).size > 1);
});
test('injectable RNG and forced variants create deterministic eight-question sessions', () => {
  const allB = Object.fromEntries(recognizeQuestions.map(({ id }) => [id, 'B']));
  const forced = createRecognizeSession(recognizeQuestions, constantRandom(0), allB);
  assert.deepEqual(new Set(Object.values(forced.variantSelections)), new Set(['B']));
  const low = createRecognizeSession(recognizeQuestions, constantRandom(0));
  const high = createRecognizeSession(recognizeQuestions, constantRandom(0.999999));
  assert.deepEqual(new Set(Object.values(low.variantSelections)), new Set(['A']));
  assert.deepEqual(new Set(Object.values(high.variantSelections)), new Set(['C']));
});

test('question order uses deterministic Fisher-Yates once per recognize session', () => {
  const sourceIds = recognizeQuestions.map(({ id }) => id);
  const session = createRecognizeSession(recognizeQuestions, constantRandom(0));
  assert.equal(session.questionOrder.length, 8);
  assert.deepEqual(new Set(session.questionOrder), new Set(sourceIds));
  assert.notDeepEqual(session.questionOrder, sourceIds);
  assert.deepEqual(session.questionOrder, fisherYates(sourceIds, constantRandom(0)));
});

test('session question order stays stable through render wrong answers and route changes', () => {
  const state = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(state, recognizeQuestions, constantRandom(0));
  const snapshot = state.questionOrder.slice();
  const ordered = getRecognizeSessionQuestions(state, recognizeQuestions);
  getRecognizeSessionQuestion(state, ordered[0]);
  applyRecognizeValidation(state, ordered[0], { isValid: false });
  getRecognizeSessionQuestion(state, ordered[1]);
  assert.deepEqual(state.questionOrder, snapshot);
  assert.deepEqual(getRecognizeSessionQuestions(state, recognizeQuestions).map(({ id }) => id), snapshot);
  assert.equal(firstIncompleteQuestion(state, recognizeQuestions).id, snapshot[0]);
});

test('reset alone creates a new question order and progress follows that order', () => {
  const state = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(state, recognizeQuestions, constantRandom(0));
  const firstOrder = state.questionOrder.slice();
  state.questions[firstOrder[0]].isCorrect = true;
  assert.equal(firstIncompleteQuestion(state, recognizeQuestions).id, firstOrder[1]);
  resetRecognizeCourse(state, recognizeQuestions, constantRandom(0.999999));
  assert.notDeepEqual(state.questionOrder, firstOrder);
  assert.deepEqual(new Set(state.questionOrder), new Set(recognizeQuestions.map(({ id }) => id)));
});
test('Fisher-Yates is deterministic without mutating source and can move every correct answer', () => {
  const input = ['a', 'b', 'c', 'd'];
  assert.deepEqual(fisherYates(input, constantRandom(0)), ['b', 'c', 'd', 'a']);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  const session = createRecognizeSession(recognizeQuestions, constantRandom(0));
  recognizeQuestions.forEach((question) => {
    assert.notEqual(session.optionOrders[question.id][0], question.correctAnswer);
    assert.deepEqual(new Set(session.optionOrders[question.id]), new Set(question.options.map(({ id }) => id)));
  });
  const randomizerSource = source('../recognize-randomizer.js');
  assert.match(randomizerSource, /for \(let index = shuffled\.length - 1/);
  assert.equal(randomizerSource.includes('.sort('), false);
});

test('one session keeps variants and options stable while reset alone creates a new selection', () => {
  const state = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(state, recognizeQuestions, constantRandom(0));
  const firstSnapshot = JSON.stringify({ order: state.questionOrder, variants: state.variantSelections, options: state.optionOrders });
  const firstRender = getRecognizeSessionQuestion(state, recognizeQuestions[0]);
  const secondRender = getRecognizeSessionQuestion(state, recognizeQuestions[0]);
  assert.equal(firstRender.variantId, secondRender.variantId);
  assert.deepEqual(firstRender.options, secondRender.options);
  assert.equal(JSON.stringify({ order: state.questionOrder, variants: state.variantSelections, options: state.optionOrders }), firstSnapshot);
  resetRecognizeCourse(state, recognizeQuestions, constantRandom(0.999999));
  assert.notEqual(JSON.stringify({ order: state.questionOrder, variants: state.variantSelections, options: state.optionOrders }), firstSnapshot);
});

test('renderer reads session-selected data and still validates by answer id', () => {
  const rendererSource = source('../recognize-course.js');
  assert.match(rendererSource, /getRecognizeSessionQuestion\(courseState, question\)/);
  assert.match(rendererSource, /getRecognizeSessionQuestions\(courseState, recognizeQuestions\)/);
  assert.match(rendererSource, /const nextQuestion = orderedQuestions\[requestedIndex \+ 1\]/);
  assert.match(rendererSource, /sessionQuestion\.options\.map/);
  assert.match(rendererSource, /correctOptionId: question\.correctAnswer/);
  assert.equal(rendererSource.includes('correctOptionIndex'), false);
  assert.equal(rendererSource.includes('Math.random'), false);
  assert.match(rendererSource, /recognize-next'\)\?\.focus\(\)/);
});

test('development preview resolves separately and is absent from formal student navigation', () => {
  assert.equal(resolveRoute('#dev/recognize-templates', stages, principles, recognizeQuestions).name, 'recognizeTemplateDev');
  const rendererSource = source('../recognize-course.js');
  const wallSource = source('../renderers.js');
  assert.match(rendererSource, /Development only/);
  assert.match(rendererSource, /\['A', 'B', 'C'\]/);
  assert.equal(wallSource.includes('#dev/recognize-templates'), false);
  assert.equal(rendererSource.includes("navigate('#dev/recognize-templates')"), false);
});

test('first-course completion returns to student home and classroom cache markers are current', () => {
  const rendererSource = source('../recognize-course.js');
  const appSource = source('../app.js');
  const indexSource = source('../index.html');
  assert.match(rendererSource, /#recognize-wall-return'[\s\S]*navigate\('#home'\)/);
  assert.doesNotMatch(rendererSource, /navigate\('#level\/discover\/start'\)/);
  assert.match(appSource, /recognize-course\.js\?v=v2-b2-checkpoints-1/);
  assert.match(indexSource, /app\.js\?v=v2-c2-layout-1/);
  assert.match(indexSource, /classroom-control\.css\?v=classroom-control-1/);
  assert.match(indexSource, /post-final-a\.css\?v=post-final-a-templates/);
  assert.match(appSource, /discover-course\.js\?v=v2-b2-checkpoints-1/);
  assert.match(appSource, /experiment-course\.js\?v=v2-b2-checkpoints-1/);
});
