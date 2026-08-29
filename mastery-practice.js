import { createSeededRandom } from './discover-randomizer.js';
import { recognizeTemplatePools } from './recognize-template-pool.js';

const emptyCourseMastery = () => ({ firstAttempts: {} });

export function createMasteryPracticeState() {
  return { recognize: emptyCourseMastery(), discover: emptyCourseMastery() };
}

export function resetMasteryCourseState(courseMastery) {
  if (courseMastery) courseMastery.firstAttempts = {};
}

export function recordRecognizeFirstAttempt(courseMastery, question, data) {
  if (!courseMastery || data.answerId == null || courseMastery.firstAttempts[question.id]) return courseMastery?.firstAttempts[question.id] ?? null;
  const snapshot = {
    questionId: question.id,
    principleId: question.principleId,
    firstAttemptCorrect: Boolean(data.isCorrect),
    firstAttemptAnswerId: data.answerId,
    initialVariantId: data.initialVariantId
  };
  courseMastery.firstAttempts[question.id] = snapshot;
  return snapshot;
}

function hasMeaningfulSelection(selection) {
  if (selection == null || selection === '') return false;
  if (Array.isArray(selection)) return selection.length > 0;
  if (typeof selection === 'object') return Object.keys(selection).length > 0;
  return true;
}

export function recordDiscoverFirstAttempt(courseMastery, question, data) {
  if (!courseMastery || !hasMeaningfulSelection(data.selection) || courseMastery.firstAttempts[question.id]) return courseMastery?.firstAttempts[question.id] ?? null;
  const snapshot = {
    questionId: question.id,
    principleId: question.principleId,
    conceptVariant: question.conceptVariant,
    interactionType: question.interactionType,
    firstAttemptCorrect: Boolean(data.isCorrect),
    firstFailureCode: data.isCorrect ? null : data.failureCode,
    initialGeneratedInstanceId: data.initialGeneratedInstanceId
  };
  courseMastery.firstAttempts[question.id] = snapshot;
  return snapshot;
}

function randomFor(options = {}) {
  return typeof options.random === 'function' ? options.random : createSeededRandom(options.seed ?? 0);
}

function shuffle(items, random) {
  const output = items.slice();
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function recognizeBand(correct, answered = 8) {
  if (answered < 8) return null;
  if (correct === 8) return 'mastered';
  if (correct >= 6) return 'targeted';
  return 'reinforcement';
}

function recognizeCandidates(question, snapshot) {
  const pool = recognizeTemplatePools[question.principleId] ?? {};
  return Object.keys(pool).filter((variantId) => variantId !== snapshot?.initialVariantId).map((variantId) => ({
    sourceQuestionId: question.id,
    principleId: question.principleId,
    variantId,
    initialVariantId: snapshot?.initialVariantId ?? null,
    round: 1
  }));
}

export function buildRecognizeMasteryQueue(courseMastery, questions, options = {}) {
  const snapshots = courseMastery?.firstAttempts ?? {};
  const summary = buildRecognizeMasterySummary(courseMastery, questions);
  if (!summary.masteryBand || summary.masteryBand === 'mastered') return [];
  const random = randomFor(options);
  const missed = questions.filter((question) => summary.missedQuestionIds.includes(question.id));
  const firstCandidate = (question, reason) => {
    const [candidate] = shuffle(recognizeCandidates(question, snapshots[question.id]), random);
    return candidate ? { ...candidate, reason } : null;
  };
  if (summary.masteryBand === 'targeted') {
    return shuffle(missed, random)
      .map((question) => firstCandidate(question, 'missed-principle'))
      .filter(Boolean);
  }
  const correctQuestions = questions.filter((question) => snapshots[question.id]?.firstAttemptCorrect);
  const primary = shuffle(missed, random).map((question) => firstCandidate(question, 'missed-principle')).filter(Boolean);
  const fill = shuffle(correctQuestions, random).map((question) => firstCandidate(question, 'mixed-reinforcement')).filter(Boolean);
  return [...primary, ...fill].slice(0, 6);
}
export function buildRecognizeMasterySummary(courseMastery, questions) {
  const snapshots = courseMastery?.firstAttempts ?? {};
  const answered = questions.map((q) => snapshots[q.id]).filter(Boolean);
  const correctCount = answered.filter((snapshot) => snapshot.firstAttemptCorrect).length;
  const missed = answered.filter((snapshot) => !snapshot.firstAttemptCorrect);
  return {
    totalQuestions: questions.length,
    answeredQuestions: answered.length,
    firstAttemptCorrectCount: correctCount,
    firstAttemptWrongCount: answered.length - correctCount,
    masteryBand: recognizeBand(correctCount, answered.length),
    missedQuestionIds: missed.map(({ questionId }) => questionId),
    missedPrincipleIds: [...new Set(missed.map(({ principleId }) => principleId))]
  };
}

function discoverBand(correct, answered = 16) {
  if (answered < 16) return null;
  if (correct >= 15) return 'mastered';
  if (correct >= 12) return 'targeted';
  return 'reinforcement';
}

function discoverDescriptor(snapshot, question, random, reason) {
  return {
    sourceQuestionId: snapshot.questionId,
    principleId: snapshot.principleId,
    ...(snapshot.principleId === 'synthesis' && Array.isArray(question?.pairingTargets)
      ? { relatedPrincipleIds: question.pairingTargets.slice() }
      : {}),
    conceptVariant: snapshot.conceptVariant,
    interactionType: snapshot.interactionType,
    firstFailureCode: snapshot.firstFailureCode,
    masterySeed: Math.floor(random() * 0x100000000) >>> 0,
    reason,
    round: 1
  };
}

function principleAwareOrder(items, random) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.principleId)) groups.set(item.principleId, []);
    groups.get(item.principleId).push(item);
  });
  const queues = shuffle([...groups.values()], random).map((group) => shuffle(group, random));
  const ordered = [];
  while (queues.some((queue) => queue.length)) {
    queues.forEach((queue) => {
      if (queue.length) ordered.push(queue.shift());
    });
  }
  return ordered;
}

