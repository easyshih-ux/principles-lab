function createStageState(stage) {
  const common = {
    attempts: 0,
    feedback: '',
    isComplete: false
  };

  if (stage.stageType === 'recognize') {
    return { ...common, selectedOptionId: null };
  }

  if (stage.stageType === 'discover') {
    return { ...common, selectedElementId: null };
  }

  if (stage.stageType === 'experiment') {
    return {
      ...common,
      order: stage.initialState.order.slice(),
      history: []
    };
  }

  return common;
}

import { createRecognizeCourseState } from './recognize-course-state.js';
import { createDiscoverCourseState } from './discover-course-state.js';
import { createLockedClassroomUnlocks } from './classroom-unlocks.js?v=classroom-control-1';
import { createMasteryPracticeState } from './mastery-practice.js';

export function createAppState(stages, recognizeQuestions = [], discoverQuestions = []) {
  return {
    navigation: {
      currentRoute: { name: 'home', hash: '#home' },
      previousHash: null
    },
    stageState: Object.fromEntries(
      stages.map((stage) => [stage.id, createStageState(stage)])
    ),
    temporary: {},
    completion: {
      stages: {},
      principles: {},
      courses: {
        recognize: false,
        discover: false,
        experiment: false,
        all: false
      }
    },
    classroomUnlocks: createLockedClassroomUnlocks(),
    classroomGate: { activeCourseId: null, message: '', error: '' },
    masteryPractice: createMasteryPracticeState(),
    recognizeCourse: createRecognizeCourseState(recognizeQuestions),
    discoverCourse: createDiscoverCourseState(discoverQuestions)
  };
}

export function syncCourseCompletion(state) {
  const courses = {
    recognize: Boolean(state.recognizeCourse?.completed),
    discover: Boolean(state.discoverCourse?.completed),
    experiment: Boolean(state.experimentCourse?.completed)
  };
  courses.all = courses.recognize && courses.discover && courses.experiment;
  state.completion.courses = courses;
  return courses;
}

export function setCurrentRoute(state, route) {
  state.navigation.previousHash = state.navigation.currentRoute?.hash ?? null;
  state.navigation.currentRoute = route;
}

export function getStageState(state, stageId) {
  const stageState = state.stageState[stageId];
  if (!stageState) {
    throw new Error(`Unknown stage state: ${stageId}`);
  }
  return stageState;
}

export function updateStageState(state, stageId, changes) {
  Object.assign(getStageState(state, stageId), changes);
}

export function resetStageState(state, stage) {
  state.stageState[stage.id] = createStageState(stage);
}

export function resetPrincipleStages(state, stages, principleId) {
  stages
    .filter((stage) => stage.principleId === principleId)
    .forEach((stage) => resetStageState(state, stage));
  delete state.completion.principles[principleId];
}

export function markStageComplete(state, stage) {
  updateStageState(state, stage.id, { isComplete: true });
  state.completion.stages[stage.id] = true;
}

export function clearStageCompletion(state, stageId) {
  updateStageState(state, stageId, { isComplete: false });
  delete state.completion.stages[stageId];
}

export function markPrincipleComplete(state, principleId) {
  state.completion.principles[principleId] = true;
}
