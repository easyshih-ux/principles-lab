import { ConstrainedGeometryCanvas } from './geometry/constrained-canvas.js?v=geometry-aspect-1';
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
import { principles as principleMetadata } from './data.js';
import { syncCourseCompletion } from './state.js';

const shapeLabels = { circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' };
export function addShapeControlsMarkup(allowedTools = {}) {
  if (!allowedTools.addShape) return '';
  const shapes = GEOMETRY_SHAPES.filter((shape) => !['line', 'semicircle'].includes(shape));
  return `<div class="experiment-shape-bar experiment-side-group"><strong>新增造形</strong>${shapes.map((shape) => `<button type="button" data-add-shape="${shape}">${shapeLabels[shape]}</button>`).join('')}</div>`;
}


function clone(value) {
  return structuredClone(value);
}

export function finalCompletionMarkup(principles = principleMetadata) {
  return `
    <section class="experiment-complete final-completion page-shell">
      <div class="final-completion-copy">
        <p class="section-label">我真的會用了</p>
        <h1>視覺實驗室完成！</h1>
        <div class="final-learning-summary" aria-label="三階段學習成果">
          <strong>你看得出來。</strong>
          <strong>你找得到問題。</strong>
          <strong>你也做得出來。</strong>
        </div>
        <p>形式原理不是只有一個標準答案，而是可以被觀察、理解，也可以被你自己運用。</p>
        <ul class="final-principle-list" aria-label="完成的十項形式原理">
          ${principles.map((principle) => `<li>${principle.name}</li>`).join('')}
        </ul>
        <button type="button" class="primary-button" id="experiment-return">回到形式原理實驗室</button>
      </div>
      <div class="experiment-complete-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    </section>`;
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
    const label = definition.principleId === 'simplicity' ? '完成視覺實驗室' : '下一個挑戰';
    return `${reset}<button type="button" class="primary-button" id="experiment-next">${label}</button>`;
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
    const hasRightTools = definition.allowedTools.rotation || definition.allowedTools.duplicate || definition.allowedTools.delete || definition.allowedTools.grid || definition.principleId === 'symmetry';
    app.innerHTML = `
      <section class="experiment-page principle-${definition.principleId} page-shell">
        <header class="experiment-header">
          <button class="back-link" id="experiment-back">← 返回實驗室</button>
          <div><p class="section-label">第三關｜有限工具實驗</p><h1>${definition.title}</h1></div>
          <strong>${index + 1}／${phase6cDefinitions.length}</strong>
        </header>
        <section class="experiment-task"><p>${definition.task}</p>${definition.principleId === 'simplicity' ? '<div class="simplicity-method-hint"><strong>可以從三種方法開始，不一定每一種都要使用：</strong><span><b>減少</b>拿掉不必要的元素</span><span><b>整理</b>重新安排，讓畫面更清楚</span><span><b>減少變化</b>減少太多不同的大小或色彩</span><em>核心元素要保留下來。</em></div>' : ''}</section>
        <section class="experiment-workspace ${hasRightTools ? '' : 'no-right-tools'}">
          <aside class="experiment-tool-panel experiment-tool-panel-left" aria-label="建立與主要屬性工具">
            ${addShapeControlsMarkup(definition.allowedTools)}
            <div class="geometry-control-panel" id="experiment-controls-primary"></div>
          </aside>
          <div class="experiment-center-workspace">
            <div class="experiment-canvas-wrap ${definition.principleId === 'balance' ? 'show-balance-axis' : ''}"><div id="experiment-canvas"></div></div>
            <footer class="experiment-footer">
              <div class="experiment-feedback" id="experiment-feedback" aria-live="polite">${feedbackMarkup(definition, feedback)}</div>
              <div class="experiment-actions">${experimentActionsMarkup(state.experimentCourse, definition, feedback)}</div>
            </footer>
          </div>
          <aside class="experiment-tool-panel experiment-tool-panel-right ${hasRightTools ? '' : 'is-empty'}" aria-label="操作與特殊工具">
            ${definition.principleId === 'symmetry' ? `<div class="experiment-mode-bar experiment-side-group" role="group" aria-label="選擇對稱方式"><strong>對稱模式</strong>${[['vertical','左右對稱'],['horizontal','上下對稱'],['cross','十字對稱']].map(([value,label]) => `<button type="button" data-symmetry-mode="${value}" aria-pressed="${experimentState.selectedExperimentOption === value}" class="${experimentState.selectedExperimentOption === value ? 'selected' : ''}">${label}</button>`).join('')}</div>` : ''}
            <div class="geometry-control-panel" id="experiment-controls-secondary"></div>
          </aside>
        </section>
      </section>`;

    const engine = new ConstrainedGeometryEngine({
      elements: experimentState.workingElements,
      allowedTools: definition.allowedTools,
      grid: definition.initialState.gridConfig ?? undefined,
      nonDeletableElementIds: definition.initialState.nonDeletableElementIds ?? [],
      toolConstraints: { rotation: { allowedValues: definition.principleId === 'symmetry' ? [0,45,90,135,180,225,270,315] : [0,45,90,135], defaultValue: 0 } }
    });
    let panels = [];
    const sync = () => {
      experimentState.workingElements = engine.getState().elements;
      experimentState.historyRef = engine.history;
      panels.forEach((panel) => panel.render());
    };
    const canvas = new ConstrainedGeometryCanvas({ container: document.querySelector('#experiment-canvas'), engine, grid: definition.principleId === 'symmetry' ? { ...definition.initialState.gridConfig, axis: experimentState.selectedExperimentOption } : { enabled: false }, onStateChange: sync });
    const panelOptions = {
      engine,
      onVisualChange: () => canvas.render(),
      onStateChange: () => { sync(); canvas.render(); },
      onActionResult: (result, action) => {
        if (action === 'delete' && result?.reason === 'protected-element') {
          document.querySelector('#experiment-feedback').innerHTML = '<p class="experiment-feedback-label">保留重要元素</p><p>這是構圖的重要元素，要想辦法保留下來。</p>';
        }
      }
    };
    panels = [
      new GeometryControlPanel({ ...panelOptions, container: document.querySelector('#experiment-controls-primary'), region: 'primary' }),
      new GeometryControlPanel({ ...panelOptions, container: document.querySelector('#experiment-controls-secondary'), region: 'secondary' })
    ];
    active = { canvas, engine, panels };

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
    if (canAdvancePhase6c(state.experimentCourse, definition)) {
      document.querySelector('#experiment-next')?.focus();
    }
  }

  function complete() {
    destroy();
    state.experimentCourse.completed = state.experimentCourse.currentIndex >= state.experimentCourse.order.length;
    syncCourseCompletion(state);
    app.innerHTML = finalCompletionMarkup();
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
