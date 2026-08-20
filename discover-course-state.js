import { generateDiscoverQuestions } from './discover-generators.js';
import { createDiscoverOrder } from './discover-randomizer.js';

const emptyQuestionState = () => ({ attempts: 0, selection: null, feedbackCode: '', feedback: '', completed: false });

export function createDiscoverCourseState(questions) {
  return {
    started: false, questionOrder: [], currentIndex: 0, questions: Object.fromEntries(questions.map(({ id }) => [id, emptyQuestionState()])),
    completedQuestions: [], Q13Completed: false, Q14Completed: false, completed: false, seed: null,
    generatedQuestions: {}
  };
}

export function startDiscoverCourse(state, questions, seed = Date.now()) {
  Object.assign(state, createDiscoverCourseState(questions), {
    started: true,
    seed,
    questionOrder: createDiscoverOrder(questions, seed),
    generatedQuestions: generateDiscoverQuestions(questions, seed)
  });
  return state.questionOrder;
}

export function currentDiscoverQuestion(state, questions) {
  const id = state.questionOrder[state.currentIndex];
  return state.generatedQuestions[id] ?? questions.find((question) => question.id === id) ?? null;
}

export function setDiscoverSelection(state, questionId, selection) {
  const target = state.questions[questionId];
  target.selection = Array.isArray(selection) ? selection.slice() : (selection && typeof selection === 'object' ? { ...selection } : selection);
  target.feedback = '';
  target.feedbackCode = '';
}

export function applyDiscoverResult(state, question, result) {
  const target = state.questions[question.id];
  if (result.isValid) {
    target.completed = true;
    target.feedbackCode = 'success';
    target.feedback = question.successFeedback;
    if (!state.completedQuestions.includes(question.id)) state.completedQuestions.push(question.id);
    state.Q13Completed = state.questions['discover-harmony']?.completed ?? false;
    state.Q14Completed = state.questions['discover-unity']?.completed ?? false;
    return true;
  }
  target.attempts += 1;
  target.feedbackCode = result.code;
  target.feedback = question.feedbackByCode?.[result.code]
    ?? question.hints[Math.min(target.attempts - 1, question.hints.length - 1)];
  return false;
}

export function advanceDiscoverCourse(state, questions) {
  const question = currentDiscoverQuestion(state, questions);
  if (!question || !state.questions[question.id].completed) return false;
  if (state.currentIndex < state.questionOrder.length - 1) {
    state.currentIndex += 1;
    return true;
  }
  state.completed = true;
  return true;
}
