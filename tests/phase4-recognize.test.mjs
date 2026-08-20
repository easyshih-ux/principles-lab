import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyRecognizeValidation,
  completeRecognizeCourse,
  createRecognizeCourseState,
  firstIncompleteQuestion,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from '../recognize-course-state.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { principles, stages } from '../data.js';
import { resolveRoute } from '../router.js';
import { assertGeometryElement } from '../geometry/model.js';
import {
  validateBalance,
  validateHarmony,
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

test('only a correct validation makes the next question available', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, recognizeQuestions[0].id);
  applyRecognizeValidation(course, recognizeQuestions[0], { isValid: false });
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, recognizeQuestions[0].id);
  applyRecognizeValidation(course, recognizeQuestions[0], { isValid: true });
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, recognizeQuestions[1].id);
});

test('answer validation does not automatically change route or complete the course', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  applyRecognizeValidation(course, recognizeQuestions[0], { isValid: true });
  assert.equal(course.completed, false);
  assert.equal(firstIncompleteQuestion(course, recognizeQuestions).id, recognizeQuestions[1].id);
});

test('the completion state is available only after all eight correct answers', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions);
  recognizeQuestions.slice(0, 7).forEach((question) => applyRecognizeValidation(course, question, { isValid: true }));
  assert.equal(completeRecognizeCourse(course, recognizeQuestions), false);
  applyRecognizeValidation(course, recognizeQuestions[7], { isValid: true });
  assert.equal(completeRecognizeCourse(course, recognizeQuestions), true);
});

test('recognize routes are data-driven and unfinished second-level route falls back safely', () => {
  assert.equal(resolveRoute('#level/recognize/start', stages, principles, recognizeQuestions).name, 'recognizeStart');
  assert.equal(resolveRoute(`#level/recognize/${recognizeQuestions[0].id}`, stages, principles, recognizeQuestions).question.id, recognizeQuestions[0].id);
  assert.equal(resolveRoute('#level/recognize/complete', stages, principles, recognizeQuestions).name, 'recognizeComplete');
  assert.equal(resolveRoute('#level/discover/start', stages, principles, recognizeQuestions).name, 'home');
});

test('the most ambiguous compositions satisfy their development metrics', () => {
  const byPrinciple = Object.fromEntries(recognizeQuestions.map((question) => [question.principleId, question]));
  const balance = validateBalance({ elements: byPrinciple.balance.elements, spec: { symmetryAxis: 500, balanceTolerance: 0.25 } });
  const rhythm = validateRhythm({ elements: byPrinciple.rhythm.elements, spec: { minimumElements: 5, minimumTurns: 2, minimumYRange: 100 } });
  const harmony = validateHarmony({ elements: byPrinciple.harmony.elements, spec: { minimumShapes: 3, minimumLightnessLevels: 3 } });
  const unity = validateUnity({ elements: byPrinciple.unity.elements, spec: { unityMode: 'color', targetHue: 'yellow', minimumShapes: 3, requiredUnityRatio: 1 } });
  assert.equal(balance.passed, true);
  assert.equal(balance.metrics.isMirror, false);
  assert.equal(rhythm.passed, true);
  assert.equal(harmony.passed, true);
  assert.equal(unity.passed, true);
});
