import { getLogicalSize } from './geometry/palette.js';
import { registerValidator } from './validators.js';

export const experimentValidatorIds = Object.freeze({
  repetition: 'experiment-repetition',
  gradation: 'experiment-gradation',
  symmetry: 'experiment-symmetry',
  balance: 'experiment-balance',
  rhythm: 'experiment-rhythm',
  harmony: 'experiment-harmony',
  unity: 'experiment-unity',
  contrast: 'experiment-contrast',
  proportion: 'experiment-proportion',
  simplicity: 'experiment-simplicity'
});

function result(conditions, metrics = {}) {
  const fulfilledConditions = conditions.filter((item) => item.passed).map((item) => item.text);
  const missingConditions = conditions.filter((item) => !item.passed).map((item) => item.missing);
  const passed = missingConditions.length === 0;
  return {
    passed,
    isValid: passed,
    code: passed ? 'valid' : 'conditions-missing',
    fulfilledConditions,
    missingConditions,
    feedback: [
      ...fulfilledConditions.map((text) => `✓ ${text}`),
      ...missingConditions.map((text) => `△ ${text}`)
    ],
    metrics
  };
}

function condition(passed, text, missing) {
  return { passed, text, missing };
}

function sortedElements(elements, orderIds) {
  if (!orderIds?.length) return [...elements].sort((a, b) => a.x - b.x || a.y - b.y);
  const byId = new Map(elements.map((element) => [element.id, element]));
  return orderIds.map((id) => byId.get(id)).filter(Boolean);
}

function monotonicDirection(values, tolerance = 0) {
  const differences = values.slice(1).map((value, index) => value - values[index]);
  const increasing = differences.every((difference) => difference > tolerance);
  const decreasing = differences.every((difference) => difference < -tolerance);
  return increasing ? 'increasing' : decreasing ? 'decreasing' : null;
}

function matchesFields(first, second, fields) {
  return fields.every((field) => first[field] === second[field]);
}

function symmetryMetrics(elements, spec = {}) {
  const axis = spec.symmetryAxis ?? 500;
  const tolerance = spec.positionTolerance ?? 0.001;
  const fields = spec.matchFields ?? ['shape', 'size', 'hue', 'lightness', 'rotation'];
  const unmatched = new Set(elements.map((element) => element.id));
  let matchedPairs = 0;

  for (const element of elements) {
    if (!unmatched.has(element.id)) continue;
    if (Math.abs(element.x - axis) <= tolerance) {
      unmatched.delete(element.id);
      continue;
    }
    const expectedX = axis * 2 - element.x;
    const counterpart = elements.find((candidate) => (
      candidate.id !== element.id
      && unmatched.has(candidate.id)
      && Math.abs(candidate.x - expectedX) <= tolerance
      && Math.abs(candidate.y - element.y) <= tolerance
      && matchesFields(element, candidate, fields)
    ));
    if (counterpart) {
      unmatched.delete(element.id);
      unmatched.delete(counterpart.id);
      matchedPairs += 1;
    }
  }
  return { matchedPairs, unmatchedElements: [...unmatched], axis };
}

export function validateRepetition({ elements = [], spec = {} }) {
  const requiredCount = spec.minimumOccurrences ?? 3;
  const target = spec.targetSignature
    ?? elements.find((element) => element.id === spec.targetElementId)
    ?? null;
  const fields = spec.signatureFields
    ?? (spec.targetSignature ? Object.keys(spec.targetSignature) : ['shape', 'size', 'hue', 'lightness', 'rotation']);
  const occurrenceCount = target
    ? elements.filter((element) => matchesFields(element, target, fields)).length
    : 0;
  return result([
    condition(Boolean(target), '已找到指定反覆元素', '尚未指定要反覆的元素'),
    condition(
      occurrenceCount >= requiredCount,
      `指定元素已出現 ${occurrenceCount} 次`,
      `目前出現 ${occurrenceCount}／${requiredCount} 次`
    )
  ], { occurrenceCount, requiredCount });
}

