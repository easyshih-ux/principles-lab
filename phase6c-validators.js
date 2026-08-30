import { getLogicalSize } from './geometry/palette.js';
import { areNeighborHues, getShapeMetadata, HUE_FAMILIES } from './geometry/constrained-tools.js';

function response(passed, code, metrics, detectedMethods = []) {
  const fulfilledConditions = passed ? ['指定形式原理已成立'] : [];
  const missingConditions = passed ? [] : ['構圖仍需要調整'];
  return {
    passed, isValid: passed, code: passed ? 'valid' : code,
    primaryDiagnosticCode: passed ? 'valid' : code,
    fulfilledConditions, missingConditions,
    feedback: passed ? ['✓ 指定形式原理已成立'] : ['△ 構圖仍需要調整'],
    metrics, detectedMethods
  };
}

function signature(element, fields) {
  return fields.map((field) => `${field}:${element[field]}`).join('|');
}

export function validateFormalRepetition({ elements = [], spec = {} }) {
  const fields = spec.signatureFields ?? ['shape', 'size', 'hue', 'lightness', 'rotation'];
  const required = spec.minimumOccurrences ?? 3;
  const counts = new Map();
  elements.forEach((item) => counts.set(signature(item, fields), (counts.get(signature(item, fields)) ?? 0) + 1));
  const maximumSingle = Math.max(0, ...counts.values());
  const pairPatterns = new Map();
  if (spec.allowGroupUnit !== false) {
    for (let firstIndex = 0; firstIndex < elements.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < elements.length; secondIndex += 1) {
        let first = elements[firstIndex];
        let second = elements[secondIndex];
        const firstSignature = signature(first, fields);
        const secondSignature = signature(second, fields);
        if (firstSignature === secondSignature) continue;
        if (firstSignature > secondSignature) [first, second] = [second, first];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        if (distance > (spec.groupDistance ?? 180)) continue;
        const tolerance = spec.groupOffsetTolerance ?? 20;
        const dx = Math.round((second.x - first.x) / tolerance);
        const dy = Math.round((second.y - first.y) / tolerance);
        const key = `${signature(first, fields)}+${signature(second, fields)}@${dx},${dy}`;
        const groups = pairPatterns.get(key) ?? [];
        groups.push([first.id, second.id]);
        pairPatterns.set(key, groups);
      }
    }
  }
  const maximumGroup = Math.max(0, ...[...pairPatterns.values()].map((groups) => groups.length));
  const metrics = { requiredOccurrences: required, maximumSingle, maximumGroup };
  if (maximumGroup >= required) return response(true, 'valid', metrics, ['group']);
  if (maximumSingle >= required) return response(true, 'valid', metrics, ['single']);
  const nearRepeat = Math.max(maximumSingle, maximumGroup);
  const code = nearRepeat === 2 ? 'NOT_ENOUGH_REPETITION'
    : elements.length >= 4 ? 'INCONSISTENT_REPEAT' : 'NO_REPEAT_UNIT';
  return response(false, code, metrics);
}

function trendFromDifferences(differences) {
  if (!differences.length) return { direction: null, turnCount: 0 };
  const signs = differences.map(Math.sign);
  if (signs.some((sign) => sign === 0)) return { direction: null, turnCount: 0 };
  const runs = signs.filter((sign, index) => index === 0 || sign !== signs[index - 1]);
  const turnCount = Math.max(0, runs.length - 1);
  if (runs.length === 1) {
    return { direction: runs[0] > 0 ? 'ascending' : 'descending', turnCount };
  }
  if (runs.length === 2) {
    return { direction: runs[0] > 0 ? 'single-peak' : 'single-valley', turnCount };
  }
  return { direction: null, turnCount };
}

function gradationTrend(values) {
  if (values.length < 2) return { direction: null, turnCount: 0 };
  return trendFromDifferences(values.slice(1).map((value, index) => value - values[index]));
}

