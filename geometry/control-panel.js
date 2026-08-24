import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  PROPORTION_LEVELS,
  ROTATION_VALUES,
  SIZE_LEVELS
} from './config.js';
import { HUE_LABELS, getDisplayColor } from './palette.js';

function nearestAllowed(value, allowedValues) {
  return allowedValues.reduce((nearest, candidate) => (
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest
  ));
}

export function getControlPanelState(engine) {
  const element = engine.getSelectedElement();
  if (!element) return { selectedId: null, values: null };
  return {
    selectedId: element.id,
    values: {
      size: element.size,
      hue: element.hue,
      lightness: element.lightness,
      rotation: element.rotation,
      proportion: element.proportion
    }
  };
}

function scaleMarkup({ property, label, start, end, values, current, allowedValues }) {
  if (!allowedValues.length) {
    return `
      <section class="geometry-control geometry-control-locked" data-control="${property}">
        <h3>${label}</h3><p>本題固定</p>
      </section>`;
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return `
    <section class="geometry-control" data-control="${property}">
      <h3>${label}</h3>
      <div class="geometry-scale-labels"><span>${start}</span><span>${end}</span></div>
      <input
        class="geometry-range"
        type="range"
        min="${minimum}"
        max="${maximum}"
        step="1"
        value="${current}"
        data-property="${property}"
        aria-label="${label}"
        data-allowed-values="${allowedValues.join(',')}"
      >
      <div class="geometry-scale-ticks" aria-hidden="true">
        ${values.map((value) => `<i class="${allowedValues.includes(value) ? '' : 'disabled'}"></i>`).join('')}
      </div>
    </section>`;
}

export class GeometryControlPanel {
  constructor({ container, engine, onVisualChange = () => {}, onStateChange = () => {} }) {
    this.container = container;
    this.engine = engine;
    this.onVisualChange = onVisualChange;
    this.onStateChange = onStateChange;
    this.render();
  }

  render() {
    const element = this.engine.getSelectedElement();
    if (!element) {
      this.container.innerHTML = '<div class="geometry-controls-empty">選取畫布中的元素後，即可使用本題開放的工具。</div>';
      return;
    }

    const controls = [];
    if (this.engine.canUse('move')) {
      controls.push('<div class="geometry-move-notice"><strong>移動</strong><span>直接在畫布中拖曳</span></div>');
    }
    if (this.engine.canUse('size')) {
      controls.push(scaleMarkup({
        property: 'size', label: '大小', start: '小', end: '大',
        values: SIZE_LEVELS, current: element.size,
        allowedValues: this.usableValues('size')
      }));
    }
    if (this.engine.canUse('color')) controls.push(this.colorMarkup(element));
    if (this.engine.canUse('lightness')) {
      controls.push(scaleMarkup({
        property: 'lightness', label: '深淺', start: '深', end: '淺',
        values: LIGHTNESS_LEVELS, current: element.lightness,
        allowedValues: this.usableValues('lightness')
      }));
    }
    if (this.engine.canUse('rotation')) controls.push(this.rotationMarkup(element));
    if (this.engine.canUse('proportion')) controls.push(this.proportionMarkup(element));

    const actions = [
      this.engine.canUse('duplicate') ? '<button type="button" class="secondary-button control-action" data-action="duplicate">複製</button>' : '',
      this.engine.canUse('delete') ? '<button type="button" class="secondary-button control-action" data-action="delete">刪除</button>' : '',
      this.engine.canUse('undo') ? '<button type="button" class="secondary-button control-action" data-action="undo">Undo</button>' : ''
    ].join('');

    this.container.innerHTML = `
      <div class="geometry-controls-body">${controls.join('')}</div>
      ${actions ? `<div class="geometry-control-actions">${actions}</div>` : ''}`;
    this.bindEvents();
  }

  usableValues(property) {
    const constraint = this.engine.getControlConstraint(property);
    return constraint.allowedValues.filter((value) => !constraint.lockedValues.includes(value));
  }

  colorMarkup(element) {
    const allowed = this.usableValues('hue');
    return `
      <section class="geometry-control geometry-color-control">
        <h3>色彩</h3>
        <div class="geometry-color-options">
          ${HUE_IDS.map((hue) => `
            <button
              type="button"
              class="geometry-color-option ${element.hue === hue ? 'selected' : ''}"
              data-property="hue"
              data-value="${hue}"
              ${allowed.includes(hue) ? '' : 'disabled'}
              aria-pressed="${element.hue === hue}"
            >
              <i style="--swatch:${getDisplayColor(hue, 3)}"></i><span>${HUE_LABELS[hue]}</span>
            </button>`).join('')}
        </div>
      </section>`;
  }

  rotationMarkup(element) {
    const allowed = this.usableValues('rotation');
    return `
      <section class="geometry-control geometry-rotation-control">
        <h3>方向</h3>
        <div class="geometry-angle-options">
          ${ROTATION_VALUES.map((rotation) => `
            <button
              type="button"
              class="geometry-angle ${element.rotation === rotation ? 'selected' : ''}"
              data-property="rotation"
              data-value="${rotation}"
              ${allowed.includes(rotation) ? '' : 'disabled'}
              aria-label="方向 ${rotation} 度"
              aria-pressed="${element.rotation === rotation}"
            ><i style="--angle:${rotation}deg"></i></button>`).join('')}
        </div>
      </section>`;
  }

  proportionMarkup(element) {
    const allowed = this.usableValues('proportion');
    const ratioLevel = element.ratioLevel ?? element.proportion;
    return `
      <section class="geometry-control geometry-proportion-control">
        <h3>比例</h3>
        <div class="geometry-proportion-options">
          ${PROPORTION_LEVELS.map((value) => `
            <button
              type="button"
              class="geometry-proportion ${ratioLevel === value ? 'selected' : ''}"
              data-property="ratioLevel"
              data-value="${value}"
              ${allowed.includes(value) ? '' : 'disabled'}
              aria-pressed="${ratioLevel === value}"
            >${value}×</button>`).join('')}
        </div>
      </section>`;
  }

  bindEvents() {
    this.container.querySelectorAll('.geometry-range').forEach((input) => {
      const property = input.dataset.property;
      const allowedValues = input.dataset.allowedValues.split(',').map(Number);
      const begin = () => this.engine.beginAdjustment(property);
      const preview = () => {
        const value = nearestAllowed(Number(input.value), allowedValues);
        input.value = String(value);
        this.engine.previewProperty(property, value);
        this.onVisualChange();
      };
      const commit = () => {
        this.engine.commitAdjustment();
        this.onStateChange();
      };
      let activePointerId = null;
      const previewFromPointer = (event) => {
        const rect = input.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        const index = Math.round(ratio * (allowedValues.length - 1));
        input.value = String(allowedValues[index]);
        preview();
      };
      input.addEventListener('pointerdown', (event) => {
        if (activePointerId !== null) return;
        event.preventDefault();
        activePointerId = event.pointerId;
        input.setPointerCapture(event.pointerId);
        begin();
        previewFromPointer(event);
      });
      input.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointerId) return;
        event.preventDefault();
        previewFromPointer(event);
      });
      input.addEventListener('pointerup', (event) => {
        if (event.pointerId !== activePointerId) return;
        previewFromPointer(event);
        activePointerId = null;
        if (input.hasPointerCapture(event.pointerId)) input.releasePointerCapture(event.pointerId);
        commit();
      });
      input.addEventListener('pointercancel', (event) => {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        this.engine.cancelAdjustment();
        this.onStateChange();
      });
      input.addEventListener('input', preview);
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        begin();
        const currentIndex = Math.max(0, allowedValues.indexOf(Number(input.value)));
        let nextIndex = currentIndex;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextIndex -= 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextIndex += 1;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = allowedValues.length - 1;
        nextIndex = Math.min(Math.max(nextIndex, 0), allowedValues.length - 1);
        input.value = String(allowedValues[nextIndex]);
        preview();
      });
      input.addEventListener('keyup', (event) => {
        if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          commit();
        }
      });
    });

    this.container.querySelectorAll('[data-property][data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const property = button.dataset.property;
        const rawValue = button.dataset.value;
        const value = property === 'hue' ? rawValue : Number(rawValue);
        this.engine.setProperty(property, value);
        this.onStateChange();
      });
    });

    this.container.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'duplicate') this.engine.duplicate();
        if (action === 'delete') this.engine.delete();
        if (action === 'undo') this.engine.undo();
        this.onStateChange();
      });
    });
  }
}
