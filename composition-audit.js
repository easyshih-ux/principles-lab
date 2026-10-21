const POSITION_TOLERANCE = 1;

// These periods mirror the actual CSS geometry in styles.css and the rotation
// applied by GeometryCanvas. Circle rotation never changes its outline; square
// repeats every quarter turn; rectangles and lines repeat every half turn.
// The rendered triangle and semicircle keep a full-turn visual direction.
const VISUAL_ROTATION_PERIOD = Object.freeze({
  circle: 0,
  square: 90,
  triangle: 360,
  rectangle: 180,
  semicircle: 360,
  line: 180
});

function visualRotation(element) {
  const period = VISUAL_ROTATION_PERIOD[element.shape] ?? 360;
  if (period === 0) return 0;
  const rotation = Number(element.rotation ?? 0);
  return ((rotation % period) + period) % period;
}

function visualSize(element) {
  if (element.logicalSize != null) return `logical:${element.logicalSize}`;
  if (element.ratioLevel != null) return `ratio:${element.ratioLevel}`;
  return `size:${element.size}`;
}

function visualSignature(element) {
  return [
    element.shape,
    visualSize(element),
    visualRotation(element),
    element.hueFamily ?? element.hue,
    element.stepLightness != null ? `step:${element.stepLightness}` : (element.lightnessLevel ?? element.lightness),
    element.lineStyle ?? 'solid'
  ].join('|');
}

function sameVisiblePlacement(first, second, tolerance) {
  return visualSignature(first) === visualSignature(second)
    && Math.abs(first.x - second.x) <= tolerance
    && Math.abs(first.y - second.y) <= tolerance;
}

export function auditComposition(elements = [], options = {}) {
  const tolerance = options.positionTolerance ?? POSITION_TOLERANCE;
  const preservedIds = new Set(options.preserveElementIds ?? []);
  const groups = [];

  for (const element of elements) {
    const group = groups.find((candidate) => sameVisiblePlacement(candidate[0], element, tolerance));
    if (group) group.push(element);
    else groups.push([element]);
  }

  const effectiveElements = [];
  const duplicateElementIds = [];
  const overlapGroups = [];
  for (const group of groups) {
    const preserved = group.filter((item) => preservedIds.has(item.id));
    const ordinary = group.filter((item) => !preservedIds.has(item.id));
    effectiveElements.push(...preserved);
    if (ordinary.length) effectiveElements.push(ordinary[0]);
    const duplicates = ordinary.slice(1);
    duplicateElementIds.push(...duplicates.map((item) => item.id));
    if (group.length > 1) overlapGroups.push(group.map((item) => item.id));
  }

  const largestOverlapGroup = Math.max(0, ...overlapGroups.map((group) => group.length));
  const hasObviousPadding = largestOverlapGroup >= 3 || duplicateElementIds.length >= 2;
  return {
    rawElementCount: elements.length,
    effectiveElementCount: effectiveElements.length,
    effectiveElements,
    duplicateElementIds,
    overlapGroups,
    largestOverlapGroup,
    hasObviousPadding,
    diagnosticCode: hasObviousPadding ? 'EXCESSIVE_OVERLAP' : null,
    studentMessage: hasObviousPadding
      ? '有些圖形完全疊在一起了，試著移開一點，讓每個圖形都看得見。'
      : null
  };
}
