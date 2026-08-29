import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  advanceDiscoverMasteryRound,
  applyDiscoverMasteryResult,
  beginDiscoverMasteryRound,
  createMasteryPracticeState,
  getCurrentDiscoverMasteryItem,
  prepareDiscoverMasteryRound,
  prepareRecognizeMasteryRound,
  selectDiscoverMasteryAnswer
} from '../mastery-practice.js';
import {
  areDiscoverQuestionsComplete,
  createDiscoverCourseState,
  startDiscoverCourse
} from '../discover-course-state.js';
import { discoverQuestions } from '../discover-questions.js';
import { validateDiscoverQuestion } from '../discover-validators.js';
import { recognizeQuestions } from '../recognize-questions.js';

const source = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

function discoverMastery(correctCount) {
  const mastery = createMasteryPracticeState().discover;
  discoverQuestions.forEach((question, index) => {
    const correct = index < correctCount;
    mastery.firstAttempts[question.id] = {
      questionId: question.id,
      principleId: question.principleId,
      conceptVariant: question.conceptVariant,
      interactionType: question.interactionType,
      firstAttemptCorrect: correct,
      firstFailureCode: correct ? null : `FAIL_${question.id}`,
      initialGeneratedInstanceId: `discover:initial:${question.id}`
    };
  });
  return mastery;
}

function recognizeMastery(correctCount) {
  const mastery = createMasteryPracticeState().recognize;
  recognizeQuestions.forEach((question, index) => {
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

for (const correct of [16, 15]) {
  test(`discover ${correct}/16 mastered skips remediation and keeps original completion`, () => {
    const prepared = prepareDiscoverMasteryRound(discoverMastery(correct), discoverQuestions, { seed: 1 });
    assert.equal(prepared.summary.masteryBand, 'mastered');
    assert.equal(prepared.activeRound, null);
    assert.match(source('../discover-course.js'), /summary\.masteryBand === 'mastered'[\s\S]*discoverCompletionMarkup/);
  });
}

test('targeted 14 of 16 shows transition and queues only missed concepts', () => {
  const mastery = discoverMastery(14);
  const { summary, activeRound } = prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 7 });
  const missed = new Set(summary.missedQuestionIds);
  assert.equal(summary.masteryBand, 'targeted');
  assert.equal(activeRound.queue.length, 2);
  assert.ok(activeRound.queue.every(({ sourceQuestionId }) => missed.has(sourceQuestionId)));
  assert.match(source('../discover-course.js'), /有幾個判斷還不太確定/);
  assert.match(source('../discover-course.js'), /開始補強/);
});

test('each descriptor generates a stable new remediation instance', () => {
  const mastery = discoverMastery(14);
  const first = prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 9 }).activeRound;
  const snapshot = JSON.stringify(first.generatedInstances);
  assert.ok(Object.values(first.generatedInstances).every(({ masteryInstanceId }) => masteryInstanceId?.startsWith('mastery:')));
  assert.equal(JSON.stringify(prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 99 }).activeRound.generatedInstances), snapshot);
  const formal = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(formal, discoverQuestions, 9);
  first.queue.forEach((item, index) => {
    const key = `${index}:${item.sourceQuestionId}:${item.masterySeed}`;
    assert.notDeepEqual(first.generatedInstances[key], formal.generatedQuestions[item.sourceQuestionId]);
  });
});

test('reinforcement 11 of 16 prepares at most eight principle-aware items', () => {
  const { summary, activeRound } = prepareDiscoverMasteryRound(discoverMastery(11), discoverQuestions, { seed: 6 });
  assert.equal(summary.masteryBand, 'reinforcement');
  assert.ok(activeRound.queue.length <= 8);
  assert.equal(new Set(activeRound.queue.slice(0, 5).map(({ principleId }) => principleId)).size, 5);
  assert.match(source('../discover-course.js'), /再做幾題，確認你真的能找出形式原理的線索/);
});

test('Round 1 response keeps only remediation attempts and diagnostic feedback', () => {
  const mastery = discoverMastery(14);
  prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 4 });
  beginDiscoverMasteryRound(mastery);
  const current = getCurrentDiscoverMasteryItem(mastery);
  assert.deepEqual(Object.keys(current.response).sort(), [
    'attempts', 'completed', 'conceptVariant', 'feedback', 'lastFeedbackCode', 'masterySeed',
    'principleId', 'selection', 'sourceQuestionId'
  ]);
  selectDiscoverMasteryAnswer(mastery, '__wrong__');
  const result = validateDiscoverQuestion(current.question, current.response.selection);
  assert.equal(applyDiscoverMasteryResult(mastery, result), false);
  assert.equal(current.response.attempts, 1);
  assert.equal(current.response.lastFeedbackCode, result.code);
  assert.equal(advanceDiscoverMasteryRound(mastery), false);
});

