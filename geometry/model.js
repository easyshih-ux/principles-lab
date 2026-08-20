import {
  DEFAULT_ELEMENT_VALUES,
  GEOMETRY_SHAPES,
  HUE_IDS,
  LIGHTNESS_LEVELS,
  PROPORTION_LEVELS,
  ROTATION_VALUES,
  SIZE_LEVELS
} from './config.js';

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
  ['x', 'y'].forEach((field) => {
    if (!Number.isFinite(element[field])) {
      throw new TypeError(`Geometry element ${field} must be finite.`);
    }
  });
  assertAllowedValue('size', element.size, SIZE_LEVELS);
  assertAllowedValue('hue', element.hue, HUE_IDS);
  assertAllowedValue('lightness', element.lightness, LIGHTNESS_LEVELS);
  assertAllowedValue('rotation', element.rotation, ROTATION_VALUES);
  assertAllowedValue('proportion', element.proportion, PROPORTION_LEVELS);
  return element;
}

function assertAllowedValue(field, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new RangeError(`Invalid geometry ${field}: ${value}`);
  }
}

export function assertUniqueIds(elements) {
  const ids = new Set(elements.map((element) => element.id));
  if (ids.size !== elements.length) {
    throw new Error('Geometry element ids must be unique.');
  }
}
