const element = (id, values = {}) => Object.freeze({
  id,
  shape: 'circle',
  x: 500,
  y: 300,
  size: 2,
  hue: 'red',
  lightness: 3,
  rotation: 0,
  proportion: 1,
  isCore: false,
  ...values
});

const SIMPLICITY_INITIAL_ARTWORK = Object.freeze([
  element('simplicity-core-center', { size: 3, hue: 'yellow', isCore: true }),
  element('simplicity-core-petal-top', { shape: 'semicircle', y: 215, size: 2, hue: 'red', rotation: 90, isCore: true }),
  element('simplicity-core-petal-right', { shape: 'semicircle', x: 585, size: 2, hue: 'red', rotation: 180, isCore: true }),
  element('simplicity-core-petal-left', { shape: 'semicircle', x: 415, size: 2, hue: 'red', rotation: 0, isCore: true }),
  element('simplicity-core-petal-bottom', { shape: 'semicircle', y: 385, size: 2, hue: 'red', rotation: 270, isCore: true }),
  element('simplicity-core-stem', { shape: 'rectangle', y: 475, size: 3, hue: 'green', rotation: 90, isCore: true }),
  element('simplicity-decoration-dot-1', { x: 260, y: 170, size: 1, hue: 'blue' }),
  element('simplicity-decoration-dot-2', { x: 735, y: 190, size: 1, hue: 'orange' }),
  element('simplicity-decoration-square', { shape: 'square', x: 285, y: 430, size: 2, hue: 'blue', rotation: 45 }),
  element('simplicity-decoration-triangle', { shape: 'triangle', x: 735, y: 420, size: 2, hue: 'yellow', rotation: 135 })
]);

export const SIMPLICITY_CORE_ELEMENT_IDS = Object.freeze(
  SIMPLICITY_INITIAL_ARTWORK.filter((item) => item.isCore).map((item) => item.id)
);

export function createSimplicityInitialArtwork() {
  return SIMPLICITY_INITIAL_ARTWORK.map((item) => ({ ...item }));
}
