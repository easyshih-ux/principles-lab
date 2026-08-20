import { principles, stages } from './data.js';
import { createRenderers } from './renderers.js';
import { resolveRoute } from './router.js';
import { createAppState, setCurrentRoute } from './state.js';

const captureWidth = Number(new URLSearchParams(location.search).get('capture'));
if (captureWidth) {
  document.documentElement.classList.add('capture-wide');
  document.documentElement.style.setProperty('--capture-width', `${captureWidth}px`);
}

const app = document.querySelector('#app');
const state = createAppState(stages);

function navigate(hash) {
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }
  location.hash = hash;
}

const renderers = createRenderers({ app, state, navigate });

function renderCurrentRoute() {
  const route = resolveRoute(location.hash, stages, principles);
  setCurrentRoute(state, route);

  if (route.isFallback || route.isLegacyAlias) {
    history.replaceState(null, '', route.hash);
  }

  if (route.name === 'stage') {
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
