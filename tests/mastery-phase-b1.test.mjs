import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  advanceRecognizeMasteryRound,
  applyRecognizeMasteryResult,
  beginRecognizeMasteryRound,
  createMasteryPracticeState,
  getCurrentRecognizeMasteryItem,
  prepareRecognizeMasteryRound,
  selectRecognizeMasteryAnswer
} from '../mastery-practice.js';
import {
  areRecognizeQuestionsComplete,
  createRecognizeCourseState,
  resetRecognizeCourse
} from '../recognize-course-state.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { recognizeTemplatePools } from '../recognize-template-pool.js';

const source = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

function masteryWithCorrectCount(correctCount) {
  const mastery = createMasteryPracticeState().recognize;
  recognizeQuestions.forEach((question, index) => {
    mastery.firstAttempts[question.id] = {
      questionId: question.id,
      principleId: question.principleId,
      firstAttemptCorrect: index < correctCount,
      firstAttemptAnswerId: index < correctCount ? question.correctAnswer : '__wrong__',
      initialVariantId: ['A', 'B', 'C'][index % 3]
    };
  });
  return mastery;
}

test('mastered recognize round keeps queue empty and uses the original completion branch', () => {
  const mastery = masteryWithCorrectCount(8);
  const prepared = prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 1 });
  assert.equal(prepared.summary.masteryBand, 'mastered');
  assert.equal(prepared.activeRound, null);
  assert.match(source('../recognize-course.js'), /summary\.masteryBand === 'mastered'[\s\S]*recognizeCompletionMarkup/);
});

test('targeted 7 of 8 prepares one unseen approved item for the missed principle', () => {
  const mastery = masteryWithCorrectCount(7);
  const { summary, activeRound } = prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 4 });
  assert.equal(summary.masteryBand, 'targeted');
  assert.equal(activeRound.queue.length, 1);
  const item = activeRound.queue[0];
  assert.equal(item.principleId, summary.missedPrincipleIds[0]);
  assert.notEqual(item.variantId, mastery.firstAttempts[item.sourceQuestionId].initialVariantId);
  assert.ok(recognizeTemplatePools[item.principleId][item.variantId]);
});

test('reinforcement 5 of 8 prepares at most six items and the reinforcement transition', () => {
  const mastery = masteryWithCorrectCount(5);
  const { summary, activeRound } = prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 3 });
  assert.equal(summary.masteryBand, 'reinforcement');
  assert.ok(activeRound.queue.length <= 6);
  assert.match(source('../recognize-course.js'), /再練一小組/);
  assert.match(source('../recognize-course.js'), /開始補強/);
});

test('Round 1 responses use approved templates and preserve required state fields', () => {
  const mastery = masteryWithCorrectCount(7);
  prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 2 });
  beginRecognizeMasteryRound(mastery);
  const { item, response } = getCurrentRecognizeMasteryItem(mastery);
  assert.ok(recognizeTemplatePools[item.principleId][item.variantId]);
  assert.deepEqual(Object.keys(response).sort(), [
    'attempts', 'completed', 'feedback', 'principleId', 'questionId', 'selectedAnswer', 'variantId'
  ]);
  assert.match(source('../recognize-course.js'), /recognizeCompositionMarkup\(sessionQuestion/);
  assert.match(source('../recognize-course.js'), /selected-option-equals/);
});

test('wrong Round 1 answer stays on the current item', () => {
  const mastery = masteryWithCorrectCount(7);
  prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 2 });
  beginRecognizeMasteryRound(mastery);
  selectRecognizeMasteryAnswer(mastery, '__wrong__');
  assert.equal(applyRecognizeMasteryResult(mastery, recognizeQuestions[7], false), false);
  assert.equal(advanceRecognizeMasteryRound(mastery), false);
  assert.equal(mastery.activeRound.currentIndex, 0);
  assert.equal(getCurrentRecognizeMasteryItem(mastery).response.attempts, 1);
});

