import { principles, stages } from './data.js';
import { createRenderers } from './renderers.js';
import { resolveRoute } from './router.js';
import { createAppState, setCurrentRoute } from './state.js';
import { renderGeometryPlayground } from './geometry/playground.js';
import { renderValidatorLab } from './validator-lab.js';
import { recognizeQuestions } from './recognize-questions.js';
import { createRecognizeCourseRenderers } from './recognize-course.js';
import { discoverQuestions } from './discover-questions.js';
import { createDiscoverCourseRenderers } from './discover-course.js';

const captureWidth = Number(new URLSearchParams(location.search).get('capture'));
if (captureWidth) {
  document.documentElement.classList.add('capture-wide');
  document.documentElement.style.setProperty('--capture-width', `${captureWidth}px`);
}

const app = document.querySelector('#app');
const state = createAppState(stages, recognizeQuestions, discoverQuestions);

function navigate(hash) {
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }
  location.hash = hash;
}

const renderers = createRenderers({ app, state, navigate });
const recognizeRenderers = createRecognizeCourseRenderers({ app, state, navigate });
const discoverRenderers = createDiscoverCourseRenderers({ app, state, navigate });
let activePlayground = null;

function renderCurrentRoute() {
  activePlayground?.canvas.destroy();
  activePlayground = null;
  const route = resolveRoute(location.hash, stages, principles, recognizeQuestions);
  setCurrentRoute(state, route);

  if (route.isFallback || route.isLegacyAlias) {
    history.replaceState(null, '', route.hash);
  }

  if (route.name === 'geometryPlayground') {
    activePlayground = renderGeometryPlayground({ app, navigate });
  } else if (route.name === 'validatorLab') {
    renderValidatorLab({ app, navigate });
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
  } else if (route.name === 'stage') {
    renderers.stage(route.stage);
  } else if (route.name === 'complete') {
    renderers.complete(route.principle);
  } else {
    renderers[route.name]();
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', renderCurrentRoute);
renderCurrentRoute();

export { navigate, renderCurrentRoute, state };