function hueGradationTrend(hues, maximumStep = 1) {
  const indexes = hues.map((hue) => HUE_FAMILIES.indexOf(hue));
  if (indexes.length < 2 || indexes.some((index) => index < 0)) {
    return { direction: null, turnCount: 0, steps: [], range: 0 };
  }
  const count = HUE_FAMILIES.length;
  const steps = indexes.slice(1).map((index, position) => {
    const raw = index - indexes[position];
    return ((raw + count / 2) % count + count) % count - count / 2;
  });
  if (steps.some((step) => step === 0 || Math.abs(step) > maximumStep)) {
    return { direction: null, turnCount: 0, steps, range: 0 };
  }
  const trend = trendFromDifferences(steps);
  const cumulative = steps.reduce((positions, step) => [...positions, positions.at(-1) + step], [0]);
  return { ...trend, steps, range: range(cumulative) };
}

function range(values) {
  return values.length ? Math.max(...values) - Math.min(...values) : 0;
}

export function validateFormalGradation({ elements = [], spec = {} }) {
  const ordered = [...elements].sort((a, b) => a.x - b.x || a.y - b.y);
  const minimumStages = spec.minimumStages ?? 4;
  const values = {
    size: ordered.map((item) => item.size),
    lightness: ordered.map((item) => item.lightness),
    hue: ordered.map((item) => item.hueFamily ?? item.hue),
    spacing: ordered.slice(1).map((item, index) => item.x - ordered[index].x)
  };
  const thresholds = {
    size: spec.minimumSizeRange ?? 2,
    lightness: spec.minimumLightnessRange ?? 2,
    hue: spec.minimumHueRange ?? 2,
    spacing: spec.minimumSpacingRange ?? 35
  };
  const modes = {};
  for (const mode of spec.allowedModes ?? ['size', 'lightness', 'hue', 'spacing']) {
    const enough = ordered.length >= minimumStages && (mode !== 'spacing' || values.spacing.length >= minimumStages - 1);
    const trend = mode === 'hue'
      ? hueGradationTrend(values.hue, spec.maximumHueStep ?? 1)
      : gradationTrend(values[mode]);
    const modeRange = mode === 'hue' ? trend.range : range(values[mode]);
    modes[mode] = { values: values[mode], ...trend, range: modeRange, enough };
    modes[mode].passed = enough && Boolean(modes[mode].direction) && modes[mode].range >= thresholds[mode];
  }
  const detected = Object.entries(modes).filter(([, data]) => data.passed).map(([mode]) => mode);
  const metrics = { modes, stageCount: ordered.length };
  if (detected.length) return response(true, 'valid', metrics, detected.length > 1 ? ['multiple', ...detected] : detected);
  if (ordered.length < minimumStages) return response(false, 'TOO_FEW_STAGES', metrics);
  const changing = Object.values(modes).filter((data) => new Set(data.values).size > 1);
  if (changing.some((data) => !data.direction)) return response(false, 'DIRECTION_BREAK', metrics);
  if (changing.some((data) => data.direction && data.range > 0)) return response(false, 'CHANGE_TOO_SUBTLE', metrics);
  return response(false, 'NO_CLEAR_GRADATION', metrics);
}

function area(element) {
  const size = element.logicalSize ?? getLogicalSize(element.size);
  const factors = { circle: 0.79, triangle: 0.5, semicircle: 0.59, line: 0.12 };
  return size * size * (factors[element.shape] ?? 1);
}

function balanceVisualWeight(element) {
  return Math.sqrt(area(element));
}

