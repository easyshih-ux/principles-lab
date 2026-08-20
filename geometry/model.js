import { DEFAULT_ELEMENT_VALUES, GEOMETRY_SHAPES } from './config.js';

let idSequence = 0;

export function createElementId() {
  idSequence += 1;
  return `geometry-${Date.now().toString(36)}-${idSequence.toString(36)}`;
}

export function createGeometryElement(values = {}, idFactory = createElementId) {
  const element = {
    ...DEFAULT_ELEMENT_VALUES,
    ...values,
    id: values.id ?? idFactory()
  };

  assertGeometryElement(element);
  return element;
}

export function cloneElement(element) {
  return { ...element };
}

export function cloneElements(elements) {
  return elements.map(cloneElement);
}

export function assertGeometryElement(element) {
  if (!element?.id || typeof element.id !== 'string') {
    throw new TypeError('Geometry element requires a string id.');
  }
  if (!GEOMETRY_SHAPES.includes(element.shape)) {
    throw new TypeError(`Unsupported geometry shape: ${element.shape}`);
  }
  ['x', 'y', 'size', 'hue', 'lightness', 'rotation'].forEach((field) => {
    if (!Number.isFinite(element[field])) {
      throw new TypeError(`Geometry element ${field} must be finite.`);
    }
  });
  if (element.size <= 0) {
    throw new RangeError('Geometry element size must be greater than zero.');
  }
  return element;
}

export function assertUniqueIds(elements) {
  const ids = new Set(elements.map((element) => element.id));
  if (ids.size !== elements.length) {
    throw new Error('Geometry element ids must be unique.');
  }
}
