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

export const validatorIds = Object.freeze({
  selectedOptionEquals: 'selected-option-equals',
  selectedElementEquals: 'selected-element-equals',
  strictAscending: 'strict-ascending',
  repeatingUnit: 'repeating-unit',
  mirrorPosition: 'mirror-position'
});
