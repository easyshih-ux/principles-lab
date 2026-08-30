import { principles, stages } from './data.js';
import { createRenderers } from './renderers.js?v=principles-wall-1';
import { resolveRoute } from './router.js';
import { createAppState, setCurrentRoute } from './state.js';
import { renderGeometryPlayground } from './geometry/playground.js';
import { renderValidatorLab } from './validator-lab.js';
import { recognizeQuestions } from './recognize-questions.js';
import { createRecognizeCourseRenderers } from './recognize-course.js?v=classroom-control-1';
import { discoverQuestions } from './discover-questions.js';
import { createDiscoverCourseRenderers } from './discover-course.js?v=blocking-fixes-1';
import { createExperimentCourseRenderers } from './experiment-course.js?v=final-phase-2';
import { createPhase6cCourseState } from './phase6c-course-state.js';
import { phase6cDefinitions, phase6cDefinitionsById } from './phase6c-definitions.js';
import { isClassroomRouteAllowed, loadClassroomUnlocks, requiredUnlockForRoute } from './classroom-unlocks.js?v=classroom-control-1';

const captureWidth = Number(new URLSearchParams(location.search).get('capture'));
if (captureWidth) {
  document.documentElement.classList.add('capture-wide');
  document.documentElement.style.setProperty('--capture-width', `${captureWidth}px`);
}

const app = document.querySelector('#app');
const state = createAppState(stages, recognizeQuestions, discoverQuestions);
let classroomStorage = null;
try { classroomStorage = window.localStorage; } catch { /* storage may be unavailable */ }
state.classroomUnlocks = loadClassroomUnlocks(classroomStorage);
state.experimentCourse = createPhase6cCourseState(phase6cDefinitions);

function focusRouteHeading() {
  const heading = app.querySelector('h1');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

function navigate(hash) {
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }
  location.hash = hash;
}

const renderers = createRenderers({ app, state, navigate, classroomStorage });
const recognizeRenderers = createRecognizeCourseRenderers({ app, state, navigate });
const discoverRenderers = createDiscoverCourseRenderers({ app, state, navigate });
const experimentRenderers = createExperimentCourseRenderers({ app, state, navigate });
let activePlayground = null;

function renderCurrentRoute() {
  activePlayground?.canvas.destroy();
  activePlayground = null;
  experimentRenderers.destroy();
  let route = resolveRoute(location.hash, stages, principles, recognizeQuestions);
  if (!isClassroomRouteAllowed(route, state.classroomUnlocks)) {
    const courseId = requiredUnlockForRoute(route);
    state.classroomGate.activeCourseId = courseId;
    state.classroomGate.error = '';
    state.classroomGate.message = '這一關尚未開放，請等待老師公布通行碼。';
    history.replaceState(null, '', '#principles');
    route = resolveRoute('#principles', stages, principles, recognizeQuestions);
  }
  setCurrentRoute(state, route);

  if (route.isFallback || route.isLegacyAlias) {
    history.replaceState(null, '', route.hash);
  }

  if (route.name === 'geometryPlayground') {
    activePlayground = renderGeometryPlayground({ app, navigate });
  } else if (route.name === 'validatorLab') {
    renderValidatorLab({ app, navigate });
  } else if (route.name === 'recognizeTemplateDev') {
    recognizeRenderers.dev();
  } else if (route.name === 'recognizeStart') {
    recognizeRenderers.start();
  } else if (route.name === 'recognizeQuestion') {
    recognizeRenderers.question(route.question);
  } else if (route.name === 'recognizeComplete') {
    recognizeRenderers.complete();
  } else if (route.name === 'discoverStart') {
    discoverRenderers.start();
  } else if (route.name === 'discoverQuestion') {
    discoverRenderers.question();
  } else if (route.name === 'discoverComplete') {
    discoverRenderers.complete();
  } else if (route.name === 'discoverDev') {
    discoverRenderers.dev();
  } else if (route.name === 'experimentStart') {
    experimentRenderers.start();
  } else if (route.name === 'experiment') {
    experimentRenderers.experiment(phase6cDefinitionsById[`experiment-${route.principleId}`]);
  } else if (route.name === 'experimentComplete') {
    experimentRenderers.complete();
  } else if (route.name === 'experimentDev') {
    experimentRenderers.dev();
  } else if (route.name === 'stage') {
    renderers.stage(route.stage);
  } else if (route.name === 'complete') {
    renderers.complete(route.principle);
  } else {
    renderers[route.name]();
  }

  window.scrollTo(0, 0);
  focusRouteHeading();
}

window.addEventListener('hashchange', renderCurrentRoute);
renderCurrentRoute();

export { navigate, renderCurrentRoute, state };
