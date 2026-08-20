import { GeometryCanvas } from './canvas.js';
import { GeometryControlPanel } from './control-panel.js';
import { GEOMETRY_SHAPES, GEOMETRY_TOOLS } from './config.js';
import { GeometryEngine } from './engine.js';

const shapeLabels = Object.freeze({
  circle: '圓形',
  square: '正方形',
  triangle: '三角形',
  rectangle: '長方形',
  semicircle: '半圓',
  line: '線條'
});

const colors = Object.freeze({
  circle: { hue: 'red', lightness: 3 },
  square: { hue: 'blue', lightness: 3 },
  triangle: { hue: 'yellow', lightness: 3 },
  rectangle: { hue: 'orange', lightness: 2 },
  semicircle: { hue: 'green', lightness: 3 },
  line: { hue: 'purple', lightness: 3 }
});

const toolLabels = Object.freeze({
  add: '新增', move: '移動', duplicate: '複製', delete: '刪除', undo: 'Undo',
  size: '大小', color: '色彩', lightness: '深淺', rotation: '方向', proportion: '比例'
});

const constraintPresets = Object.freeze({
  all: {},
  blue: {
    hue: { allowedValues: ['blue'], defaultValue: 'blue' },
    lightness: { allowedValues: [1, 3, 5], defaultValue: 3 }
  },
  limited: {
    size: { allowedValues: [2, 4], defaultValue: 2 },
    rotation: { allowedValues: [0, 90, 180, 270], defaultValue: 0 },
    proportion: { allowedValues: [1, 3], lockedValues: [3], defaultValue: 1 }
  }
});

function debugMarkup(element) {
  if (!element) return '<p>尚未選取元素</p>';
  return `
    <dl>
      <div><dt>selected ID</dt><dd>${element.id}</dd></div>
      <div><dt>shape</dt><dd>${element.shape}</dd></div>
      <div><dt>logical x / y</dt><dd>${element.x} / ${element.y}</dd></div>
      <div><dt>size</dt><dd>${element.size}</dd></div>
      <div><dt>hue</dt><dd>${element.hue}</dd></div>
      <div><dt>lightness</dt><dd>${element.lightness}</dd></div>
      <div><dt>rotation</dt><dd>${element.rotation}</dd></div>
      <div><dt>proportion</dt><dd>${element.proportion}</dd></div>
    </dl>`;
}

export function renderGeometryPlayground({ app, navigate }) {
  app.innerHTML = `
    <section class="geometry-playground page-shell">
      <header class="geometry-playground-header">
        <button class="back-link" id="playground-back">← 回到入口</button>
        <div>
          <p class="section-label">開發驗收工具・非學生關卡</p>
          <h1>Geometry Playground</h1>
        </div>
      </header>
      <div class="geometry-toolbar" aria-label="幾何元素開發工具">
        <div class="geometry-shape-tools">
          ${GEOMETRY_SHAPES.map((shape) => `
            <button type="button" class="secondary-button geometry-tool" data-add-shape="${shape}">
              ${shapeLabels[shape]}
            </button>`).join('')}
        </div>
      </div>
      <details class="geometry-dev-settings" open>
        <summary>Playground 權限與數值限制</summary>
        <div class="geometry-tool-switches">
          ${Object.values(GEOMETRY_TOOLS).map((tool) => `
            <label><input type="checkbox" value="${tool}" data-tool-toggle checked> ${toolLabels[tool]}</label>`).join('')}
        </div>
        <label class="geometry-constraint-select">allowedValues 測試
          <select id="geometry-constraint-preset">
            <option value="all">全部合法值</option>
            <option value="blue">僅藍色；深淺 1／3／5</option>
            <option value="limited">大小 2／4；固定方向；比例 3 鎖定</option>
          </select>
        </label>
      </details>
      <div class="geometry-workspace">
        <div id="geometry-canvas-host"></div>
        <aside class="geometry-debug" aria-live="polite" aria-atomic="true">
          <h2>Element state</h2>
          <div id="geometry-debug-values"></div>
        </aside>
      </div>
      <div id="geometry-control-panel" class="geometry-control-panel" aria-label="幾何操作工具"></div>
      <p class="geometry-help">拖曳時自由跟隨，放開後吸附格點。選取後可使用方向鍵移動；Delete / Backspace 刪除。</p>
    </section>`;

  const engine = new GeometryEngine({
    allowedTools: Object.values(GEOMETRY_TOOLS)
  });
  const debug = document.querySelector('#geometry-debug-values');
  const updateDebug = () => {
    debug.innerHTML = debugMarkup(engine.getSelectedElement());
  };
  let controlPanel;
  const syncAll = () => {
    canvas.render();
    controlPanel.render();
    updateDebug();
  };
  const canvas = new GeometryCanvas({
    container: document.querySelector('#geometry-canvas-host'),
    engine,
    onStateChange: () => {
      controlPanel?.render();
      updateDebug();
    }
  });
  controlPanel = new GeometryControlPanel({
    container: document.querySelector('#geometry-control-panel'),
    engine,
    onVisualChange: () => {
      canvas.render();
      updateDebug();
    },
    onStateChange: syncAll
  });

  document.querySelector('#playground-back').addEventListener('click', () => navigate('#home'));
  document.querySelectorAll('[data-add-shape]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = engine.getState().elements.length;
      const shape = button.dataset.addShape;
      engine.add(shape, {
        x: 180 + (index % 4) * 180,
        y: 160 + (index % 3) * 130,
        ...colors[shape]
      });
      canvas.render();
      controlPanel.render();
      updateDebug();
    });
  });
  document.querySelectorAll('[data-tool-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const allowedTools = [...document.querySelectorAll('[data-tool-toggle]:checked')]
        .map((input) => input.value);
      engine.setAllowedTools(allowedTools);
      document.querySelectorAll('[data-add-shape]').forEach((button) => {
        button.disabled = !engine.canUse('add');
      });
      controlPanel.render();
    });
  });
  document.querySelector('#geometry-constraint-preset').addEventListener('change', (event) => {
    engine.setToolConstraints(constraintPresets[event.target.value]);
    controlPanel.render();
  });
  updateDebug();

  return { canvas, engine };
}