export function buildDiscoverMasteryQueue(courseMastery, questions, options = {}) {
  const snapshots = courseMastery?.firstAttempts ?? {};
  const summary = buildDiscoverMasterySummary(courseMastery, questions);
  if (!summary.masteryBand || summary.masteryBand === 'mastered') return [];
  const ordered = questions.map((question) => snapshots[question.id]).filter(Boolean);
  const random = randomFor(options);
  const questionsById = Object.fromEntries(questions.map((question) => [question.id, question]));
  const missed = ordered.filter((item) => !item.firstAttemptCorrect);
  if (summary.masteryBand === 'targeted') {
    return shuffle(missed, random).map((item) => discoverDescriptor(
      item, questionsById[item.questionId], random, 'missed-concept'
    ));
  }
  const primary = principleAwareOrder(missed, random);
  const fill = principleAwareOrder(ordered.filter((item) => item.firstAttemptCorrect), random);
  return [...primary, ...fill].slice(0, 8).map((item) => discoverDescriptor(
    item,
    questionsById[item.questionId],
    random,
    item.firstAttemptCorrect ? 'mixed-reinforcement' : 'missed-concept'
  ));
}
export function buildDiscoverMasterySummary(courseMastery, questions) {
  const snapshots = courseMastery?.firstAttempts ?? {};
  const ordered = questions.map((q) => snapshots[q.id]).filter(Boolean);
  const correctCount = ordered.filter((item) => item.firstAttemptCorrect).length;
  const missed = ordered.filter((item) => !item.firstAttemptCorrect);
  const missedConceptVariants = [];
  const seenConcepts = new Set();
  missed.forEach(({ principleId, conceptVariant }) => {
    const key = `${principleId}:${conceptVariant}`;
    if (!seenConcepts.has(key)) {
      seenConcepts.add(key);
      missedConceptVariants.push({ principleId, conceptVariant });
    }
  });
  const questionsById = Object.fromEntries(questions.map((question) => [question.id, question]));
  const relatedPrincipleIds = [...new Set(missed.flatMap((snapshot) => {
    const question = questionsById[snapshot.questionId];
    return question?.principleId === 'synthesis' && Array.isArray(question.pairingTargets)
      ? question.pairingTargets
      : [];
  }))];
  return {
    totalQuestions: questions.length,
    answeredQuestions: ordered.length,
    firstAttemptCorrectCount: correctCount,
    firstAttemptWrongCount: ordered.length - correctCount,
    masteryBand: discoverBand(correctCount, ordered.length),
    missedQuestionIds: missed.map(({ questionId }) => questionId),
    missedPrincipleIds: [...new Set(missed.map(({ principleId }) => principleId))],
    missedConceptVariants,
    firstFailureCodes: Object.fromEntries(missed.map(({ questionId, firstFailureCode }) => [questionId, firstFailureCode])),
    ...(relatedPrincipleIds.length ? { relatedPrincipleIds } : {})
  };
}