test('correct Round 1 answer advances and the final item completes the round', () => {
  const mastery = masteryWithCorrectCount(6);
  prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 5 });
  beginRecognizeMasteryRound(mastery);
  while (!mastery.activeRound.completed) {
    const current = getCurrentRecognizeMasteryItem(mastery);
    const question = recognizeQuestions.find(({ id }) => id === current.item.sourceQuestionId);
    selectRecognizeMasteryAnswer(mastery, question.correctAnswer);
    assert.equal(applyRecognizeMasteryResult(mastery, question, true), true);
    assert.equal(advanceRecognizeMasteryRound(mastery), true);
  }
  assert.equal(mastery.activeRound.completed, true);
  assert.match(source('../recognize-course.js'), /補強完成！/);
});

test('formal completion stays false while remediation is required', () => {
  const course = createRecognizeCourseState(recognizeQuestions);
  recognizeQuestions.forEach((question) => { course.questions[question.id].isCorrect = true; });
  const mastery = masteryWithCorrectCount(7);
  prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 1 });
  assert.equal(areRecognizeQuestionsComplete(course, recognizeQuestions), true);
  assert.equal(course.completed, false);
  const renderer = source('../recognize-course.js');
  assert.match(renderer, /activeRound\.completed[\s\S]*renderMasteryComplete/);
  assert.match(renderer, /renderMasteryComplete\(\)[\s\S]*completeRecognizeCourse/);
});

test('Round 1 does not mutate first attempts or formal session selections', () => {
  const mastery = masteryWithCorrectCount(7);
  const firstAttempts = JSON.stringify(mastery.firstAttempts);
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions, () => 0, {}, null);
  const formalSession = JSON.stringify({
    questionOrder: course.questionOrder,
    variantSelections: course.variantSelections,
    optionOrders: course.optionOrders
  });
  prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 8 });
  beginRecognizeMasteryRound(mastery);
  selectRecognizeMasteryAnswer(mastery, '__wrong__');
  applyRecognizeMasteryResult(mastery, recognizeQuestions[7], false);
  assert.equal(JSON.stringify(mastery.firstAttempts), firstAttempts);
  assert.equal(JSON.stringify({
    questionOrder: course.questionOrder,
    variantSelections: course.variantSelections,
    optionOrders: course.optionOrders
  }), formalSession);
});

test('rerender preparation retains queue current index and responses in one app state', () => {
  const mastery = masteryWithCorrectCount(6);
  const first = prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 4 });
  beginRecognizeMasteryRound(mastery);
  const current = getCurrentRecognizeMasteryItem(mastery);
  const question = recognizeQuestions.find(({ id }) => id === current.item.sourceQuestionId);
  selectRecognizeMasteryAnswer(mastery, question.correctAnswer);
  applyRecognizeMasteryResult(mastery, question, true);
  advanceRecognizeMasteryRound(mastery);
  const snapshot = JSON.stringify(mastery.activeRound);
  const second = prepareRecognizeMasteryRound(mastery, recognizeQuestions, { seed: 99 });
  assert.equal(second.activeRound, first.activeRound);
  assert.equal(JSON.stringify(mastery.activeRound), snapshot);
});

test('starting a new formal recognize session clears summary and active round only', () => {
  const masteryRoot = createMasteryPracticeState();
  Object.assign(masteryRoot.recognize, masteryWithCorrectCount(7));
  prepareRecognizeMasteryRound(masteryRoot.recognize, recognizeQuestions, { seed: 2 });
  const course = createRecognizeCourseState(recognizeQuestions);
  resetRecognizeCourse(course, recognizeQuestions, () => 0, {}, masteryRoot.recognize);
  assert.deepEqual(masteryRoot.recognize, { firstAttempts: {} });
  assert.deepEqual(masteryRoot.discover, { firstAttempts: {} });
});

test('student copy never exposes internal mastery band labels or scores', () => {
  const renderer = source('../recognize-course.js');
  assert.equal(renderer.includes('>${summary.masteryBand}<'), false);
  assert.equal(renderer.includes('補考'), false);
  assert.equal(renderer.includes('未達標'), false);
  assert.match(renderer, /再確認一下/);
  assert.match(renderer, /再練一小組/);
});
