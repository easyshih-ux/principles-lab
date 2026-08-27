import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyRecognizeValidation,
  completeRecognizeCourse,
  createRecognizeCourseState,
  firstIncompleteQuestion,
  getRecognizeSessionQuestions,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from '../recognize-course-state.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { principles, stages } from '../data.js';
import { resolveRoute } from '../router.js';
import { assertGeometryElement } from '../geometry/model.js';
import { getShapeDimensions } from '../geometry/bounds.js';
import {
  validateBalance,
  validateRhythm,
  validateUnity
} from '../experiment-validators.js';

const expectedOrder = ['repetition', 'gradation', 'symmetry', 'balance', 'rhythm', 'contrast', 'harmony', 'unity'];

test('the formal first level contains exactly eight questions', () => {
  assert.equal(recognizeQuestions.length, 8);
});

test('question order follows the confirmed teaching sequence', () => {
  assert.deepEqual(recognizeQuestions.map((question) => question.principleId), expectedOrder);
});

test('every correctAnswer matches its formal principle', () => {
  recognizeQuestions.forEach((question) => assert.equal(question.correctAnswer, question.principleId));
});

test('every question has at least one plausible distractor', () => {
  recognizeQuestions.forEach((question) => {
    assert.ok(question.options.some((option) => option.id !== question.correctAnswer));
  });
});

test('every correctAnswer exists in options', () => {
  recognizeQuestions.forEach((question) => {
    assert.ok(question.options.some((option) => option.id === question.correctAnswer));
  });
});

test('every distractor has targeted wrong feedback', () => {
  recognizeQuestions.forEach((question) => {
    question.options.filter((option) => option.id !== question.correctAnswer).forEach((option) => {
      assert.equal(typeof question.wrongFeedback[option.id], 'string');
      assert.ok(question.wrongFeedback[option.id].length > 0);
    });
  });
});

test('every question has success feedback and clean geometry state', () => {
  recognizeQuestions.forEach((question) => {
    assert.equal(typeof question.successFeedback, 'string');
    assert.ok(question.successFeedback.length > 0);
    question.elements.forEach(assertGeometryElement);
  });
});

test('the eight compositions collectively use all six supported shapes', () => {
  const usedShapes = new Set(recognizeQuestions.flatMap((question) => question.elements.map((element) => element.shape)));
  ['circle', 'square', 'triangle', 'rectangle', 'semicircle', 'line'].forEach((shape) => {
    assert.equal(usedShapes.has(shape), true);
  });
});

test('proportion is not an independent first-level question', () => {
  assert.equal(recognizeQuestions.some((question) => question.principleId === 'proportion'), false);
});

test('simplicity is not an independent first-level question', () => {
  assert.equal(recognizeQuestions.some((question) => question.principleId === 'simplicity'), false);
});

test('question eight is the unity synthesis question', () => {
  const question = recognizeQuestions[7];
  assert.equal(question.principleId, 'unity');
  assert.deepEqual(question.secondaryPrinciples, ['repetition', 'contrast']);
  assert.match(question.prompt, /不只一種原理/);
});

test('a wrong answer does not mark the question or course complete', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  const question = recognizeQuestions[0];
  selectRecognizeAnswer(course, question.id, 'gradation');
  applyRecognizeValidation(course, question, { isValid: false });
  assert.equal(course.questions[question.id].isCorrect, false);
  assert.equal(course.completed, false);
});

test('students can replace a wrong answer and answer correctly', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  const question = recognizeQuestions[0];
  selectRecognizeAnswer(course, question.id, 'gradation');
  applyRecognizeValidation(course, question, { isValid: false });
  selectRecognizeAnswer(course, question.id, question.correctAnswer);
  applyRecognizeValidation(course, question, { isValid: true });
  assert.equal(course.questions[question.id].selectedAnswer, question.correctAnswer);
  assert.equal(course.questions[question.id].isCorrect, true);
});

test('a question may give more explicit feedback after a second wrong attempt', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  const question = recognizeQuestions.find(({ principleId }) => principleId === 'harmony');
  selectRecognizeAnswer(course, question.id, 'unity');
  applyRecognizeValidation(course, question, { isValid: false });
  assert.equal(course.questions[question.id].feedback, question.wrongFeedback.unity);
  applyRecognizeValidation(course, question, { isValid: false });
  assert.equal(course.questions[question.id].feedback, question.wrongFeedbackSecond.unity);
});

test('only a correct validation makes the next question available', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  const [firstQuestion, secondQuestion] = getRecognizeSessionQuestions(course, recognizeQuestions);
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, firstQuestion.id);
  applyRecognizeValidation(course, firstQuestion, { isValid: false });
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, firstQuestion.id);
  applyRecognizeValidation(course, firstQuestion, { isValid: true });
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, secondQuestion.id);
});

test('answer validation does not automatically change route or complete the course', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  const [firstQuestion, secondQuestion] = getRecognizeSessionQuestions(course, recognizeQuestions);
  applyRecognizeValidation(course, firstQuestion, { isValid: true });
  assert.equal(course.completed, false);
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, secondQuestion.id);
});