function isMirror(left, right, axis, spec = {}) {
  if (left.length !== right.length || !left.length) return false;
  const positionTolerance = spec.mirrorPositionTolerance ?? 24;
  const yTolerance = spec.mirrorYTolerance ?? 24;
  const sizeTolerance = spec.mirrorSizeTolerance ?? 12;
  const sizeOf = (item) => item.logicalSize ?? getLogicalSize(item.size);
  const candidates = left.map((item) => right.map((other, index) => ({ other, index })).filter(({ other }) => (
    item.shape === other.shape
    && Math.abs(sizeOf(item) - sizeOf(other)) <= sizeTolerance
    && Math.abs(item.y - other.y) <= yTolerance
    && Math.abs(Math.abs(item.x - axis) - Math.abs(other.x - axis)) <= positionTolerance
  )).map(({ index }) => index));
  const match = (leftIndex, used) => leftIndex === candidates.length || candidates[leftIndex].some((rightIndex) => {
    if (used.has(rightIndex)) return false;
    used.add(rightIndex);
    if (match(leftIndex + 1, used)) return true;
    used.delete(rightIndex);
    return false;
  });
  return match(0, new Set());
}

export function validateFormalBalance({ elements = [], spec = {} }) {
  const axis = spec.symmetryAxis ?? 500;
  const deadZone = spec.centerDeadZone ?? 45;
  const tolerance = spec.balanceTolerance ?? 0.45;
  const outside = elements.filter((item) => Math.abs(item.x - axis) > deadZone);
  const left = outside.filter((item) => item.x < axis);
  const right = outside.filter((item) => item.x > axis);
  const visualWeight = (item) => balanceVisualWeight(item);
  const balanceMoment = (item) => visualWeight(item) * Math.sqrt(Math.abs(item.x - axis));
  const leftVisualWeight = left.reduce((sum, item) => sum + visualWeight(item), 0);
  const rightVisualWeight = right.reduce((sum, item) => sum + visualWeight(item), 0);
  const leftWeight = left.reduce((sum, item) => sum + balanceMoment(item), 0);
  const rightWeight = right.reduce((sum, item) => sum + balanceMoment(item), 0);
  const total = leftWeight + rightWeight;
  const differenceRatio = total ? Math.abs(leftWeight - rightWeight) / total : 1;
  const mirrored = isMirror(left, right, axis, spec);
  const metrics = { leftVisualWeight, rightVisualWeight, leftWeight, rightWeight, differenceRatio, tolerance, isMirror: mirrored, outsideDeadZone: outside.length };
  if (!outside.length) return response(false, 'TOO_CENTERED', metrics);
  if (!left.length || !right.length) return response(false, 'ONE_SIDE_EMPTY', metrics);
  if (mirrored && spec.requireAsymmetry) return response(false, 'ASYMMETRY_REQUIRED', metrics);
  if (differenceRatio > tolerance) return response(false, leftWeight > rightWeight ? 'LEFT_HEAVY' : 'RIGHT_HEAVY', metrics);
  const method = mirrored ? 'symmetrical' : 'asymmetrical';
  return response(true, 'valid', metrics, [method]);
}


function median(values) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function rhythmPathMetrics(ordered, spec) {
  const xGaps = ordered.slice(1).map((item, index) => item.x - ordered[index].x);
  const ySteps = ordered.slice(1).map((item, index) => Math.abs(item.y - ordered[index].y));
  const slopes = ySteps.map((step, index) => xGaps[index] > 0 ? step / xGaps[index] : Infinity);
  const medianGap = median(xGaps);
  const maximumGap = Math.max(0, ...xGaps);
  const xSpan = ordered.length > 1 ? ordered.at(-1).x - ordered[0].x : 0;
  const maximumSlope = Math.max(0, ...slopes);
  const averageSlope = slopes.length ? slopes.reduce((sum, value) => sum + value, 0) / slopes.length : 0;
  const gapRatio = medianGap > 0 ? maximumGap / medianGap : Infinity;
  const traceable = ordered.length >= 3
    && xGaps.every((gap) => gap > 0)
    && xSpan >= (spec.minimumReadingSpan ?? 280)
    && gapRatio <= (spec.maximumGapRatio ?? 2.5)
    && maximumSlope <= (spec.maximumPathSlope ?? 2.25)
    && averageSlope <= (spec.maximumAveragePathSlope ?? 1.35);
  return { traceable, xSpan, medianGap, gapRatio, maximumSlope, averageSlope };
}

