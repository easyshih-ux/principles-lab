import {
  DEFAULT_ELEMENT_VALUES,
  GEOMETRY_CANVAS,
  GEOMETRY_GRID,
  GEOMETRY_TOOLS
} from './config.js';
import {
  assertUniqueIds,
  cloneElements,
  createElementId,
  createGeometryElement
} from './model.js';
import {
  clampElementPosition,
  snapAndClampElementPosition
} from './bounds.js';

function cloneSnapshot(snapshot) {
  return {
    elements: cloneElements(snapshot.elements),
    selectedId: snapshot.selectedId
  };
}

export class GeometryEngine {
  constructor({
    elements = [],
    allowedTools = [],
    canvas = GEOMETRY_CANVAS,
    grid = GEOMETRY_GRID,
    idFactory = createElementId
  } = {}) {
    assertUniqueIds(elements);
    this.canvas = { ...canvas };
    this.grid = { ...grid };
    this.allowedTools = new Set(allowedTools);
    this.idFactory = idFactory;
    this.elements = cloneElements(elements);
    this.selectedId = null;
    this.history = [];
  }

  canUse(tool) {
    return this.allowedTools.has(tool);
  }

  getState() {
    return {
      elements: cloneElements(this.elements),
      selectedId: this.selectedId
    };
  }

  getSelectedElement() {
    return this.elements.find((element) => element.id === this.selectedId) ?? null;
  }

  select(id) {
    this.selectedId = this.elements.some((element) => element.id === id) ? id : null;
    return this.getState();
  }

  clearSelection() {
    this.selectedId = null;
    return this.getState();
  }

  add(shape, values = {}) {
    if (!this.canUse(GEOMETRY_TOOLS.add)) return this.unauthorized();
    const element = createGeometryElement(
      { ...DEFAULT_ELEMENT_VALUES, ...values, shape },
      this.idFactory
    );
    const position = snapAndClampElementPosition(
      element,
      element,
      this.canvas,
      this.grid.step
    );
    Object.assign(element, position);
    this.elements.push(element);
    this.selectedId = element.id;
    return this.changed('add');
  }

  previewPosition(id, point) {
    const element = this.elements.find((item) => item.id === id);
    if (!element) return null;
    return clampElementPosition(element, point, this.canvas);
  }

  move(id, point) {
    if (!this.canUse(GEOMETRY_TOOLS.move)) return this.unauthorized();
    const element = this.elements.find((item) => item.id === id);
    if (!element) return this.unchanged('not-found');
    const position = snapAndClampElementPosition(
      element,
      point,
      this.canvas,
      this.grid.step
    );
    if (position.x === element.x && position.y === element.y) {
      return this.unchanged('same-position');
    }
    const before = this.snapshot();
    Object.assign(element, position);
    this.selectedId = id;
    this.record('move', before);
    return this.changed('move');
  }

  duplicate(id = this.selectedId) {
    if (!this.canUse(GEOMETRY_TOOLS.duplicate)) return this.unauthorized();
    const source = this.elements.find((element) => element.id === id);
    if (!source) return this.unchanged('not-found');
    const before = this.snapshot();
    const duplicate = createGeometryElement(
      {
        ...source,
        id: this.idFactory(),
        x: source.x + this.grid.step * 2,
        y: source.y + this.grid.step * 2
      },
      this.idFactory
    );
    Object.assign(
      duplicate,
      snapAndClampElementPosition(duplicate, duplicate, this.canvas, this.grid.step)
    );
    this.elements.push(duplicate);
    this.selectedId = duplicate.id;
    this.record('duplicate', before);
    return this.changed('duplicate');
  }

  delete(id = this.selectedId) {
    if (!this.canUse(GEOMETRY_TOOLS.delete)) return this.unauthorized();
    const index = this.elements.findIndex((element) => element.id === id);
    if (index < 0) return this.unchanged('not-found');
    const before = this.snapshot();
    this.elements.splice(index, 1);
    this.selectedId = null;
    this.record('delete', before);
    return this.changed('delete');
  }

  undo() {
    if (!this.canUse(GEOMETRY_TOOLS.undo)) return this.unauthorized();
    const entry = this.history.pop();
    if (!entry) return this.unchanged('empty-history');
    this.restore(entry.before);
    return { changed: true, operation: 'undo', undoneOperation: entry.type, state: this.getState() };
  }

  snapshot() {
    return cloneSnapshot(this.getState());
  }

  restore(snapshot) {
    this.elements = cloneElements(snapshot.elements);
    this.selectedId = snapshot.selectedId;
  }

  record(type, before) {
    this.history.push({
      type,
      before: cloneSnapshot(before),
      after: this.snapshot()
    });
  }

  changed(operation) {
    return { changed: true, operation, state: this.getState() };
  }

  unchanged(reason) {
    return { changed: false, reason, state: this.getState() };
  }

  unauthorized() {
    return this.unchanged('tool-not-allowed');
  }
}
