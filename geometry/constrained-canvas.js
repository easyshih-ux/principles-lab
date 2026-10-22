import { GeometryCanvas } from './canvas.js?v=gate4c-contrast-1';
import { createGridConfig } from './constrained-tools.js?v=gate4c-contrast-1';
import { getRotatedHalfExtents } from './bounds.js?v=gate4c-contrast-1';
import { screenToLogical } from './coordinates.js?v=geometry-aspect-1';

export class ConstrainedGeometryCanvas extends GeometryCanvas {
  constructor(options) {
    super(options);
    this.gridPresentation = createGridConfig(options.grid ?? options.engine?.grid);
    this.renderGridPresentation();
  }

  // ---- Gate 4C unit copy (only when the question turns on unitDuplicate) ----
  usesUnits() {
    return this.engine.canUse?.('unitDuplicate') && typeof this.engine.unitOf === 'function';
  }

  render() {
    super.render();
    if (!this.usesUnits()) return;
    // While a copied unit is grouped, the blue frame replaces the one-shape outline.
    const grouped = this.engine.groupIds?.includes(this.engine.selectedId);
    this.surface.querySelectorAll('[data-geometry-id]').forEach((node) => {
      node.style.outlineColor = grouped && node.classList.contains('selected') ? 'transparent' : '';
    });
    this.renderUnitFrame();
  }

  // Dashed frame: the unit a copy would take. Solid blue frame: a copied unit that moves as one.
  renderUnitFrame(delta = { x: 0, y: 0 }) {
    this.unitFrame?.remove();
    this.unitFrame = null;
    const selected = this.engine.getSelectedElement();
    if (!selected) return;
    const grouped = Boolean(this.engine.groupIds?.includes(selected.id));
    const ids = grouped ? this.engine.groupIds : this.engine.unitOf(selected.id);
    if (ids.length < 2) return;
    const members = this.engine.getState().elements.filter((element) => ids.includes(element.id));
    const box = members.reduce((acc, element) => {
      const half = getRotatedHalfExtents(element);
      return { minX: Math.min(acc.minX, element.x + delta.x - half.x), maxX: Math.max(acc.maxX, element.x + delta.x + half.x), minY: Math.min(acc.minY, element.y + delta.y - half.y), maxY: Math.max(acc.maxY, element.y + delta.y + half.y) };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const rect = this.surface.getBoundingClientRect();
    const sx = rect.width / this.engine.canvas.width;
    const sy = rect.height / this.engine.canvas.height;
    const pad = 7;
    const frame = document.createElement('i');
    frame.className = `geometry-unit-frame${grouped ? ' is-group' : ''}`;
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, {
      position: 'absolute', left: '0', top: '0', zIndex: '2', pointerEvents: 'none', boxSizing: 'border-box',
      width: `${(box.maxX - box.minX) * sx + pad * 2}px`, height: `${(box.maxY - box.minY) * sy + pad * 2}px`,
      transform: `translate(${box.minX * sx - pad}px, ${box.minY * sy - pad}px)`,
      border: grouped ? '3px solid var(--blue, #3E78B2)' : '2px dashed rgba(37,37,37,.7)', borderRadius: '10px'
    });
    this.surface.append(frame);
    this.unitFrame = frame;
  }

  onPointerDown(event) {
    const node = event.target.closest?.('[data-geometry-id]');
    const id = node?.dataset.geometryId;
    if (!this.usesUnits() || !id || !this.engine.groupIds?.includes(id) || !this.engine.canUse('move')) {
      super.onPointerDown(event);
      return;
    }
    if (this.activeDrag) {
      if (this.activeDrag.pointerId !== event.pointerId) return;
      this.finishDrag(event, false);
    }
    this.engine.select(id);
    this.render();
    this.onStateChange(this.engine.getState());
    this.surface.focus({ preventScroll: true });
    event.preventDefault();
    node.setPointerCapture(event.pointerId);
    const rect = this.surface.getBoundingClientRect();
    const ids = [...this.engine.groupIds];
    const nodes = ids.map((memberId) => this.surface.querySelector(`[data-geometry-id="${memberId}"]`)).filter(Boolean);
    nodes.forEach((member) => member.classList.add('dragging'));
    this.activeDrag = { group: true, pointerId: event.pointerId, id, node, ids, nodes, start: screenToLogical({ x: event.clientX, y: event.clientY }, rect, this.engine.canvas), delta: { x: 0, y: 0 } };
  }

  onPointerMove(event) {
    if (!this.activeDrag?.group) { super.onPointerMove(event); return; }
    if (event.pointerId !== this.activeDrag.pointerId) return;
    event.preventDefault();
    const rect = this.surface.getBoundingClientRect();
    const point = screenToLogical({ x: event.clientX, y: event.clientY }, rect, this.engine.canvas);
    const drag = this.activeDrag;
    drag.delta = this.engine.groupDelta(drag.ids, { x: point.x - drag.start.x, y: point.y - drag.start.y });
    const elements = this.engine.getState().elements;
    drag.nodes.forEach((member) => {
      const element = elements.find((item) => item.id === member.dataset.geometryId);
      if (element) this.updateElementNode(member, element, { x: element.x + drag.delta.x, y: element.y + drag.delta.y });
    });
    this.renderUnitFrame(drag.delta);
  }

  finishDrag(event, commit) {
    if (!this.activeDrag?.group) { super.finishDrag(event, commit); return; }
    if (event.pointerId !== this.activeDrag.pointerId) return;
    const drag = this.activeDrag;
    this.activeDrag = null;
    drag.nodes.forEach((member) => member.classList.remove('dragging'));
    if (drag.node.hasPointerCapture?.(event.pointerId)) drag.node.releasePointerCapture(event.pointerId);
    if (commit) this.engine.moveGroup(drag.ids, drag.delta);
    this.render();
    this.onStateChange(this.engine.getState());
  }

  renderGridPresentation() {
    const { enabled, visible, step, axis } = this.gridPresentation;
    if (!enabled || !visible) return;
    const xStep = (step / this.engine.canvas.width) * 100;
    const yStep = (step / this.engine.canvas.height) * 100;
    this.surface.style.backgroundColor = 'var(--surface)';
    this.surface.style.backgroundImage = [
      'linear-gradient(to right, rgba(37,37,37,.07) 1px, transparent 1px)',
      'linear-gradient(to bottom, rgba(37,37,37,.07) 1px, transparent 1px)'
    ].join(',');
    this.surface.style.backgroundSize = `${xStep}% ${yStep}%`;
    if (axis === 'vertical' || axis === 'cross') this.surface.append(this.axisNode('vertical'));
    if (axis === 'horizontal' || axis === 'cross') this.surface.append(this.axisNode('horizontal'));
  }

  axisNode(direction) {
    const axis = document.createElement('i');
    axis.className = `geometry-grid-axis geometry-grid-axis-${direction}`;
    axis.setAttribute('aria-hidden', 'true');
    Object.assign(axis.style, direction === 'vertical'
      ? { position: 'absolute', left: '50%', top: '0', bottom: '0', width: '1px' }
      : { position: 'absolute', left: '0', right: '0', top: '50%', height: '1px' });
    axis.style.background = 'rgba(37,37,37,.34)';
    axis.style.pointerEvents = 'none';
    return axis;
  }
}