export function validateFormalRhythm({ elements = [], spec = {} }) {
  const ordered = [...elements].sort((a, b) => a.x - b.x || a.y - b.y);
  const y = ordered.map((item) => item.y);
  const rotation = ordered.map((item) => item.rotation);
  const size = ordered.map((item) => item.size);
  const spacing = ordered.slice(1).map((item, index) => item.x - ordered[index].x);
  const path = rhythmPathMetrics(ordered, spec);
  const channels = {
    position: path.traceable && range(y) >= (spec.minimumYRange ?? 80),
    rotation: path.traceable && range(rotation) >= (spec.minimumRotationRange ?? 90),
    size: path.traceable && range(size) >= (spec.minimumSizeRange ?? 2),
    spacing: path.traceable && range(spacing) >= (spec.minimumSpacingRange ?? 35)
  };
  const detected = Object.entries(channels).filter(([, passed]) => passed).map(([mode]) => mode);
  const staticRepetition = ordered.length >= 3 && range(y) === 0 && range(rotation) === 0 && range(size) === 0 && range(spacing) < 10;
  const totalVariation = range(y) + range(rotation) + range(size) * 30 + range(spacing);
  const metrics = { channels, path, yRange: range(y), rotationRange: range(rotation), sizeRange: range(size), spacingRange: range(spacing), totalVariation };
  if (ordered.length < (spec.minimumElements ?? 5)) return response(false, 'CHANGE_TOO_SUBTLE', metrics);
  if (staticRepetition) return response(false, 'STATIC_REPETITION', metrics);
  if (detected.length) return response(true, 'valid', metrics, detected.length > 1 ? ['mixed', ...detected] : detected);
  if (totalVariation < 70) return response(false, 'CHANGE_TOO_SUBTLE', metrics);
  return response(false, path.traceable ? 'NO_CLEAR_MOTION' : 'TOO_RANDOM', metrics);
}


const directionalPeriods = Object.freeze({ triangle: 360, semicircle: 360, rectangle: 180, line: 180 });
const normalizeAngle = (angle, period = 360) => ((angle % period) + period) % period;
function mirrorRotation(element, axis) {
  const period = directionalPeriods[element.shape];
  if (!period) return null;
  const rotation = element.rotation ?? 0;
  return normalizeAngle(axis === 'vertical' ? -rotation : 180 - rotation, period);
}
function attributesMatch(source, target, axis) {
  if (source.shape !== target.shape || source.size !== target.size) return false;
  const expected = mirrorRotation(source, axis);
  return expected == null || normalizeAngle(target.rotation ?? 0, directionalPeriods[source.shape]) === expected;
}
function axisAudit(elements, axis, spec) {
  const tolerance = spec.positionTolerance ?? 1;
  const axisX = spec.axisX ?? 500;
  const axisY = spec.axisY ?? 300;
  let positionMismatch = false;
  let attributeMismatch = false;
  let missing = false;
  for (const source of elements) {
    const expected = axis === 'vertical' ? { x: 2 * axisX - source.x, y: source.y } : { x: source.x, y: 2 * axisY - source.y };
    const atPosition = elements.filter((target) => Math.abs(target.x - expected.x) <= tolerance && Math.abs(target.y - expected.y) <= tolerance);
    if (atPosition.some((target) => attributesMatch(source, target, axis))) continue;
    if (atPosition.length) { attributeMismatch = true; continue; }
    const correctAttributeElsewhere = elements.some((target) => target.id !== source.id && attributesMatch(source, target, axis));
    if (correctAttributeElsewhere) positionMismatch = true;
    else missing = true;
  }
  return { passed: !positionMismatch && !attributeMismatch && !missing, positionMismatch, attributeMismatch, missing };
}
export function validateFormalSymmetry({ elements = [], spec = {}, selectedSymmetryMode = 'vertical' }) {
  const vertical = axisAudit(elements, 'vertical', spec);
  const horizontal = axisAudit(elements, 'horizontal', spec);
  const required = selectedSymmetryMode === 'cross' ? [vertical, horizontal] : [selectedSymmetryMode === 'horizontal' ? horizontal : vertical];
  const metrics = { selectedSymmetryMode, vertical, horizontal, elementCount: elements.length };
  if (elements.length && required.every((audit) => audit.passed)) return response(true, 'valid', metrics, [selectedSymmetryMode]);
  if (selectedSymmetryMode === 'cross' && vertical.passed !== horizontal.passed) return response(false, 'CROSS_INCOMPLETE', metrics);
  if (required.some((audit) => audit.attributeMismatch)) return response(false, 'ATTRIBUTE_MISMATCH', metrics);
  if (required.some((audit) => audit.positionMismatch)) return response(false, 'POSITION_MISMATCH', metrics);
  return response(false, 'NO_SYMMETRY_PAIR', metrics);
}

