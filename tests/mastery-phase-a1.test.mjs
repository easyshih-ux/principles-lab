import test from 'node:test';
import assert from 'node:assert/strict';

import { createMasteryPracticeState } from '../mastery-practice.js';
import {
  applyRecognizeValidation,
  createRecognizeCourseState,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from '../recognize-course-state.js';
import { recognizeQuestions } from '../recognize-questions.js';
import {
  applyDiscoverResult,
  createDiscoverCourseState,
  setDiscoverSelection,
  startDiscoverCourse
} from '../discover-course-state.js';
import { discoverQuestions } from '../discover-questions.js';
import { createAppState } from '../state.js';

test('app state owns an isolated empty Mastery Practice namespace', () => {
  const state = createAppState([], recognizeQuestions, discoverQuestions);
  assert.deepEqual(state.masteryPractice, {
    recognize: { firstAttempts: {} },
    discover: { firstAttempts: {} }
  });
});

test('recognize first correct submit records its answer and approved initial variant once', () => {
  const mastery = createMasteryPracticeState();
  const course = createRecognizeCourseState(recognizeQuestions);
  const question = recognizeQuestions[0];
  resetRecognizeCourse(course, recognizeQuestions, () => 0, { [question.id]: 'B' }, mastery.recognize);
  selectRecognizeAnswer(course, question.id, question.correctAnswer);
  applyRecognizeValidation(course, question, { isValid: true }, mastery.recognize);
  assert.deepEqual(mastery.recognize.firstAttempts[question.id], {
    questionId: question.id,
    principleId: question.principleId,
    firstAttemptCorrect: true,
    firstAttemptAnswerId: question.correctAnswer,
    initialVariantId: 'B'
  });
});

test('recognize first wrong submit remains false after a later correct submit', () => {
  const mastery = createMasteryPracticeState();
  const course = createRecognizeCourseState(recognizeQuestions);
  const question = recognizeQuestions[1];
  resetRecognizeCourse(course, recognizeQuestions, () => 0, { [question.id]: 'C' }, mastery.recognize);
  const wrongAnswer = question.options.find(({ id }) => id !== question.correctAnswer).id;
  selectRecognizeAnswer(course, question.id, wrongAnswer);
  applyRecognizeValidation(course, question, { isValid: false }, mastery.recognize);
  selectRecognizeAnswer(course, question.id, question.correctAnswer);
  applyRecognizeValidation(course, question, { isValid: true }, mastery.recognize);
  assert.deepEqual(mastery.recognize.firstAttempts[question.id], {
    questionId: question.id,
    principleId: question.principleId,
    firstAttemptCorrect: false,
    firstAttemptAnswerId: wrongAnswer,
    initialVariantId: 'C'
  });
});

test('discover first correct validation records null failure code once', () => {
  const mastery = createMasteryPracticeState();
  const course = createDiscoverCourseState(discoverQuestions);
  const question = discoverQuestions[0];
  startDiscoverCourse(course, discoverQuestions, 17, mastery.discover);
  setDiscoverSelection(course, question.id, question.correctAnswer);
  applyDiscoverResult(course, question, { isValid: true, code: 'success' }, mastery.discover);
  assert.deepEqual(mastery.discover.firstAttempts[question.id], {
    questionId: question.id,
    principleId: question.principleId,
    conceptVariant: question.conceptVariant,
    interactionType: question.interactionType,
    firstAttemptCorrect: true,
    firstFailureCode: null,
    initialGeneratedInstanceId: `discover:17:${question.id}`
  });
});

test('discover first failure diagnostic survives later success', () => {
  const mastery = createMasteryPracticeState();
  const course = createDiscoverCourseState(discoverQuestions);
  const question = discoverQuestions[1];
  startDiscoverCourse(course, discoverQuestions, 29, mastery.discover);
  setDiscoverSelection(course, question.id, '__wrong__');
  applyDiscoverResult(course, question, { isValid: false, code: 'WRONG_GROUP' }, mastery.discover);
  setDiscoverSelection(course, question.id, question.correctAnswer);
  applyDiscoverResult(course, question, { isValid: true, code: 'success' }, mastery.discover);
  assert.equal(mastery.discover.firstAttempts[question.id].firstAttemptCorrect, false);
  assert.equal(mastery.discover.firstAttempts[question.id].firstFailureCode, 'WRONG_GROUP');
});

test('discover synthesis snapshot keeps synthesis as its principle without reclassification', () => {
  const mastery = createMasteryPracticeState();
  const course = createDiscoverCourseState(discoverQuestions);
  const question = discoverQuestions.find(({ principleId }) => principleId === 'synthesis');
  startDiscoverCourse(course, discoverQuestions, 41, mastery.discover);
  setDiscoverSelection(course, question.id, { a: 'harmony', b: 'unity' });
  applyDiscoverResult(course, question, { isValid: false, code: 'PAIRING_INCORRECT' }, mastery.discover);
  const snapshot = mastery.discover.firstAttempts[question.id];
  assert.equal(snapshot.principleId, 'synthesis');
  assert.equal('relatedPrincipleIds' in snapshot, false);
});
