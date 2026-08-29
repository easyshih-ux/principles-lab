import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscoverMasteryQueue,
  buildRecognizeMasteryQueue,
  createMasteryPracticeState
} from '../mastery-practice.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { recognizeTemplatePools } from '../recognize-template-pool.js';
import { discoverQuestions } from '../discover-questions.js';

function recognizeMastery(correctCount) {
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

test('recognize mastered produces an empty queue', () => {
  assert.deepEqual(buildRecognizeMasteryQueue(recognizeMastery(8), recognizeQuestions, { seed: 1 }), []);
});

test('recognize targeted contains one item for each missed principle only', () => {
  const mastery = recognizeMastery(6);
  const queue = buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 4 });
  const missed = recognizeQuestions.slice(6).map(({ principleId }) => principleId).sort();
  assert.equal(queue.length, 2);
  assert.deepEqual(queue.map(({ principleId }) => principleId).sort(), missed);
  assert.ok(queue.every(({ reason, round }) => reason === 'missed-principle' && round === 1));
});

test('recognize targeted excludes the initial variant and stays inside approved A B C', () => {
  const mastery = recognizeMastery(6);
  const queue = buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 8 });
  queue.forEach((item) => {
    assert.notEqual(item.variantId, mastery.firstAttempts[item.sourceQuestionId].initialVariantId);
    assert.ok(['A', 'B', 'C'].includes(item.variantId));
    assert.ok(recognizeTemplatePools[item.principleId][item.variantId]);
  });
});

test('recognize reinforcement is capped at six and covers distinct misses first', () => {
  const mastery = recognizeMastery(0);
  const queue = buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 12 });
  assert.equal(queue.length, 6);
  assert.equal(new Set(queue.map(({ principleId }) => principleId)).size, 6);
  assert.ok(queue.every(({ reason }) => reason === 'missed-principle'));
});

test('recognize reinforcement fills a short queue with unseen correct-principle variants', () => {
  const mastery = recognizeMastery(5);
  const queue = buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 3 });
  assert.equal(queue.length, 6);
  assert.equal(queue.filter(({ reason }) => reason === 'missed-principle').length, 3);
  assert.equal(queue.filter(({ reason }) => reason === 'mixed-reinforcement').length, 3);
  queue.forEach((item) => assert.notEqual(item.variantId, mastery.firstAttempts[item.sourceQuestionId].initialVariantId));
});

test('recognize queue is deterministic for one seed and can vary for another', () => {
  const mastery = recognizeMastery(0);
  const first = buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 20 });
  assert.deepEqual(first, buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 20 }));
  assert.notDeepEqual(first, buildRecognizeMasteryQueue(mastery, recognizeQuestions, { seed: 21 }));
});

test('discover mastered produces an empty queue', () => {
  assert.deepEqual(buildDiscoverMasteryQueue(discoverMastery(16), discoverQuestions, { seed: 1 }), []);
});

test('discover targeted contains only missed concept descriptors', () => {
  const mastery = discoverMastery(14);
  const queue = buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 7 });
  const missedIds = new Set(discoverQuestions.slice(14).map(({ id }) => id));
  assert.equal(queue.length, 2);
  assert.ok(queue.every(({ sourceQuestionId, reason, round }) => missedIds.has(sourceQuestionId) && reason === 'missed-concept' && round === 1));
});

test('discover descriptors preserve principle concept interaction and first failure', () => {
  const mastery = discoverMastery(14);
  const queue = buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 9 });
  queue.forEach((item) => {
    const snapshot = mastery.firstAttempts[item.sourceQuestionId];
    assert.equal(item.principleId, snapshot.principleId);
    assert.equal(item.conceptVariant, snapshot.conceptVariant);
    assert.equal(item.interactionType, snapshot.interactionType);
    assert.equal(item.firstFailureCode, snapshot.firstFailureCode);
    assert.equal(typeof item.masterySeed, 'number');
  });
});

test('discover descriptor never embeds or reuses the original generated instance', () => {
  const queue = buildDiscoverMasteryQueue(discoverMastery(14), discoverQuestions, { seed: 10 });
  queue.forEach((item) => {
    assert.equal('generatedQuestion' in item, false);
    assert.equal('generatedInstance' in item, false);
    assert.equal('initialGeneratedInstanceId' in item, false);
    assert.equal('elements' in item, false);
  });
});

test('discover reinforcement is capped at eight and principle aware', () => {
  const queue = buildDiscoverMasteryQueue(discoverMastery(0), discoverQuestions, { seed: 13 });
  assert.equal(queue.length, 8);
  assert.equal(new Set(queue.map(({ principleId }) => principleId)).size, 8);
});

test('discover reinforcement prioritizes misses before mixed reinforcement', () => {
  const queue = buildDiscoverMasteryQueue(discoverMastery(11), discoverQuestions, { seed: 6 });
  assert.equal(queue.length, 8);
  assert.equal(queue.filter(({ reason }) => reason === 'missed-concept').length, 5);
  assert.equal(queue.filter(({ reason }) => reason === 'mixed-reinforcement').length, 3);
});

test('discover synthesis stays one descriptor with explicit related principles', () => {
  const mastery = discoverMastery(14);
  const queue = buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 2 });
  const synthesis = queue.find(({ principleId }) => principleId === 'synthesis');
  assert.ok(synthesis);
  assert.deepEqual(synthesis.relatedPrincipleIds, ['harmony', 'unity']);
  assert.equal(queue.filter(({ principleId }) => principleId === 'synthesis').length, 1);
});

test('discover queue and mastery seeds are deterministic', () => {
  const mastery = discoverMastery(11);
  const first = buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 30 });
  assert.deepEqual(first, buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 30 }));
  assert.notDeepEqual(first, buildDiscoverMasteryQueue(mastery, discoverQuestions, { seed: 31 }));
  assert.ok(first.every(({ masterySeed }) => Number.isInteger(masterySeed) && masterySeed >= 0));
});