function valueCounts(elements, key) {
  const counts = new Map();
  elements.forEach((item) => { const value = key(item); counts.set(value, (counts.get(value) ?? 0) + 1); });
  return counts;
}
function clearTwoGroup(counts, total, coverage) {
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (total === 2 && ordered.length === 2) return ordered;
  return ordered.length >= 2 && ordered[0][1] >= 2 && (ordered[0][1] + ordered[1][1]) / total >= coverage ? ordered.slice(0, 2) : null;
}
const hueOrder = HUE_FAMILIES;
const shapeFamily = (shape) => shape === 'circle' || shape === 'semicircle' ? 'rounded' : shape === 'triangle' ? 'pointed' : 'angular';
export function validateFormalContrast({ elements = [], spec = {} }) {
  const coverage = spec.comparisonCoverage ?? 0.75;
  const sizeGroups = clearTwoGroup(valueCounts(elements, (item) => item.size), elements.length, coverage);
  const colorGroups = clearTwoGroup(valueCounts(elements, (item) => item.hue + ':' + item.lightness), elements.length, coverage);
  const shapeGroups = clearTwoGroup(valueCounts(elements, (item) => item.shape), elements.length, coverage);
  const methods = [];
  if (sizeGroups && Math.abs(Number(sizeGroups[0][0]) - Number(sizeGroups[1][0])) >= (spec.minimumSizeDifference ?? 3)) methods.push('size');
  if (colorGroups) {
    const parse = ([key]) => { const [hue, lightness] = key.split(':'); return { hue, lightness: Number(lightness) }; };
    const [a, b] = colorGroups.map(parse);
    const ai = hueOrder.indexOf(a.hue); const bi = hueOrder.indexOf(b.hue);
    const hueDistance = ai < 0 || bi < 0 ? 0 : Math.min(Math.abs(ai - bi), hueOrder.length - Math.abs(ai - bi));
    if (hueDistance >= (spec.minimumHueDistance ?? 2) || Math.abs(a.lightness - b.lightness) >= (spec.minimumLightnessDifference ?? 3)) methods.push('color');
  }
  if (shapeGroups && shapeFamily(shapeGroups[0][0]) !== shapeFamily(shapeGroups[1][0])) methods.push('shape');
  const metrics = { sizeGroups, colorGroups, shapeGroups, methods, elementCount: elements.length };
  if (methods.length) return response(true, 'valid', metrics, methods.length > 1 ? ['multiple', ...methods] : methods);
  const diversity = ['size', 'hue', 'shape'].filter((key) => new Set(elements.map((item) => item[key])).size >= Math.min(4, elements.length)).length;
  if (elements.length >= 4 && diversity >= 2) return response(false, 'TOO_MANY_UNRELATED_DIFFERENCES', metrics);
  if (sizeGroups || colorGroups || shapeGroups) return response(false, 'DIFFERENCE_TOO_SMALL', metrics);
  return response(false, 'NO_CLEAR_CONTRAST', metrics);
}

