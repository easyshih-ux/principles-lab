import { snapPoint } from './grid.js';
import { getLogicalSize } from './palette.js';

export function getShapeDimensions(element) {
  const size = Number.isFinite(element.logicalSize) ? element.logicalSize : getLogicalSize(element.size);
  switch (element.shape) {
    case 'rectangle':
      return { width: size * 1.5, height: size };
    case 'semicircle':
    case 'line':
      return { width: size * 1.5, height: size / 2 };
    default:
      return { width: size, height: size };
  }
}

export function getRotatedHalfExtents(element) {
  const { width, height } = getShapeDimensions(element);
  const radians = (element.rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return {
    x: (width * cosine + height * sine) / 2,
    y: (width * sine + height * cosine) / 2
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function gridSafeRange(minimum, maximum, step) {
  return {
    minimum: Math.ceil(minimum / step) * step,
    maximum: Math.floor(maximum / step) * step
  };
}

export function clampElementPosition(element, point, canvas, gridStep = null) {
  const half = getRotatedHalfExtents(element);
  let xRange = { minimum: half.x, maximum: canvas.width - half.x };
  let yRange = { minimum: half.y, maximum: canvas.height - half.y };

  if (gridStep) {
    xRange = gridSafeRange(xRange.minimum, xRange.maximum, gridStep);
    yRange = gridSafeRange(yRange.minimum, yRange.maximum, gridStep);
  }

  return {
    x: clamp(point.x, xRange.minimum, xRange.maximum),
    y: clamp(point.y, yRange.minimum, yRange.maximum)
  };
}

export function snapAndClampElementPosition(element, point, canvas, gridStep) {
  return clampElementPosition(
    element,
    snapPoint(point, gridStep),
    canvas,
    gridStep
  );
}