export function validateGradation({ elements = [], spec = {} }) {
  const mode = spec.gradationMode;
  const ordered = sortedElements(elements, spec.orderIds);
  const minimumStages = spec.minimumStages ?? 3;
  let values = [];
  if (mode === 'size' || mode === 'lightness') values = ordered.map((element) => element[mode]);
  if (mode === 'spacing') values = ordered.slice(1).map((element, index) => element.x - ordered[index].x);
  const stageCount = mode === 'spacing' ? values.length : ordered.length;
  const direction = monotonicDirection(values, spec.tolerance ?? 0);
  const hasVariation = new Set(values).size > 1;
  return result([
    condition(['size', 'lightness', 'spacing'].includes(mode), '已指定漸層變因', '尚未指定本次漸層變因'),
    condition(stageCount >= minimumStages, `已有 ${stageCount} 個有效階段`, `至少需要 ${minimumStages} 個有效階段`),
    condition(hasVariation, '屬性已有清楚變化', '目前的屬性還沒有變化'),
    condition(Boolean(direction), '變化已形成單一方向', '變化順序仍有中斷')
  ], { mode, values, direction, stageCount });
}

export function validateSymmetry({ elements = [], spec = {} }) {
  const metrics = symmetryMetrics(elements, spec);
  const minimumElements = spec.minimumElements ?? 2;
  return result([
    condition(elements.length >= minimumElements, `已有 ${elements.length} 個元素`, `至少需要 ${minimumElements} 個元素`),
    condition(
      metrics.unmatchedElements.length === 0,
      '所有元素都有左右對應位置',
      `還有 ${metrics.unmatchedElements.length} 個元素沒有找到對稱位置`
    )
  ], metrics);
}

function visualArea(element, shapeFactors) {
  const size = getLogicalSize(element.size);
  const factor = shapeFactors[element.shape] ?? 1;
  return size * size * factor;
}

export function validateBalance({ elements = [], spec = {} }) {
  const axis = spec.symmetryAxis ?? 500;
  const tolerance = spec.balanceTolerance ?? 0.15;
  const shapeFactors = { circle: 0.79, triangle: 0.5, semicircle: 0.59, line: 0.12, ...(spec.shapeFactors ?? {}) };
  let leftWeight = 0;
  let rightWeight = 0;
  elements.forEach((element) => {
    const moment = visualArea(element, shapeFactors) * Math.abs(element.x - axis);
    if (element.x < axis) leftWeight += moment;
    if (element.x > axis) rightWeight += moment;
  });
  const total = leftWeight + rightWeight;
  const differenceRatio = total ? Math.abs(leftWeight - rightWeight) / total : 1;
  const mirror = symmetryMetrics(elements, { ...spec, symmetryAxis: axis });
  const isMirror = elements.length > 1 && mirror.unmatchedElements.length === 0;
  const hasBothSides = leftWeight > 0 && rightWeight > 0;
  const balanced = hasBothSides && differenceRatio <= tolerance;
  const heavierSide = leftWeight > rightWeight ? '左側' : '右側';
  return result([
    condition(hasBothSides, '左右兩側都有視覺重量', '左右兩側都需要有元素'),
    condition(balanced, '左右雖然不同，但已形成穩定感', `畫面的視覺重量還明顯偏向${heavierSide}`),
    condition(spec.requireAsymmetry === false || !isMirror, '構圖不是完全鏡像', '本次均衡實驗不能使用完全鏡像')
  ], { leftWeight, rightWeight, differenceRatio, tolerance, isMirror });
}

export function validateRhythm({ elements = [], spec = {} }) {
  const ordered = sortedElements(elements);
  const minimumElements = spec.minimumElements ?? 5;
  const minimumTurns = spec.minimumTurns ?? 2;
  const minimumYRange = spec.minimumYRange ?? 80;
  const minimumDelta = spec.minimumDelta ?? 20;
  const yValues = ordered.map((element) => element.y);
  const yRange = yValues.length ? Math.max(...yValues) - Math.min(...yValues) : 0;
  const directions = [];
  for (let index = 1; index < yValues.length; index += 1) {
    const difference = yValues[index] - yValues[index - 1];
    if (Math.abs(difference) < minimumDelta) continue;
    const direction = Math.sign(difference);
    if (directions.at(-1) !== direction) directions.push(direction);
  }
  const turnCount = Math.max(0, directions.length - 1);
  const isFlat = yRange < minimumYRange;
  return result([
    condition(elements.length >= minimumElements, `已有 ${elements.length} 個元素`, `至少需要 ${minimumElements} 個元素`),
    condition(!isFlat, '高低起伏已清楚出現', '目前的高低起伏還不明顯'),
    condition(turnCount >= minimumTurns, `已有 ${turnCount} 次方向轉折`, `目前只有 ${turnCount} 次起伏，本次實驗需要至少 ${minimumTurns} 次`)
  ], { elementCount: elements.length, turnCount, yRange, isFlat });
}

