import { createRecognizeSession } from './recognize-randomizer.js?v=final-qa-question-order';
import { getRecognizeVariant } from './recognize-template-pool.js';
import { recordRecognizeFirstAttempt, resetMasteryCourseState } from './mastery-practice.js';

export function createRecognizeCourseState(questions) {
  return {
    started: false,
    completed: false,
    questionOrder: [],
    variantSelections: {},
    optionOrders: {},
    questions: Object.fromEntries(questions.map((question) => [question.id, {
      selectedAnswer: null,
      attempts: 0,
      feedback: '',
      isCorrect: false
    }]))
  };
}

export function resetRecognizeCourse(courseState, questions, random = Math.random, forcedVariants = {}, masteryState = null) {
  const session = createRecognizeSession(questions, random, forcedVariants);
  Object.assign(courseState, createRecognizeCourseState(questions), session, { started: true });
  resetMasteryCourseState(masteryState);
}

export function getRecognizeSessionQuestion(courseState, question) {
  const variantId = courseState.variantSelections[question.id] ?? 'A';
  const variant = getRecognizeVariant(question, variantId) ?? getRecognizeVariant(question, 'A');
  const optionIds = courseState.optionOrders[question.id] ?? question.options.map(({ id }) => id);
  const optionsById = Object.fromEntries(question.options.map((item) => [item.id, item]));
  return {
    ...question,
    variantId,
    variantLabel: variant.variantLabel,
    elements: variant.elements,
    guides: variant.guides,
    options: optionIds.map((id) => optionsById[id]).filter(Boolean)
  };
}

export function getRecognizeSessionQuestions(courseState, questions) {
  const questionsById = Object.fromEntries(questions.map((question) => [question.id, question]));
  const ordered = courseState.questionOrder.map((id) => questionsById[id]).filter(Boolean);
  return ordered.length === questions.length ? ordered : questions;
}

export function selectRecognizeAnswer(courseState, questionId, answerId) {
  const questionState = courseState.questions[questionId];
  questionState.selectedAnswer = answerId;
  questionState.feedback = '';
}

export function applyRecognizeValidation(courseState, question, validation, masteryState = null) {
  const questionState = courseState.questions[question.id];
  recordRecognizeFirstAttempt(masteryState, question, {
    answerId: questionState.selectedAnswer,
    isCorrect: validation.isValid,
    initialVariantId: courseState.variantSelections[question.id] ?? 'A'
  });
  if (validation.isValid) {
    questionState.isCorrect = true;
    questionState.feedback = question.successFeedback;
    return true;
  }
  questionState.attempts += 1;
  questionState.isCorrect = false;
  const secondFeedback = question.wrongFeedbackSecond?.[questionState.selectedAnswer];
  questionState.feedback = (questionState.attempts >= 2 ? secondFeedback : null)
    ?? question.wrongFeedback[questionState.selectedAnswer]
    ?? '再找找畫面中最主要的視覺特徵。';
  return false;
}

export function firstIncompleteQuestion(courseState, questions) {
  return getRecognizeSessionQuestions(courseState, questions)
    .find((question) => !courseState.questions[question.id].isCorrect) ?? null;
}

export function completeRecognizeCourse(courseState, questions) {
  const complete = questions.every((question) => courseState.questions[question.id].isCorrect);
  courseState.completed = complete;
  return complete;
}