export function validateFormalProportion({ elements = [], spec = {} }) {
  const required = spec.requiredRatioLevels ?? [1, 2, 3];
  const levels = elements.map((item) => item.ratioLevel ?? item.proportion).filter((value) => value != null);
  const present = [...new Set(levels)].sort();
  const metrics = { presentRatioLevels: present, requiredRatioLevels: required, elementCount: elements.length };
  if (elements.length < (spec.minimumElements ?? 6)) return response(false, 'TOO_FEW_ELEMENTS', metrics);
  if (!required.every((level) => present.includes(level))) return response(false, 'RATIO_LEVELS_INCOMPLETE', metrics);
  if (present.some((level) => !required.includes(level))) return response(false, 'RATIO_RELATION_TOO_WEAK', metrics);
  return response(true, 'valid', metrics, ['ratio']);
}


function dominantGroup(elements, key) {
  const counts = valueCounts(elements, key);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [value, count] = ordered[0] ?? [null, 0];
  return { value, count, ratio: elements.length ? count / elements.length : 0, counts: Object.fromEntries(ordered) };
}

export function validateFormalUnity({ elements = [], spec = {} }) {
  const minimumElements = spec.minimumElements ?? 4;
  const requiredRatio = spec.requiredUnityRatio ?? 0.75;
  const color = dominantGroup(elements, (item) => item.hueFamily ?? item.hue);
  const exactShape = dominantGroup(elements, (item) => item.shape);
  const directional = elements.filter((item) => getShapeMetadata(item.shape).directional);
  const rotation = dominantGroup(directional, (item) => item.rotation ?? 0);
  const directionCoverage = elements.length ? rotation.count / elements.length : 0;
  const featureCounts = new Map();
  const meaningfulFeatures = new Set(['rounded', 'angular', 'pointed', 'elongated', 'equal-sides', 'radial', 'flat-edge', 'open', 'linear']);
  elements.forEach((item) => getShapeMetadata(item.shape).shapeFeature.filter((feature) => meaningfulFeatures.has(feature)).forEach((feature) => featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1)));
  const [feature, featureCount] = [...featureCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const shapeFeature = { value: feature, count: featureCount, ratio: elements.length ? featureCount / elements.length : 0 };
  const lineStyle = dominantGroup(elements, (item) => item.lineStyle ?? 'solid');
  const methods = [];
  if (elements.length >= minimumElements && color.ratio >= requiredRatio) methods.push('color');
  if (elements.length >= minimumElements
    && directional.length >= (spec.minimumDirectionalElements ?? 3)
    && rotation.ratio >= requiredRatio
    && directionCoverage >= requiredRatio) methods.push('rotation');
  const sharedExactShape = exactShape.ratio >= requiredRatio;
  const sharedShapeFeature = new Set(elements.map((item) => item.shape)).size >= 2 && shapeFeature.ratio >= requiredRatio;
  if (elements.length >= minimumElements && (sharedExactShape || sharedShapeFeature)) methods.push('shapeFeature');
  if (spec.lineStyleEnabled === true && elements.length >= minimumElements && lineStyle.ratio >= requiredRatio) methods.push('lineStyle');
  const metrics = { elementCount: elements.length, requiredRatio, color, exactShape, directionalCount: directional.length, rotation, directionCoverage, shapeFeature, lineStyle };
  if (methods.length) return response(true, 'valid', metrics, methods.length > 1 ? ['multiple', ...methods] : methods);
  const strongest = Math.max(color.ratio, exactShape.ratio, directionCoverage, shapeFeature.ratio);
  return response(false, strongest >= 0.4 ? 'UNITY_TOO_WEAK' : 'NO_CLEAR_UNITY', metrics);
}

