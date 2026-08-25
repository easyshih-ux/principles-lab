import { createExperimentSessionState, getExperimentState, resetExperimentState } from './experiment-session.js';
import { resolveDiagnosticHint } from './experiment-hints.js';
import { validatePhase6cExperiment } from './phase6c-validators.js';

export function createPhase6cCourseState(definitions) {
  return {
    ...createExperimentSessionState(definitions),
    order: definitions.map((item) => item.id),
    currentIndex: 0,
    completed: false,
    feedbackById: Object.fromEntries(definitions.map((item) => [item.id, null]))
  };
}

export function submitPhase6cExperiment(course, definition) {
  const state = getExperimentState(course, definition.id);
  state.attemptCount += 1;
  const result = validatePhase6cExperiment(definition, state);
  state.lastDiagnosticCode = result.primaryDiagnosticCode;
  state.detectedMethods = [...result.detectedMethods];
  state.completed = result.passed;
  const hint = result.passed ? null : resolveDiagnosticHint(definition, result.primaryDiagnosticCode, state.attemptCount);
  if (hint) state.hintLevel = hint.level;
  course.feedbackById[definition.id] = { result, hint };
  return course.feedbackById[definition.id];
}

export function resetPhase6cExperiment(course, definition) {
  resetExperimentState(course, definition);
  course.feedbackById[definition.id] = null;
  course.completed = false;
  return getExperimentState(course, definition.id);
}

export function canAdvancePhase6c(course, definition) {
  return getExperimentState(course, definition.id).completed;
}

export function advancePhase6c(course, definition) {
  if (!canAdvancePhase6c(course, definition)) return null;
  const index = course.order.indexOf(definition.id);
  course.currentIndex = Math.min(index + 1, course.order.length);
  course.currentExperimentId = course.order[course.currentIndex] ?? null;
  course.completed = course.currentIndex >= course.order.length;
  return course.currentExperimentId;
}
