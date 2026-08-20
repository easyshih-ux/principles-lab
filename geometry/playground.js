import { GeometryCanvas } from './canvas.js';
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
  circle: { hue: 8, lightness: 60 },
  square: { hue: 210, lightness: 47 },
  triangle: { hue: 45, lightness: 62 },
  rectangle: { hue: 0, lightness: 15 },
  semicircle: { hue: 145, lightness: 46 },
  line: { hue: 210, lightness: 47 }
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
        <div class="geometry-action-tools">
          <button type="button" class="secondary-button geometry-tool" id="geometry-duplicate">複製</button>
          <button type="button" class="secondary-button geometry-tool" id="geometry-delete">刪除</button>
          <button type="button" class="secondary-button geometry-tool" id="geometry-undo">Undo</button>
        </div>
      </div>
      <div class="geometry-workspace">
        <div id="geometry-canvas-host"></div>
        <aside class="geometry-debug" aria-live="polite" aria-atomic="true">
          <h2>Element state</h2>
          <div id="geometry-debug-values"></div>
        </aside>
      </div>
      <p class="geometry-help">拖曳時自由跟隨，放開後吸附格點。選取後可使用方向鍵移動；Delete / Backspace 刪除。</p>
    </section>`;

  const engine = new GeometryEngine({
    allowedTools: Object.values(GEOMETRY_TOOLS)
  });
  const debug = document.querySelector('#geometry-debug-values');
  const updateDebug = () => {
    debug.innerHTML = debugMarkup(engine.getSelectedElement());
  };
  const canvas = new GeometryCanvas({
    container: document.querySelector('#geometry-canvas-host'),
    engine,
    onStateChange: updateDebug
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
      updateDebug();
    });
  });
  document.querySelector('#geometry-duplicate').addEventListener('click', () => {
    engine.duplicate();
    canvas.render();
    updateDebug();
  });
  document.querySelector('#geometry-delete').addEventListener('click', () => {
    engine.delete();
    canvas.render();
    updateDebug();
  });
  document.querySelector('#geometry-undo').addEventListener('click', () => {
    engine.undo();
    canvas.render();
    updateDebug();
  });
  updateDebug();

  return { canvas, engine };
}