export function validateHarmony({ elements = [], spec = {} }) {
  const shapes = new Set(elements.map((element) => element.shape));
  const hues = new Set(elements.map((element) => element.hue));
  const lightness = new Set(elements.map((element) => element.lightness));
  const minimumShapes = spec.minimumShapes ?? 3;
  const minimumLightnessLevels = spec.minimumLightnessLevels ?? 3;
  return result([
    condition(shapes.size >= minimumShapes, `已使用 ${shapes.size} 種造形`, `至少需要 ${minimumShapes} 種不同造形`),
    condition(hues.size === 1, '主要元素屬於同一色系', '主要元素需要使用同一色系'),
    condition(lightness.size >= minimumLightnessLevels, `已使用 ${lightness.size} 種深淺`, `至少需要 ${minimumLightnessLevels} 種不同深淺`)
  ], { uniqueShapes: shapes.size, uniqueHues: hues.size, uniqueLightness: lightness.size });
}

export function validateUnity({ elements = [], spec = {} }) {
  const mode = spec.unityMode;
  const requiredRatio = spec.requiredUnityRatio ?? 1;
  const minimumShapes = spec.minimumShapes ?? 1;
  const shapes = new Set(elements.map((element) => element.shape));
  const matcher = {
    color: (element) => element.hue === spec.targetHue,
    rotation: (element) => element.rotation === spec.targetRotation,
    shapeFeature: (element) => (element.featureTags ?? []).includes(spec.requiredFeatureTag),
    lineStyle: (element) => element.lineStyle === spec.requiredLineStyle
  }[mode];
  const matchingCount = matcher ? elements.filter(matcher).length : 0;
  const totalCount = elements.length;
  const matchingRatio = totalCount ? matchingCount / totalCount : 0;
  return result([
    condition(Boolean(matcher), '已指定共同要素', '尚未指定本次統一方式'),
    condition(shapes.size >= minimumShapes, `已使用 ${shapes.size} 種造形`, `至少需要 ${minimumShapes} 種不同造形`),
    condition(matchingRatio >= requiredRatio, '主要元素已具有共同要素', '還有一些元素沒有共同要素')
  ], { matchingCount, totalCount, matchingRatio, requiredRatio, mode });
}

const defaultColorPairs = Object.freeze([
  ['red', 'green'], ['orange', 'blue'], ['yellow', 'purple']
]);

export function validateContrast({ elements = [], spec = {} }) {
  const mode = spec.contrastMode;
  let contrastFound = false;
  const metrics = { mode };
  if (mode === 'size') {
    const sizes = elements.map((element) => element.size);
    const sizeDifference = sizes.length ? Math.max(...sizes) - Math.min(...sizes) : 0;
    metrics.sizeDifference = sizeDifference;
    metrics.requiredDifference = spec.minimumSizeDifference ?? 3;
    contrastFound = sizeDifference >= metrics.requiredDifference;
  }
  if (mode === 'color') {
    const hues = new Set(elements.map((element) => element.hue));
    const pairs = spec.contrastingHuePairs ?? defaultColorPairs;
    contrastFound = pairs.some(([first, second]) => hues.has(first) && hues.has(second));
    metrics.usedHues = [...hues];
  }
  if (mode === 'shape') {
    const shapes = new Set(elements.map((element) => element.shape));
    const pair = spec.requiredShapePair ?? [];
    contrastFound = pair.length === 2 && pair.every((shape) => shapes.has(shape));
    metrics.usedShapes = [...shapes];
    metrics.requiredShapePair = pair;
  }
  return result([
    condition(['size', 'color', 'shape'].includes(mode), '已宣告對比方式', '尚未宣告本次對比方式'),
    condition(contrastFound, '已形成指定方式的明顯差異', '指定的對比方式還不夠明顯')
  ], metrics);
}

