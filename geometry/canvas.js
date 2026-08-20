import { getShapeDimensions } from './bounds.js';
import { GEOMETRY_TOOLS } from './config.js';
import {
  logicalLengthToScreen,
  logicalToScreen,
  screenToLogical
} from './coordinates.js';

export class GeometryCanvas {
  constructor({ container, engine, onStateChange = () => {} }) {
    this.container = container;
    this.engine = engine;
    this.onStateChange = onStateChange;
    this.activeDrag = null;
    this.surface = document.createElement('div');
    this.surface.className = 'geometry-canvas';
    this.surface.tabIndex = 0;
    this.surface.setAttribute('role', 'application');
    this.surface.setAttribute('aria-label', '幾何實驗畫布');
    this.container.replaceChildren(this.surface);
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.surface.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.surface.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.surface.addEventListener('pointerup', (event) => this.finishDrag(event, true));
    this.surface.addEventListener('pointercancel', (event) => this.finishDrag(event, false));
    this.surface.addEventListener('lostpointercapture', (event) => this.finishDrag(event, false));
    this.surface.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  render() {
    const state = this.engine.getState();
    const existing = new Map(
      [...this.surface.querySelectorAll('[data-geometry-id]')]
        .map((node) => [node.dataset.geometryId, node])
    );

    state.elements.forEach((element) => {
      let node = existing.get(element.id);
      if (!node) {
        node = this.createElementNode(element);
        this.surface.append(node);
      }
      existing.delete(element.id);
      this.updateElementNode(node, element);
      node.classList.toggle('selected', state.selectedId === element.id);
      node.setAttribute('aria-pressed', String(state.selectedId === element.id));
    });
    existing.forEach((node) => node.remove());
  }

  createElementNode(element) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'geometry-element';
    node.dataset.geometryId = element.id;
    node.innerHTML = '<span class="geometry-shape" aria-hidden="true"></span>';
    return node;
  }

  updateElementNode(node, element, position = element) {
    const rect = this.surface.getBoundingClientRect();
    const screen = logicalToScreen(position, rect, this.engine.canvas);
    const dimensions = getShapeDimensions(element);
    const width = logicalLengthToScreen(dimensions.width, rect, this.engine.canvas, 'x');
    const height = logicalLengthToScreen(dimensions.height, rect, this.engine.canvas, 'y');
    node.className = `geometry-element shape-${element.shape}${node.classList.contains('selected') ? ' selected' : ''}`;
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.style.transform = `translate(${screen.x - width / 2}px, ${screen.y - height / 2}px) rotate(${element.rotation}deg)`;
    node.style.setProperty('--geometry-hue', element.hue);
    node.style.setProperty('--geometry-lightness', `${element.lightness}%`);
    node.setAttribute('aria-label', `${element.shape}，位置 ${element.x}, ${element.y}`);
  }

  onPointerDown(event) {
    if (this.activeDrag) {
      if (this.activeDrag.pointerId !== event.pointerId) return;
      this.finishDrag(event, false);
    }
    const elementNode = event.target.closest('[data-geometry-id]');
    if (!elementNode) {
      this.engine.clearSelection();
      this.render();
      this.onStateChange(this.engine.getState());
      return;
    }

    const id = elementNode.dataset.geometryId;
    this.engine.select(id);
    this.render();
    this.onStateChange(this.engine.getState());
    this.surface.focus({ preventScroll: true });
    if (!this.engine.canUse(GEOMETRY_TOOLS.move)) return;

    event.preventDefault();
    elementNode.setPointerCapture(event.pointerId);
    const element = this.engine.getSelectedElement();
    this.activeDrag = {
      pointerId: event.pointerId,
      id,
      node: elementNode,
      origin: { x: element.x, y: element.y },
      preview: { x: element.x, y: element.y }
    };
    elementNode.classList.add('dragging');
  }

  onPointerMove(event) {
    if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) return;
    event.preventDefault();
    const rect = this.surface.getBoundingClientRect();
    const point = screenToLogical({ x: event.clientX, y: event.clientY }, rect, this.engine.canvas);
    const preview = this.engine.previewPosition(this.activeDrag.id, point);
    if (!preview) return;
    this.activeDrag.preview = preview;
    const element = this.engine.getSelectedElement();
    this.updateElementNode(this.activeDrag.node, element, preview);
  }

  finishDrag(event, commit) {
    if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) return;
    const drag = this.activeDrag;
    this.activeDrag = null;
    drag.node.classList.remove('dragging');
    if (drag.node.hasPointerCapture?.(event.pointerId)) {
      drag.node.releasePointerCapture(event.pointerId);
    }
    if (commit) {
      this.engine.move(drag.id, drag.preview);
    }
    this.render();
    this.onStateChange(this.engine.getState());
  }

  onKeyDown(event) {
    const selected = this.engine.getSelectedElement();
    if (!selected) return;
    const steps = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (steps[event.key] && this.engine.canUse(GEOMETRY_TOOLS.move)) {
      event.preventDefault();
      const [xStep, yStep] = steps[event.key];
      this.engine.move(selected.id, {
        x: selected.x + xStep * this.engine.grid.step,
        y: selected.y + yStep * this.engine.grid.step
      });
      this.render();
      this.onStateChange(this.engine.getState());
    }
    if ((event.key === 'Delete' || event.key === 'Backspace')
      && this.engine.canUse(GEOMETRY_TOOLS.delete)) {
      event.preventDefault();
      this.engine.delete(selected.id);
      this.render();
      this.onStateChange(this.engine.getState());
    }
  }

  destroy() {
    this.container.replaceChildren();
  }
}
