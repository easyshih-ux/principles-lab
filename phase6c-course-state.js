import { createExperimentSessionState, getExperimentState, resetExperimentState } from './experiment-session.js';
import { resolveDiagnosticHint } from './experiment-hints.js';
import { validatePhase6cExperiment } from './phase6c-validators.js?v=gate4-contrast-2';

const FINGERPRINT_FIELDS = Object.freeze([
  'id', 'shape', 'x', 'y', 'logicalX', 'logicalY', 'size', 'sizeLevel',
  'logicalSize', 'hue', 'hueFamily', 'colorId', 'lightness', 'lightnessLevel',
  'rotation', 'proportion', 'ratioLevel', 'lineStyle', 'isCore', 'stepSize', 'stepLightness'
]);

export function createPhase6cFingerprint(elements = []) {
  return JSON.stringify(elements.map((element) => Object.fromEntries(
    FINGERPRINT_FIELDS.map((field) => [field, element[field] ?? null])
  )));
}

function currentOption(state) {
  return state.selectedExperimentOption ?? null;
}

export function isPhase6cValidationCurrent(course, definition) {
  const state = getExperimentState(course, definition.id);
  return state.currentValidationPassed === true
    && state.validatedFingerprint === createPhase6cFingerprint(state.workingElements)
    && state.validatedExperimentOption === currentOption(state);
}

export function invalidatePhase6cValidationIfChanged(course, definition) {
  const state = getExperimentState(course, definition.id);
  if (!state.currentValidationPassed || isPhase6cValidationCurrent(course, definition)) return false;
  state.currentValidationPassed = false;
  state.validationStale = true;
  course.feedbackById[definition.id] = { stale: true };
  return true;
}

export function updatePhase6cWorkingElements(course, definition, elements) {
  const state = getExperimentState(course, definition.id);
  state.workingElements = elements;
  return invalidatePhase6cValidationIfChanged(course, definition);
}

export function selectPhase6cExperimentOption(course, definition, option) {
  const state = getExperimentState(course, definition.id);
  if (state.selectedExperimentOption === option) return false;
  state.selectedExperimentOption = option;
  return invalidatePhase6cValidationIfChanged(course, definition);
}

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
  state.currentValidationPassed = result.passed;
  state.validationStale = false;
  if (result.passed) {
    state.completed = true;
    state.validatedFingerprint = createPhase6cFingerprint(state.workingElements);
    state.validatedExperimentOption = currentOption(state);
  } else {
    state.validatedFingerprint = null;
    state.validatedExperimentOption = null;
  }
  const hint = result.passed ? null : resolveDiagnosticHint(definition, result.primaryDiagnosticCode, state.attemptCount);
  if (hint) state.hintLevel = hint.level;
  course.feedbackById[definition.id] = { result, hint };
  return course.feedbackById[definition.id];
}

export function resetPhase6cExperiment(course, definition) {
  const previous = getExperimentState(course, definition.id);
  const historicalCompletion = previous.completed;
  const hadCurrentPass = previous.currentValidationPassed;
  resetExperimentState(course, definition);
  const state = getExperimentState(course, definition.id);
  state.completed = historicalCompletion;
  state.validationStale = historicalCompletion || hadCurrentPass;
  course.feedbackById[definition.id] = state.validationStale ? { stale: true } : null;
  return state;
}

export function canAdvancePhase6c(course, definition) {
  return isPhase6cValidationCurrent(course, definition);
}

export function advancePhase6c(course, definition) {
  if (!canAdvancePhase6c(course, definition)) return null;
  const index = course.order.indexOf(definition.id);
  course.currentIndex = Math.min(index + 1, course.order.length);
  course.currentExperimentId = course.order[course.currentIndex] ?? null;
  course.completed = course.currentIndex >= course.order.length;
  return course.currentExperimentId;
}