function hueDistance(first, second) {
  const a = HUE_FAMILIES.indexOf(first);
  const b = HUE_FAMILIES.indexOf(second);
  if (a < 0 || b < 0) return Infinity;
  const raw = Math.abs(a - b);
  return Math.min(raw, HUE_FAMILIES.length - raw);
}

function bestHarmonyHueArc(hues, maximumSpan) {
  const validHues = hues.filter((hue) => HUE_FAMILIES.includes(hue));
  const count = HUE_FAMILIES.length;
  let best = { coverage: 0, start: null, end: null, span: 0, hues: [] };
  for (let startIndex = 0; startIndex < count; startIndex += 1) {
    for (let span = 1; span <= maximumSpan; span += 1) {
      const arcHues = Array.from({ length: span + 1 }, (_, offset) => HUE_FAMILIES[(startIndex + offset) % count]);
      const covered = validHues.filter((hue) => arcHues.includes(hue)).length;
      const coverage = covered / Math.max(1, hues.length);
      if (coverage > best.coverage || (coverage === best.coverage && span < best.span)) {
        best = { coverage, start: arcHues[0], end: arcHues.at(-1), span, hues: arcHues };
      }
    }
  }
  return best;
}

export function validateFormalHarmony({ elements = [], spec = {} }) {
  const minimumElements = spec.minimumElements ?? 4;
  const coverage = spec.harmonyCoverage ?? 0.75;
  const maximumHueArcSpan = spec.maximumHarmonyHueArcSpan ?? 4;
  const hues = elements.map((item) => item.hueFamily ?? item.hue);
  const hueGroups = dominantGroup(elements, (item) => item.hueFamily ?? item.hue);
  const sameHueElements = elements.filter((item) => (item.hueFamily ?? item.hue) === hueGroups.value);
  const sameHueLightness = elements.length >= minimumElements
    && hueGroups.ratio >= coverage
    && new Set(sameHueElements.map((item) => item.lightnessLevel ?? item.lightness)).size >= (spec.minimumLightnessLevels ?? 2);
  const hasLightnessVariation = new Set(elements.map((item) => item.lightnessLevel ?? item.lightness)).size >= (spec.minimumLightnessLevels ?? 2);
  const uniqueHues = [...new Set(hues)];
  const bestHueArc = bestHarmonyHueArc(hues, maximumHueArcSpan);
  const bestNeighborCoverage = bestHueArc.coverage;
  const neighborHue = elements.length >= minimumElements
    && uniqueHues.length >= 2
    && bestNeighborCoverage >= coverage
    && uniqueHues.some((first) => uniqueHues.some((second) => areNeighborHues(first, second)));
  const methods = [];
  if (neighborHue && hasLightnessVariation) methods.push('mixed');
  else if (sameHueLightness) methods.push('sameHueLightness');
  else if (neighborHue) methods.push('neighborHue');
  const maximumHueDistance = uniqueHues.reduce((maximum, first) => Math.max(maximum, ...uniqueHues.map((second) => hueDistance(first, second))), 0);
  const metrics = { elementCount: elements.length, uniqueHues, hueGroups, sameHueLightness, hasLightnessVariation, neighborHue, bestNeighborCoverage, bestHueArc, maximumHueArcSpan, maximumHueDistance };
  if (methods.length) return response(true, 'valid', metrics, methods);
  if (uniqueHues.length === 1 && new Set(elements.map((item) => item.lightnessLevel ?? item.lightness)).size === 1) return response(false, 'NO_CLEAR_HARMONY', metrics);
  if (maximumHueDistance >= 3 && bestNeighborCoverage <= 0.5) return response(false, 'COLORS_TOO_FAR_APART', metrics);
  if (bestNeighborCoverage >= 0.4) return response(false, 'HARMONY_TOO_WEAK', metrics);
  return response(false, 'NO_CLEAR_HARMONY', metrics);
}

