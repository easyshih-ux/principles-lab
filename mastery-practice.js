import { createSeededRandom } from './discover-randomizer.js';
import { recognizeTemplatePools } from './recognize-template-pool.js';
import { generateDiscoverQuestions } from './discover-generators.js';

const emptyCourseMastery = () => ({ firstAttempts: {} });

export function createMasteryPracticeState() {
  return { recognize: emptyCourseMastery(), discover: emptyCourseMastery() };
}

export function resetMasteryCourseState(courseMastery) {
  if (!courseMastery) return;
  courseMastery.firstAttempts = {};
  delete courseMastery.summary;
  delete courseMastery.activeRound;
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
function recognizeRoundResponseKey(item, index) {
  return `${index}:${item.sourceQuestionId}:${item.variantId}`;
}

export function prepareRecognizeMasteryRound(courseMastery, questions, options = {}) {
  if (courseMastery.summary) return { summary: courseMastery.summary, activeRound: courseMastery.activeRound ?? null };
  const summary = buildRecognizeMasterySummary(courseMastery, questions);
  courseMastery.summary = summary;
  const queue = buildRecognizeMasteryQueue(courseMastery, questions, options);
  courseMastery.activeRound = queue.length ? {
    round: 1,
    queue,
    currentIndex: 0,
    responses: Object.fromEntries(queue.map((item, index) => [recognizeRoundResponseKey(item, index), {
      questionId: item.sourceQuestionId,
      principleId: item.principleId,
      variantId: item.variantId,
      selectedAnswer: null,
      attempts: 0,
      feedback: '',
      completed: false
    }])),
    started: false,
    completed: false
  } : null;
  return { summary, activeRound: courseMastery.activeRound };
}

export function beginRecognizeMasteryRound(courseMastery) {
  if (!courseMastery?.activeRound) return false;
  courseMastery.activeRound.started = true;
  return true;
}

export function getCurrentRecognizeMasteryItem(courseMastery) {
  const activeRound = courseMastery?.activeRound;
  if (!activeRound || activeRound.completed) return null;
  const item = activeRound.queue[activeRound.currentIndex] ?? null;
  if (!item) return null;
  return {
    item,
    response: activeRound.responses[recognizeRoundResponseKey(item, activeRound.currentIndex)]
  };
}

export function selectRecognizeMasteryAnswer(courseMastery, answerId) {
  const current = getCurrentRecognizeMasteryItem(courseMastery);
  if (!current || current.response.completed) return false;
  current.response.selectedAnswer = answerId;
  current.response.feedback = '';
  return true;
}

export function applyRecognizeMasteryResult(courseMastery, question, isCorrect) {
  const current = getCurrentRecognizeMasteryItem(courseMastery);
  if (!current || current.response.selectedAnswer == null) return false;
  if (isCorrect) {
    current.response.completed = true;
    current.response.feedback = question.successFeedback;
    return true;
  }
  current.response.attempts += 1;
  const secondFeedback = question.wrongFeedbackSecond?.[current.response.selectedAnswer];
  current.response.feedback = (current.response.attempts >= 2 ? secondFeedback : null)
    ?? question.wrongFeedback[current.response.selectedAnswer]
    ?? '再找找畫面中最主要的視覺特徵。';
  return false;
}

export function advanceRecognizeMasteryRound(courseMastery) {
  const activeRound = courseMastery?.activeRound;
  const current = getCurrentRecognizeMasteryItem(courseMastery);
  if (!activeRound || !current?.response.completed) return false;
  if (activeRound.currentIndex < activeRound.queue.length - 1) {
    activeRound.currentIndex += 1;
    return true;
  }
  activeRound.completed = true;
  return true;
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
function discoverRoundResponseKey(item, index) {
  return `${index}:${item.sourceQuestionId}:${item.masterySeed}`;
}

export function prepareDiscoverMasteryRound(courseMastery, questions, options = {}) {
  if (courseMastery.summary) return { summary: courseMastery.summary, activeRound: courseMastery.activeRound ?? null };
  const summary = buildDiscoverMasterySummary(courseMastery, questions);
  courseMastery.summary = summary;
  const queue = buildDiscoverMasteryQueue(courseMastery, questions, options);
  const questionsById = Object.fromEntries(questions.map((question) => [question.id, question]));
  const generatedInstances = Object.fromEntries(queue.map((item, index) => {
    const generated = generateDiscoverQuestions([questionsById[item.sourceQuestionId]], item.masterySeed)[item.sourceQuestionId];
    return [discoverRoundResponseKey(item, index), {
      ...generated,
      masteryInstanceId: `mastery:${item.masterySeed}:${item.sourceQuestionId}`
    }];
  }));
  courseMastery.activeRound = queue.length ? {
    round: 1,
    queue,
    generatedInstances,
    currentIndex: 0,
    responses: Object.fromEntries(queue.map((item, index) => [discoverRoundResponseKey(item, index), {
      sourceQuestionId: item.sourceQuestionId,
      principleId: item.principleId,
      conceptVariant: item.conceptVariant,
      masterySeed: item.masterySeed,
      selection: null,
      attempts: 0,
      lastFeedbackCode: '',
      feedback: '',
      completed: false
    }])),
    started: false,
    completed: false
  } : null;
  return { summary, activeRound: courseMastery.activeRound };
}

export function beginDiscoverMasteryRound(courseMastery) {
  if (!courseMastery?.activeRound) return false;
  courseMastery.activeRound.started = true;
  return true;
}

export function getCurrentDiscoverMasteryItem(courseMastery) {
  const activeRound = courseMastery?.activeRound;
  if (!activeRound || activeRound.completed) return null;
  const item = activeRound.queue[activeRound.currentIndex] ?? null;
  if (!item) return null;
  const key = discoverRoundResponseKey(item, activeRound.currentIndex);
  return { item, question: activeRound.generatedInstances[key], response: activeRound.responses[key] };
}

export function selectDiscoverMasteryAnswer(courseMastery, selection) {
  const current = getCurrentDiscoverMasteryItem(courseMastery);
  if (!current || current.response.completed) return false;
  current.response.selection = Array.isArray(selection)
    ? selection.slice()
    : (selection && typeof selection === 'object' ? { ...selection } : selection);
  current.response.feedback = '';
  current.response.lastFeedbackCode = '';
  return true;
}

export function applyDiscoverMasteryResult(courseMastery, result) {
  const current = getCurrentDiscoverMasteryItem(courseMastery);
  if (!current || current.response.selection == null) return false;
  if (result.isValid) {
    current.response.completed = true;
    current.response.lastFeedbackCode = 'success';
    current.response.feedback = current.question.successFeedback;
    return true;
  }
  current.response.attempts += 1;
  current.response.lastFeedbackCode = result.code;
  current.response.feedback = current.question.feedbackByCode?.[result.code]
    ?? current.question.hints[Math.min(current.response.attempts - 1, current.question.hints.length - 1)];
  return false;
}

export function advanceDiscoverMasteryRound(courseMastery) {
  const activeRound = courseMastery?.activeRound;
  const current = getCurrentDiscoverMasteryItem(courseMastery);
  if (!activeRound || !current?.response.completed) return false;
  if (activeRound.currentIndex < activeRound.queue.length - 1) {
    activeRound.currentIndex += 1;
    return true;
  }
  activeRound.completed = true;
  return true;
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
