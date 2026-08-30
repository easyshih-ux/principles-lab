const validatorRegistry = new Map();

export function registerValidator(id, validator) {
  if (!id || typeof validator !== 'function') {
    throw new TypeError('A validator id and function are required.');
  }
  validatorRegistry.set(id, validator);
}

export function hasValidator(id) {
  return validatorRegistry.has(id);
}

export function validateStage(stage, input) {
  const validator = validatorRegistry.get(stage.validatorId);
  if (!validator) {
    return {
      isValid: false,
      code: 'validator-not-found',
      feedback: '這個關卡尚未設定檢測方式。'
    };
  }

  return validator({ input, stage });
}

registerValidator('selected-option-equals', ({ input, stage }) => ({
  isValid: input.selectedOptionId === stage.validation.correctOptionId,
  code: input.selectedOptionId ? 'incorrect' : 'incomplete'
}));

registerValidator('selected-element-equals', ({ input, stage }) => ({
  isValid: input.selectedElementId === stage.validation.correctElementId,
  code: input.selectedElementId ? 'incorrect' : 'incomplete'
}));

registerValidator('strict-ascending', ({ input }) => {
  const order = input.order ?? [];
  const isValid = order.length > 1
    && order.every((size, index) => index === 0 || size > order[index - 1]);

  if (isValid) {
    return { isValid: true, code: 'valid' };
  }

  const interruptions = order.filter(
    (size, index) => index > 0 && size <= order[index - 1]
  ).length;

  if (interruptions === 1) {
    return { isValid: false, code: 'single-interruption' };
  }

  if (order.length && order[0] !== Math.min(...order)) {
    return { isValid: false, code: 'smallest-not-first' };
  }

  return {
    isValid: false,
    code: 'compare-neighbors'
  };
});

registerValidator('repeating-unit', ({ input, stage }) => {
  const order = input.order ?? [];
  const unit = stage.validation.unit ?? [];
  const unitLength = stage.validation.unitLength ?? unit.length;
  const isValid = unitLength > 0 && order.length >= unitLength * 2
    && order.every((value, index) => value === unit[index % unitLength]);
  return { isValid, code: isValid ? 'valid' : 'repeat-unit-unclear' };
});

registerValidator('mirror-position', ({ input, stage }) => {
  const position = input.position ?? {};
  const target = stage.validation.target;
  const tolerance = stage.validation.tolerance;
  const isValid = Number.isFinite(position.x) && Number.isFinite(position.y)
    && Math.hypot(position.x - target.x, position.y - target.y) <= tolerance;
  return { isValid, code: isValid ? 'valid' : 'mirror-not-aligned' };
});

registerValidator('visual-balance', ({ input, stage }) => {
  const x = input.position?.x;
  const moment = Number.isFinite(x) ? x - 50 : Infinity;
  const isValid = Math.abs(moment - stage.validation.targetMoment) <= stage.validation.tolerance;
  return { isValid, code: isValid ? 'valid' : 'balance-unstable' };
});

registerValidator('visual-rhythm', ({ input, stage }) => {
  const positions = input.positions ?? [];
  const range = positions.length ? Math.max(...positions) - Math.min(...positions) : 0;
  if (range < stage.validation.minRange) return { isValid: false, code: 'rhythm-flat' };
  const deltas = positions.slice(1).map((value, index) => value - positions[index]);
  const directedSteps = deltas.filter((delta) => Math.abs(delta) >= 5).length;
  const tooRandom = deltas.some((delta) => Math.abs(delta) > stage.validation.maxStep);
  const turns = deltas.slice(1).filter((delta, index) => Math.sign(delta) !== Math.sign(deltas[index])).length;
  const isValid = !tooRandom && directedSteps >= stage.validation.minDirectedSteps && turns <= 2;
  return { isValid, code: isValid ? 'valid' : 'rhythm-random' };
});

registerValidator('visible-height-difference', ({ input, stage }) => {
  const positions = input.positions ?? [];
  const range = positions.length ? Math.max(...positions) - Math.min(...positions) : 0;
  const isValid = range >= stage.validation.minRange;
  return { isValid, code: isValid ? 'valid' : 'height-difference-small' };
});

registerValidator('angle-near', ({ input, stage }) => {
  const angle = Number(input.rotation);
  const target = stage.validation.targetAngle;
  const difference = Number.isFinite(angle) ? Math.abs(((angle - target + 180) % 360) - 180) : Infinity;
  const isValid = difference <= stage.validation.tolerance;
  return { isValid, code: isValid ? 'valid' : 'angle-not-aligned' };
});

registerValidator('hue-in-set', ({ input, stage }) => {
  const isValid = stage.validation.acceptableHues.includes(input.selectedHue);
  return { isValid, code: isValid ? 'valid' : 'hue-not-harmonious' };
});

registerValidator('size-ratio', ({ input, stage }) => {
  const sizes = (input.sizes ?? []).filter(Number.isFinite);
  const ratio = sizes.length === 2 ? Math.max(...sizes) / Math.max(1, Math.min(...sizes)) : 0;
  const isValid = ratio >= stage.validation.minRatio && Math.max(...sizes, 0) <= stage.validation.maxSize;
  return { isValid, code: isValid ? 'valid' : 'size-difference-small' };
});

registerValidator('dominant-size', ({ input, stage }) => {
  const ratio = Number(input.mainSize) / Number(input.supportSize);
  const isValid = Number.isFinite(ratio) && ratio >= stage.validation.minRatio && ratio <= stage.validation.maxRatio;
  return { isValid, code: isValid ? 'valid' : 'main-not-dominant' };
});

registerValidator('extra-selection', ({ input, stage }) => {
  const selected = new Set(input.selectedIds ?? []);
  if ((stage.elements ?? []).some((element) => element.core && selected.has(element.id))) return { isValid: false, code: 'core-selected' };
  const correct = stage.validation.extraIds.filter((id) => selected.has(id)).length;
  return { isValid: correct >= stage.validation.minCorrect, code: correct >= stage.validation.minCorrect ? 'valid' : 'extras-insufficient' };
});

registerValidator('simple-reduction', ({ input, stage }) => {
  const remaining = new Set(input.remainingIds ?? []);
  if (remaining.size < stage.validation.minRemaining) return { isValid: false, code: 'too-empty' };
  if (!stage.validation.coreIds.every((id) => remaining.has(id))) return { isValid: false, code: 'core-missing' };
  const isValid = remaining.size >= stage.validation.minRemaining && remaining.size <= stage.validation.maxRemaining;
  return { isValid, code: isValid ? 'valid' : remaining.size > stage.validation.maxRemaining ? 'not-simple-enough' : 'too-empty' };
});

export const validatorIds = Object.freeze({
  selectedOptionEquals: 'selected-option-equals',
  selectedElementEquals: 'selected-element-equals',
  strictAscending: 'strict-ascending',
  repeatingUnit: 'repeating-unit',
  mirrorPosition: 'mirror-position',
  visualBalance: 'visual-balance',
  visualRhythm: 'visual-rhythm',
  visibleHeightDifference: 'visible-height-difference',
  angleNear: 'angle-near',
  hueInSet: 'hue-in-set',
  sizeRatio: 'size-ratio',
  dominantSize: 'dominant-size',
  extraSelection: 'extra-selection',
  simpleReduction: 'simple-reduction'
});