function alignmentScore(elements, tolerance = 24) {
  if (elements.length < 2) return 0;
  let aligned = 0;
  let pairs = 0;
  for (let first = 0; first < elements.length; first += 1) {
    for (let second = first + 1; second < elements.length; second += 1) {
      pairs += 1;
      if (Math.abs(elements[first].x - elements[second].x) <= tolerance || Math.abs(elements[first].y - elements[second].y) <= tolerance) aligned += 1;
    }
  }
  return pairs ? aligned / pairs : 0;
}

function simplicityMetrics(elements) {
  return {
    elementCount: elements.length,
    uniqueHues: new Set(elements.map((item) => item.hueFamily ?? item.hue)).size,
    uniqueSizes: new Set(elements.map((item) => item.sizeLevel ?? item.size)).size,
    uniqueShapes: new Set(elements.map((item) => item.shape)).size,
    organization: alignmentScore(elements)
  };
}

export function validateFormalSimplicity({ elements = [], beforeState = [], spec = {} }) {
  const before = simplicityMetrics(beforeState);
  const after = simplicityMetrics(elements);
  const coreIds = spec.coreElementIds ?? [];
  const afterIds = new Set(elements.map((item) => item.id));
  const missingCoreIds = coreIds.filter((id) => !afterIds.has(id));
  const nonCoreRemaining = elements.filter((item) => !coreIds.includes(item.id)).length;
  const elementReduction = before.elementCount - after.elementCount;
  const varietyReduction = (before.uniqueHues - after.uniqueHues) + (before.uniqueSizes - after.uniqueSizes) + (before.uniqueShapes - after.uniqueShapes);
  const organizationGain = after.organization - before.organization;
  const methods = [];
  if (elementReduction >= (spec.minimumElementReduction ?? 2)) methods.push('reduce');
  if (organizationGain >= (spec.minimumOrganizationGain ?? 0.16)) methods.push('organize');
  if (varietyReduction >= (spec.minimumVarietyReduction ?? 2)) methods.push('simplifyVariety');
  const metrics = { before, after, elementReduction, varietyReduction, organizationGain, nonCoreRemaining, missingCoreIds };
  if (missingCoreIds.length) return response(false, 'CORE_ELEMENT_MISSING', metrics);
  if (nonCoreRemaining < (spec.minimumNonCoreRemaining ?? 1)) return response(false, 'OVER_REDUCED', metrics);
  if (!methods.length) return response(false, 'NOT_SIMPLIFIED', metrics);
  if (methods.includes('reduce') && !methods.includes('organize') && !methods.includes('simplifyVariety') && after.organization < 0.12) return response(false, 'STILL_DISORGANIZED', metrics);
  if (methods.includes('reduce') && !methods.includes('simplifyVariety') && after.uniqueHues >= before.uniqueHues && after.uniqueSizes >= before.uniqueSizes && after.uniqueShapes >= before.uniqueShapes) return response(false, 'TOO_MUCH_VARIETY', metrics);
  return response(true, 'valid', metrics, methods.length > 1 ? ['multiple', ...methods] : methods);
}

export const phase6cValidators = Object.freeze({
  repetition: validateFormalRepetition,
  gradation: validateFormalGradation,
  balance: validateFormalBalance,
  rhythm: validateFormalRhythm,
  symmetry: validateFormalSymmetry,
  contrast: validateFormalContrast,
  proportion: validateFormalProportion,
  unity: validateFormalUnity,
  harmony: validateFormalHarmony,
  simplicity: validateFormalSimplicity
});

export function validatePhase6cExperiment(definition, state) {
  const validator = phase6cValidators[definition.principleId];
  if (!validator) throw new Error(`No Phase 6C validator for ${definition.principleId}`);
  return validator({
    elements: state.workingElements ?? [],
    beforeState: state.beforeState ?? definition.initialState.beforeState ?? [],
    spec: definition.validationSpec,
    selectedSymmetryMode: state.selectedExperimentOption ?? definition.initialState.selectedSymmetryMode
  });
}