test('the completion state is available only after all eight correct answers', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  recognizeQuestions.slice(0, 7).forEach((question) => applyRecognizeValidation(course, question, { isValid: true }));
  assert.equal(completeRecognizeCourse(course, recognizeQuestions), false);
  applyRecognizeValidation(course, recognizeQuestions[7], { isValid: true });
  assert.equal(completeRecognizeCourse(course, recognizeQuestions), true);
});

test('recognize routes are data-driven and the formal second-level route is available', () => {
  assert.equal(resolveRoute('#level/recognize/start', stages, principles, recognizeQuestions).name, 'recognizeStart');
  assert.equal(resolveRoute(`#level/recognize/${recognizeQuestions[0].id}`, stages, principles, recognizeQuestions).question.id, recognizeQuestions[0].id);
  assert.equal(resolveRoute('#level/recognize/complete', stages, principles, recognizeQuestions).name, 'recognizeComplete');
  assert.equal(resolveRoute('#level/discover/start', stages, principles, recognizeQuestions).name, 'discoverStart');
});

test('balance, rhythm and unity compositions satisfy their development metrics', () => {
  const byPrinciple = Object.fromEntries(recognizeQuestions.map((question) => [question.principleId, question]));
  const balance = validateBalance({ elements: byPrinciple.balance.elements, spec: { symmetryAxis: 500, balanceTolerance: 0.25 } });
  const rhythm = validateRhythm({ elements: byPrinciple.rhythm.elements, spec: { minimumElements: 5, minimumTurns: 2, minimumYRange: 100 } });
  const unity = validateUnity({ elements: byPrinciple.unity.elements, spec: { unityMode: 'color', targetHue: 'yellow', minimumShapes: 3, requiredUnityRatio: 1 } });
  assert.equal(balance.passed, true);
  assert.equal(balance.metrics.isMirror, false);
  assert.equal(rhythm.passed, true);
  assert.equal(unity.passed, true);
});

test('balance composition is one large circle against three identical squares in one color', () => {
  const question = recognizeQuestions.find(({ principleId }) => principleId === 'balance');
  const [circle, ...squares] = question.elements;
  assert.equal(circle.shape, 'circle');
  assert.equal(circle.size, 5);
  assert.equal(circle.x < 500, true);
  assert.equal(squares.length, 3);
  assert.equal(squares.every(({ shape, size, hue, lightness, x }) => (
    shape === 'square' && size === 2 && hue === circle.hue && lightness === circle.lightness && x > 500
  )), true);
  assert.deepEqual(squares.map(({ y }) => y), [180, 300, 420]);
});

test('gradation composition changes only size across equal edge gaps and a shared baseline', () => {
  const question = recognizeQuestions.find(({ principleId }) => principleId === 'gradation');
  assert.deepEqual(question.elements.map(({ size }) => size), [5, 4, 3, 2, 1]);
  assert.equal(new Set(question.elements.map(({ shape }) => shape)).size, 1);
  assert.equal(new Set(question.elements.map(({ hue }) => hue)).size, 1);
  assert.equal(new Set(question.elements.map(({ lightness }) => lightness)).size, 1);
  const boxes = question.elements.map((element) => {
    const dimensions = getShapeDimensions(element);
    return {
      left: element.x - dimensions.width / 2,
      right: element.x + dimensions.width / 2,
      bottom: element.y + dimensions.height / 2
    };
  });
  const edgeGaps = boxes.slice(1).map((box, index) => box.left - boxes[index].right);
  assert.deepEqual(edgeGaps, [50, 50, 50, 50]);
  assert.equal(new Set(boxes.map(({ bottom }) => bottom)).size, 1);
});

test('harmony composition uses unordered adjacent colors without a size or lightness ramp', () => {
  const question = recognizeQuestions.find(({ principleId }) => principleId === 'harmony');
  assert.deepEqual(new Set(question.elements.map(({ shape }) => shape)), new Set(['circle', 'square', 'triangle', 'rectangle']));
  assert.equal(new Set(question.elements.map(({ size }) => size)).size, 1);
  assert.equal(new Set(question.elements.map(({ lightness }) => lightness)).size, 1);
  assert.deepEqual(new Set(question.elements.map(({ displayColor }) => displayColor)), new Set(['#3E78B2', '#3E8F91', '#4F9D78']));
  const leftToRight = [...question.elements].sort((a, b) => a.x - b.x).map(({ displayColor }) => displayColor);
  assert.deepEqual(leftToRight, ['#3E78B2', '#3E8F91', '#4F9D78', '#3E78B2']);
});

test('contrast composition is one distinct element in an otherwise consistent group', () => {
  const question = recognizeQuestions.find(({ principleId }) => principleId === 'contrast');
  const distinct = question.elements.filter(({ shape, hue }) => shape === 'triangle' && hue === 'red');
  const group = question.elements.filter(({ shape, hue }) => shape === 'circle' && hue === 'blue');
  assert.equal(question.elements.length, 9);
  assert.equal(distinct.length, 1);
  assert.equal(group.length, 8);
  assert.equal(new Set(question.elements.map(({ size }) => size)).size, 1);
  assert.equal(new Set(question.elements.map(({ x }) => x)).size, 3);
  assert.equal(new Set(question.elements.map(({ y }) => y)).size, 3);
});
