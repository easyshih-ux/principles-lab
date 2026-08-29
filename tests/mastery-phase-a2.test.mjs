import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscoverMasterySummary,
  buildRecognizeMasterySummary,
  createMasteryPracticeState
} from '../mastery-practice.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { discoverQuestions } from '../discover-questions.js';
import {
  applyRecognizeValidation,
  createRecognizeCourseState,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from '../recognize-course-state.js';

function recognizeMastery(correctCount, answered = 8, questions = recognizeQuestions) {
  const mastery = createMasteryPracticeState().recognize;
  questions.slice(0, answered).forEach((question, index) => {
    mastery.firstAttempts[question.id] = {
      questionId: question.id,
      principleId: question.principleId,
      firstAttemptCorrect: index < correctCount,
      firstAttemptAnswerId: index < correctCount ? question.correctAnswer : '__wrong__',
      initialVariantId: 'A'
    };
  });
  return mastery;
}

function discoverMastery(correctCount, answered = 16, questions = discoverQuestions) {
  const mastery = createMasteryPracticeState().discover;
  questions.slice(0, answered).forEach((question, index) => {
    const correct = index < correctCount;
    mastery.firstAttempts[question.id] = {
      questionId: question.id,
      principleId: question.principleId,
      conceptVariant: question.conceptVariant,
      interactionType: question.interactionType,
      firstAttemptCorrect: correct,
      firstFailureCode: correct ? null : `FAIL_${index}`
    };
  });
  return mastery;
}

for (const [correct, expected] of [[8, 'mastered'], [7, 'targeted'], [6, 'targeted'], [5, 'reinforcement'], [0, 'reinforcement']]) {
  test(`recognize ${correct}/8 maps to ${expected}`, () => {
    const summary = buildRecognizeMasterySummary(recognizeMastery(correct), recognizeQuestions);
    assert.equal(summary.masteryBand, expected);
    assert.equal(summary.answeredQuestions, 8);
    assert.equal(summary.firstAttemptCorrectCount, correct);
    assert.equal(summary.firstAttemptWrongCount, 8 - correct);
  });
}

test('recognize incomplete round has no mastery band and only answered misses', () => {
  const summary = buildRecognizeMasterySummary(recognizeMastery(3, 5), recognizeQuestions);
  assert.equal(summary.masteryBand, null);
  assert.equal(summary.answeredQuestions, 5);
  assert.equal(summary.firstAttemptCorrectCount, 3);
  assert.equal(summary.firstAttemptWrongCount, 2);
  assert.equal(summary.missedQuestionIds.length, 2);
});

test('recognize missed principles are unique', () => {
  const questions = recognizeQuestions.map((question, index) => index === 1 ? { ...question, principleId: recognizeQuestions[0].principleId } : question);
  const summary = buildRecognizeMasterySummary(recognizeMastery(0, 8, questions), questions);
  assert.equal(summary.missedPrincipleIds.filter((id) => id === questions[0].principleId).length, 1);
});

test('later formal success cannot change recognize summary based on first attempt', () => {
  const mastery = createMasteryPracticeState();
  const course = createRecognizeCourseState(recognizeQuestions);
  const question = recognizeQuestions[0];
  resetRecognizeCourse(course, recognizeQuestions, () => 0, { [question.id]: 'B' }, mastery.recognize);
  selectRecognizeAnswer(course, question.id, '__wrong__');
  applyRecognizeValidation(course, question, { isValid: false }, mastery.recognize);
  const before = buildRecognizeMasterySummary(mastery.recognize, recognizeQuestions);
  selectRecognizeAnswer(course, question.id, question.correctAnswer);
  applyRecognizeValidation(course, question, { isValid: true }, mastery.recognize);
  const after = buildRecognizeMasterySummary(mastery.recognize, recognizeQuestions);
  assert.deepEqual(after, before);
  assert.equal(after.firstAttemptWrongCount, 1);
});

for (const [correct, expected] of [[16, 'mastered'], [15, 'mastered'], [14, 'targeted'], [12, 'targeted'], [11, 'reinforcement'], [0, 'reinforcement']]) {
  test(`discover ${correct}/16 maps to ${expected}`, () => {
    const summary = buildDiscoverMasterySummary(discoverMastery(correct), discoverQuestions);
    assert.equal(summary.masteryBand, expected);
    assert.equal(summary.answeredQuestions, 16);
    assert.equal(summary.firstAttemptCorrectCount, correct);
    assert.equal(summary.firstAttemptWrongCount, 16 - correct);
  });
}

test('discover incomplete round has no mastery band', () => {
  const summary = buildDiscoverMasterySummary(discoverMastery(7, 10), discoverQuestions);
  assert.equal(summary.masteryBand, null);
  assert.equal(summary.answeredQuestions, 10);
  assert.equal(summary.firstAttemptWrongCount, 3);
});

test('discover summary preserves first failure codes and unique principle ids', () => {
  const summary = buildDiscoverMasterySummary(discoverMastery(0), discoverQuestions);
  assert.equal(summary.firstFailureCodes[discoverQuestions[0].id], 'FAIL_0');
  assert.equal(summary.missedPrincipleIds.length, new Set(discoverQuestions.map(({ principleId }) => principleId)).size);
});

test('missed concept variants preserve principle plus concept semantics', () => {
  const questions = [
    { id: 'one', principleId: 'alpha', conceptVariant: 'shared', interactionType: 'choice' },
    { id: 'two', principleId: 'beta', conceptVariant: 'shared', interactionType: 'choice' }
  ];
  const mastery = discoverMastery(0, 2, questions);
  const summary = buildDiscoverMasterySummary(mastery, questions);
  assert.deepEqual(summary.missedConceptVariants, [
    { principleId: 'alpha', conceptVariant: 'shared' },
    { principleId: 'beta', conceptVariant: 'shared' }
  ]);
});

test('missed synthesis remains synthesis and exposes only the explicit pairing targets', () => {
  const synthesis = discoverQuestions.find(({ principleId }) => principleId === 'synthesis');
  const mastery = createMasteryPracticeState().discover;
  mastery.firstAttempts[synthesis.id] = {
    questionId: synthesis.id,
    principleId: 'synthesis',
    conceptVariant: synthesis.conceptVariant,
    interactionType: synthesis.interactionType,
    firstAttemptCorrect: false,
    firstFailureCode: 'PAIRING_INCORRECT'
  };
  const summary = buildDiscoverMasterySummary(mastery, discoverQuestions);
  assert.deepEqual(summary.missedPrincipleIds, ['synthesis']);
  assert.deepEqual(summary.relatedPrincipleIds, ['harmony', 'unity']);
});
