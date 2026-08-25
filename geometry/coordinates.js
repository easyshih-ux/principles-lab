export function logicalToScreen(point, rect, canvas) {
  return {
    x: (point.x / canvas.width) * rect.width,
    y: (point.y / canvas.height) * rect.height
  };
}

export function screenToLogical(point, rect, canvas) {
  return {
    x: ((point.x - rect.left) / rect.width) * canvas.width,
    y: ((point.y - rect.top) / rect.height) * canvas.height
  };
}

export function logicalLengthToScreen(length, rect, canvas, axis = 'x') {
  const logicalLength = axis === 'y' ? canvas.height : canvas.width;
  const screenLength = axis === 'y' ? rect.height : rect.width;
  return (length / logicalLength) * screenLength;
}

export function logicalScaleToScreen(rect, canvas) {
  return Math.min(rect.width / canvas.width, rect.height / canvas.height);
}
