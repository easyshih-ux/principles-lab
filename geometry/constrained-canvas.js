import { GeometryCanvas } from './canvas.js?v=geometry-aspect-1';
import { createGridConfig } from './constrained-tools.js';

export class ConstrainedGeometryCanvas extends GeometryCanvas {
  constructor(options) {
    super(options);
    this.gridPresentation = createGridConfig(options.grid ?? options.engine?.grid);
    this.renderGridPresentation();
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