export function validateProportion({ elements = [], spec = {} }) {
  const requiredRatios = spec.requiredRatios ?? [1, 2, 3];
  const minimumElements = spec.minimumElements ?? 6;
  const usedRatios = [...new Set(elements.map((element) => element.proportion))];
  const missingRatios = requiredRatios.filter((ratio) => !usedRatios.includes(ratio));
  const conditions = [
    condition(elements.length >= minimumElements, `已使用 ${elements.length} 個元素`, `至少需要 ${minimumElements} 個元素`),
    ...requiredRatios.map((ratio) => condition(
      usedRatios.includes(ratio),
      `已使用比例 ${ratio}`,
      `還沒有使用比例 ${ratio}`
    ))
  ];
  return result(conditions, { usedRatios, missingRatios, elementCount: elements.length });
}

function complexityMetrics(elements) {
  const uniqueHues = new Set(elements.map((element) => element.hue)).size;
  const uniqueShapes = new Set(elements.map((element) => element.shape)).size;
  const decorationCount = elements.filter((element) => element.isDecoration).length;
  return {
    elementCount: elements.length,
    uniqueHues,
    uniqueShapes,
    decorationCount,
    complexity: elements.length + uniqueHues + uniqueShapes + decorationCount
  };
}

export function validateSimplicity({ beforeState = [], afterState = [], spec = {}, simplificationActions = [] }) {
  const before = complexityMetrics(beforeState);
  const after = complexityMetrics(afterState);
  const afterIds = new Set(afterState.map((element) => element.id));
  const coreElementIds = spec.coreElementIds ?? [];
  const missingCoreIds = coreElementIds.filter((id) => !afterIds.has(id));
  const derivedActions = [
    after.decorationCount < before.decorationCount ? 'removeDecoration' : null,
    after.uniqueHues < before.uniqueHues ? 'reduceColorVariety' : null,
    after.uniqueShapes < before.uniqueShapes ? 'reduceShapeVariety' : null
  ].filter(Boolean);
  const actions = [...new Set([...simplificationActions, ...derivedActions])];
  const requiredActions = spec.requiredActions ?? [];
  const completedRequired = requiredActions.filter((action) => actions.includes(action));
  const minimumActions = spec.minimumActions ?? (requiredActions.length || 1);
  const enoughActions = actions.length >= minimumActions
    && completedRequired.length === requiredActions.length;
  return result([
    condition(missingCoreIds.length === 0, '核心元素仍完整保留', `有 ${missingCoreIds.length} 個核心元素被移除`),
    condition(enoughActions, `已完成 ${actions.length} 項簡化行為`, `至少需要完成 ${minimumActions} 項指定簡化行為`),
    condition(after.complexity < before.complexity, '可量化複雜度已降低', '畫面尚未產生可確認的簡化')
  ], {
    beforeComplexity: before.complexity,
    afterComplexity: after.complexity,
    simplificationActions: actions,
    coreElementsPreserved: missingCoreIds.length === 0,
    missingCoreIds
  });
}

export const experimentValidators = Object.freeze({
  [experimentValidatorIds.repetition]: validateRepetition,
  [experimentValidatorIds.gradation]: validateGradation,
  [experimentValidatorIds.symmetry]: validateSymmetry,
  [experimentValidatorIds.balance]: validateBalance,
  [experimentValidatorIds.rhythm]: validateRhythm,
  [experimentValidatorIds.harmony]: validateHarmony,
  [experimentValidatorIds.unity]: validateUnity,
  [experimentValidatorIds.contrast]: validateContrast,
  [experimentValidatorIds.proportion]: validateProportion,
  [experimentValidatorIds.simplicity]: validateSimplicity
});

export function validateExperiment(validatorId, payload) {
  const validator = experimentValidators[validatorId];
  if (!validator) throw new Error(`Unknown experiment validator: ${validatorId}`);
  return validator(payload);
}

Object.entries(experimentValidators).forEach(([id, validator]) => {
  registerValidator(id, ({ input, stage }) => validator({
    ...input,
    spec: input.spec ?? stage.validation ?? {}
  }));
});
