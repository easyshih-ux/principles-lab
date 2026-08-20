export function snapValue(value, step) {
  return Math.round(value / step) * step;
}

export function snapPoint(point, step) {
  return {
    x: snapValue(point.x, step),
    y: snapValue(point.y, step)
  };
}
