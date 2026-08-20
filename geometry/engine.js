import {
  DEFAULT_ELEMENT_VALUES,
  GEOMETRY_CANVAS,
  GEOMETRY_GRID,
  GEOMETRY_TOOLS
} from './config.js';
import {
  assertGeometryElement,
  assertUniqueIds,
  cloneElements,
  createElementId,
  createGeometryElement
} from './model.js';
import {
  clampElementPosition,
  snapAndClampElementPosition
} from './bounds.js';
import {
  CONTROL_DEFINITIONS,
  isControlValueAllowed,
  normalizeToolConstraints
} from './controls.js';

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
    idFactory = createElementId,
    toolConstraints = {}
  } = {}) {
    elements.forEach(assertGeometryElement);
    assertUniqueIds(elements);
    this.canvas = { ...canvas };
    this.grid = { ...grid };
    this.allowedTools = new Set(allowedTools);
    this.toolConstraints = normalizeToolConstraints(toolConstraints);
    this.idFactory = idFactory;
    this.elements = cloneElements(elements);
    this.selectedId = null;
    this.history = [];
    this.activeAdjustment = null;
  }

  canUse(tool) {
    return this.allowedTools.has(tool);
  }

  setAllowedTools(allowedTools) {
    this.allowedTools = new Set(allowedTools);
    return this.getState();
  }

  setToolConstraints(toolConstraints) {
    this.toolConstraints = normalizeToolConstraints(toolConstraints);
    return this.getState();
  }

  getControlConstraint(property) {
    const constraint = this.toolConstraints[property];
    return constraint
      ? { ...constraint, allowedValues: [...constraint.allowedValues], lockedValues: [...constraint.lockedValues] }
      : null;
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

  setProperty(property, value, id = this.selectedId) {
    const check = this.checkPropertyChange(property, value, id);
    if (check.result) return check.result;
    if (check.element[property] === value) return this.unchanged('same-value');
    const before = this.snapshot();
    this.applyProperty(check.element, property, value);
    this.record(`${property}-change`, before);
    return this.changed(`${property}-change`);
  }

  beginAdjustment(property, id = this.selectedId) {
    const definition = CONTROL_DEFINITIONS[property];
    if (!definition || !this.canUse(definition.tool)) return this.unauthorized();
    const element = this.elements.find((item) => item.id === id);
    if (!element) return this.unchanged('not-found');
    if (!this.activeAdjustment) {
      this.activeAdjustment = { property, id, before: this.snapshot() };
    }
    return this.unchanged('adjustment-started');
  }

  previewProperty(property, value, id = this.selectedId) {
    const check = this.checkPropertyChange(property, value, id);
    if (check.result) return check.result;
    if (!this.activeAdjustment) this.beginAdjustment(property, id);
    if (!this.activeAdjustment
      || this.activeAdjustment.property !== property
      || this.activeAdjustment.id !== id) {
      return this.unchanged('adjustment-conflict');
    }
    this.applyProperty(check.element, property, value);
    return this.changed(`${property}-preview`);
  }

  commitAdjustment() {
    const adjustment = this.activeAdjustment;
    this.activeAdjustment = null;
    if (!adjustment) return this.unchanged('no-adjustment');
    const beforeElement = adjustment.before.elements.find(
      (element) => element.id === adjustment.id
    );
    const current = this.elements.find((element) => element.id === adjustment.id);
    if (!beforeElement || !current || beforeElement[adjustment.property] === current[adjustment.property]) {
      return this.unchanged('same-value');
    }
    this.record(`${adjustment.property}-change`, adjustment.before);
    return this.changed(`${adjustment.property}-change`);
  }

  cancelAdjustment() {
    if (!this.activeAdjustment) return this.unchanged('no-adjustment');
    const before = this.activeAdjustment.before;
    this.activeAdjustment = null;
    this.restore(before);
    return this.changed('adjustment-cancelled');
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

  checkPropertyChange(property, value, id) {
    const definition = CONTROL_DEFINITIONS[property];
    if (!definition) return { result: this.unchanged('unknown-property') };
    if (!this.canUse(definition.tool)) return { result: this.unauthorized() };
    if (!isControlValueAllowed(property, value, this.toolConstraints)) {
      return { result: this.unchanged('value-not-allowed') };
    }
    const element = this.elements.find((item) => item.id === id);
    return element ? { element } : { result: this.unchanged('not-found') };
  }

  applyProperty(element, property, value) {
    element[property] = value;
    if (property === 'size' || property === 'rotation') {
      Object.assign(
        element,
        snapAndClampElementPosition(element, element, this.canvas, this.grid.step)
      );
    }
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