test('correct remediation answers alone advance and complete Round 1', () => {
  const mastery = discoverMastery(14);
  prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 3 });
  beginDiscoverMasteryRound(mastery);
  while (!mastery.activeRound.completed) {
    const current = getCurrentDiscoverMasteryItem(mastery);
    selectDiscoverMasteryAnswer(mastery, current.question.correctAnswer);
    assert.equal(applyDiscoverMasteryResult(mastery, validateDiscoverQuestion(current.question, current.response.selection)), true);
    assert.equal(advanceDiscoverMasteryRound(mastery), true);
  }
  assert.match(source('../discover-course.js'), /補強完成！/);
});

test('Round 1 does not mutate A1 failures or formal generated state and order', () => {
  const mastery = discoverMastery(14);
  const firstAttempts = JSON.stringify(mastery.firstAttempts);
  const formal = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(formal, discoverQuestions, 55);
  const formalSnapshot = JSON.stringify({ order: formal.questionOrder, generated: formal.generatedQuestions });
  prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 2 });
  beginDiscoverMasteryRound(mastery);
  const current = getCurrentDiscoverMasteryItem(mastery);
  selectDiscoverMasteryAnswer(mastery, '__wrong__');
  applyDiscoverMasteryResult(mastery, validateDiscoverQuestion(current.question, current.response.selection));
  assert.equal(JSON.stringify(mastery.firstAttempts), firstAttempts);
  assert.equal(JSON.stringify({ order: formal.questionOrder, generated: formal.generatedQuestions }), formalSnapshot);
});

test('same app state rerender retains queue instances index and responses', () => {
  const mastery = discoverMastery(14);
  const first = prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 5 });
  beginDiscoverMasteryRound(mastery);
  const current = getCurrentDiscoverMasteryItem(mastery);
  selectDiscoverMasteryAnswer(mastery, current.question.correctAnswer);
  applyDiscoverMasteryResult(mastery, validateDiscoverQuestion(current.question, current.response.selection));
  advanceDiscoverMasteryRound(mastery);
  const snapshot = JSON.stringify(mastery.activeRound);
  const second = prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 99 });
  assert.equal(second.activeRound, first.activeRound);
  assert.equal(JSON.stringify(second.activeRound), snapshot);
});

test('formal discover completion remains false until remediation completes', () => {
  const course = createDiscoverCourseState(discoverQuestions);
  discoverQuestions.forEach((question) => { course.questions[question.id].completed = true; });
  prepareDiscoverMasteryRound(discoverMastery(14), discoverQuestions, { seed: 1 });
  assert.equal(areDiscoverQuestionsComplete(course, discoverQuestions), true);
  assert.equal(course.completed, false);
  const renderer = source('../discover-course.js');
  assert.match(renderer, /activeRound\.completed[\s\S]*renderMasteryComplete/);
  assert.match(renderer, /renderMasteryComplete\(\)[\s\S]*completeDiscoverCourse/);
});

test('synthesis remains one generated pairing item with related principles', () => {
  const mastery = discoverMastery(14);
  const round = prepareDiscoverMasteryRound(mastery, discoverQuestions, { seed: 2 }).activeRound;
  const synthesisIndex = round.queue.findIndex(({ principleId }) => principleId === 'synthesis');
  const descriptor = round.queue[synthesisIndex];
  const key = `${synthesisIndex}:${descriptor.sourceQuestionId}:${descriptor.masterySeed}`;
  const generated = round.generatedInstances[key];
  assert.deepEqual(descriptor.relatedPrincipleIds, ['harmony', 'unity']);
  assert.equal(round.queue.filter(({ principleId }) => principleId === 'synthesis').length, 1);
  assert.equal(generated.interactionType, 'pairing');
  assert.deepEqual(generated.pairingTargets, ['harmony', 'unity']);
});

test('new discover session clears only discover Mastery state', () => {
  const mastery = createMasteryPracticeState();
  Object.assign(mastery.discover, discoverMastery(14));
  Object.assign(mastery.recognize, recognizeMastery(7));
  prepareDiscoverMasteryRound(mastery.discover, discoverQuestions, { seed: 2 });
  prepareRecognizeMasteryRound(mastery.recognize, recognizeQuestions, { seed: 2 });
  const recognizeSnapshot = JSON.stringify(mastery.recognize);
  const course = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(course, discoverQuestions, 77, mastery.discover);
  assert.deepEqual(mastery.discover, { firstAttempts: {} });
  assert.equal(JSON.stringify(mastery.recognize), recognizeSnapshot);
});

test('B2 reuses the formal renderer and validator without exposing internal codes', () => {
  const renderer = source('../discover-course.js');
  assert.match(renderer, /questionCanvas\(q, response\.selection\)/);
  assert.match(renderer, /bindSelections\(q, response\.selection/);
  assert.match(renderer, /validateDiscoverQuestion\(q, response\.selection\)/);
  assert.equal(renderer.includes('${response.lastFeedbackCode}'), false);
  assert.equal(renderer.includes('${summary.masteryBand}'), false);
  assert.equal(renderer.includes('補考'), false);
  assert.equal(renderer.includes('未達標'), false);
});
