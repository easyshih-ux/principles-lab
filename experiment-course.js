import { ConstrainedGeometryCanvas } from './geometry/constrained-canvas.js';
import { GeometryControlPanel } from './geometry/control-panel.js';
import { ConstrainedGeometryEngine } from './geometry/constrained-engine.js';
import { GEOMETRY_SHAPES } from './geometry/config.js';
import { getExperimentState } from './experiment-session.js';
import {
  advancePhase6c,
  canAdvancePhase6c,
  resetPhase6cExperiment,
  submitPhase6cExperiment
} from './phase6c-course-state.js';
import { phase6cDefinitions, phase6cDefinitionsById } from './phase6c-definitions.js';
import { phase6cFixtures } from './phase6c-fixtures.js';
import { validatePhase6cExperiment } from './phase6c-validators.js';
import { resolveDiagnosticHint } from './experiment-hints.js';

const shapeLabels = { circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' };

function clone(value) {
  return structuredClone(value);
}

export function nextHash(definition) {
  const index = phase6cDefinitions.findIndex((item) => item.id === definition.id);
  const next = phase6cDefinitions[index + 1];
  return next ? `#level/experiment/${next.principleId}` : '#level/experiment/complete';
}

export function feedbackMarkup(definition, feedback) {
  if (!feedback) return '<p>完成構圖後，再按「檢查構圖」。</p>';
  if (!feedback.result.passed) {
    return `<p class="experiment-feedback-label">再觀察一下</p><p>${feedback.hint?.text ?? '再觀察構圖中的變化。'}</p>`;
  }
  const methods = feedback.result.detectedMethods;
  const method = methods.includes('multiple') || methods.includes('mixed') ? methods[0] : methods[0];
  const success = definition.successFeedback.byMethod[method] ?? definition.successFeedback.general;
  const discovery = definition.discoveryFeedback[method] ?? definition.discoveryFeedback.general ?? '';
  return `<p class="experiment-feedback-label success">成功！</p><p>${success}</p>${discovery ? `<p class="experiment-discovery"><strong>小發現</strong>${discovery}</p>` : ''}`;
}

export function experimentActionsMarkup(course, definition, feedback) {
  const reset = '<button type="button" class="secondary-button" id="experiment-reset">復原本題</button>';
  if (canAdvancePhase6c(course, definition)) {
    return `${reset}<button type="button" class="primary-button" id="experiment-next">下一個挑戰</button>`;
  }
  const label = feedback && !feedback.result.passed ? '再次檢查' : '檢查構圖';
  return `${reset}<button type="button" class="primary-button" id="experiment-check">${label}</button>`;
}

export function createExperimentCourseRenderers({ app, state, navigate }) {
  let active = null;

  function destroy() {
    active?.canvas.destroy();
    active = null;
  }

  function start() {
    destroy();
    app.innerHTML = `
      <section class="experiment-intro page-shell">
        <div><p class="section-label">第三關｜換你做</p><h1>有限工具<br>形式實驗</h1>
        <p class="experiment-intro-lead">沒有唯一答案。運用有限工具，讓指定的形式原理成立。</p>
        <button class="primary-button" id="experiment-start">開始第一組實驗</button>
        <button class="back-link" id="experiment-home">返回實驗室</button></div>
        <div class="experiment-intro-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </section>`;
    document.querySelector('#experiment-start').addEventListener('click', () => navigate('#level/experiment/repetition'));
    document.querySelector('#experiment-home').addEventListener('click', () => navigate('#principles'));
  }

  function experiment(definition) {
    destroy();
    const experimentState = getExperimentState(state.experimentCourse, definition.id);
    const feedback = state.experimentCourse.feedbackById[definition.id];
    const index = phase6cDefinitions.findIndex((item) => item.id === definition.id);
    const enabledShapes = definition.allowedTools.shape ? GEOMETRY_SHAPES.filter((shape) => shape !== 'line') : [];
    app.innerHTML = `
      <section class="experiment-page page-shell">
        <header class="experiment-header">
          <button class="back-link" id="experiment-back">← 返回實驗室</button>
          <div><p class="section-label">第三關｜有限工具實驗</p><h1>${definition.title}</h1></div>
          <strong>${index + 1}／${phase6cDefinitions.length}</strong>
        </header>
        <section class="experiment-task"><p>${definition.task}</p></section>
        ${definition.principleId === 'symmetry' ? `<div class="experiment-mode-bar" role="group" aria-label="選擇對稱方式">${[['vertical','左右對稱'],['horizontal','上下對稱'],['cross','十字對稱']].map(([value,label]) => `<button type="button" data-symmetry-mode="${value}" aria-pressed="${experimentState.selectedExperimentOption === value}" class="${experimentState.selectedExperimentOption === value ? 'selected' : ''}">${label}</button>`).join('')}</div>` : ''}
        ${enabledShapes.length ? `<div class="experiment-shape-bar"><span>新增造形</span>${enabledShapes.map((shape) => `<button type="button" data-add-shape="${shape}">${shapeLabels[shape]}</button>`).join('')}</div>` : ''}
        <div class="experiment-canvas-wrap ${definition.principleId === 'balance' ? 'show-balance-axis' : ''}"><div id="experiment-canvas"></div></div>
        <footer class="experiment-footer">
          <div class="experiment-feedback" id="experiment-feedback" aria-live="polite">${feedbackMarkup(definition, feedback)}</div>
          <div class="experiment-actions">${experimentActionsMarkup(state.experimentCourse, definition, feedback)}</div>
        </footer>
        <div class="geometry-control-panel" id="experiment-controls"></div>
      </section>`;

    const engine = new ConstrainedGeometryEngine({
      elements: experimentState.workingElements,
      allowedTools: definition.allowedTools,
      grid: definition.initialState.gridConfig ?? undefined,
      toolConstraints: { rotation: { allowedValues: definition.principleId === 'symmetry' ? [0,45,90,135,180,225,270,315] : [0,45,90,135], defaultValue: 0 } }
    });
    let panel;
    const sync = () => {
      experimentState.workingElements = engine.getState().elements;
      experimentState.historyRef = engine.history;
      panel?.render();
    };
    const canvas = new ConstrainedGeometryCanvas({ container: document.querySelector('#experiment-canvas'), engine, grid: definition.principleId === 'symmetry' ? { ...definition.initialState.gridConfig, axis: experimentState.selectedExperimentOption } : { enabled: false }, onStateChange: sync });
    panel = new GeometryControlPanel({ container: document.querySelector('#experiment-controls'), engine, onVisualChange: () => canvas.render(), onStateChange: () => { sync(); canvas.render(); } });
    active = { canvas, engine, panel };

    document.querySelectorAll('[data-symmetry-mode]').forEach((button) => button.addEventListener('click', () => { experimentState.selectedExperimentOption = button.dataset.symmetryMode; experiment(definition); }));
    document.querySelectorAll('[data-add-shape]').forEach((button) => button.addEventListener('click', () => {
      engine.add(button.dataset.addShape, { x: 500, y: 300 });
      sync(); canvas.render();
    }));
    document.querySelector('#experiment-back').addEventListener('click', () => navigate('#principles'));
    document.querySelector('#experiment-reset').addEventListener('click', () => {
      resetPhase6cExperiment(state.experimentCourse, definition);
      experiment(definition);
    });
    document.querySelector('#experiment-check')?.addEventListener('click', () => {
      sync();
      submitPhase6cExperiment(state.experimentCourse, definition);
      experiment(definition);
    });
    document.querySelector('#experiment-next')?.addEventListener('click', () => {
      advancePhase6c(state.experimentCourse, definition);
      navigate(nextHash(definition));
    });
  }

  function complete() {
    destroy();
    app.innerHTML = `<section class="experiment-complete page-shell"><div><p class="section-label">第三關｜第二組</p><h1>第二組實驗完成</h1><p>你已完成反覆、漸層、均衡、律動、對稱、對比與比例。後續形式原理仍在施工中。</p><button class="primary-button" id="experiment-return">返回實驗室</button></div><div class="experiment-complete-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></section>`;
    document.querySelector('#experiment-return').addEventListener('click', () => navigate('#principles'));
  }

  function dev() {
    destroy();
    let currentId = phase6cDefinitions[0].id;
    let elements = clone(phase6cFixtures.repetition.fail.two);
    let attempts = 1;
    app.innerHTML = `<section class="experiment-dev page-shell"><header class="validator-lab-header"><div><p class="section-label">開發驗收工具・非學生關卡</p><h1>Experiment Lab</h1></div><button class="back-link" id="experiment-dev-back">返回</button></header><div class="experiment-dev-controls"><select id="experiment-dev-select">${phase6cDefinitions.map((item) => `<option value="${item.id}">${item.title}</option>`).join('')}</select><button data-fixture="pass">載入 PASS</button><button data-fixture="fail">載入 FAIL</button><button id="experiment-dev-reset">Reset</button><label>提示層級<select id="experiment-dev-attempt"><option value="1">attempt 1</option><option value="2">attempt 2</option><option value="3">attempt 3</option></select></label></div><div id="experiment-dev-output"></div></section>`;
    const renderOutput = () => {
      const definition = phase6cDefinitionsById[currentId];
      const result = validatePhase6cExperiment(definition, { workingElements: elements, selectedExperimentOption: definition.initialState.selectedSymmetryMode });
      const hint = result.passed ? null : resolveDiagnosticHint(definition, result.primaryDiagnosticCode, attempts);
      document.querySelector('#experiment-dev-output').innerHTML = `<div class="validator-lab-output"><section><h2>狀態</h2><strong>${result.passed ? 'PASS' : 'FAIL'}</strong></section><section><h2>diagnostic code</h2><p>${result.primaryDiagnosticCode}</p><h2>detectedMethods</h2><p>${result.detectedMethods.join(', ') || '—'}</p></section><section><h2>提示</h2><p>${hint ? `${hint.level}｜${hint.text}` : '成功'}</p></section><section class="validator-metrics"><h2>metrics</h2><pre>${JSON.stringify(result.metrics, null, 2)}</pre></section></div>`;
    };
    const loadFixture = (kind) => {
      const principle = phase6cDefinitionsById[currentId].principleId;
      const source = phase6cFixtures[principle][kind];
      elements = clone(source[Object.keys(source)[0]]);
      renderOutput();
    };
    document.querySelector('#experiment-dev-select').addEventListener('change', (event) => { currentId = event.target.value; loadFixture('fail'); });
    document.querySelectorAll('[data-fixture]').forEach((button) => button.addEventListener('click', () => loadFixture(button.dataset.fixture)));
    document.querySelector('#experiment-dev-reset').addEventListener('click', () => loadFixture('fail'));
    document.querySelector('#experiment-dev-attempt').addEventListener('change', (event) => { attempts = Number(event.target.value); renderOutput(); });
    document.querySelector('#experiment-dev-back').addEventListener('click', () => navigate('#principles'));
    renderOutput();
  }

  return { start, experiment, complete, dev, destroy };
}
