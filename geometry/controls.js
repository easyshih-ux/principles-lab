import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  PROPORTION_LEVELS,
  ROTATION_VALUES,
  SIZE_LEVELS
} from './config.js';

export const CONTROL_DEFINITIONS = Object.freeze({
  size: Object.freeze({ tool: 'size', values: SIZE_LEVELS, defaultValue: 3 }),
  hue: Object.freeze({ tool: 'color', values: HUE_IDS, defaultValue: 'red' }),
  lightness: Object.freeze({ tool: 'lightness', values: LIGHTNESS_LEVELS, defaultValue: 3 }),
  rotation: Object.freeze({ tool: 'rotation', values: ROTATION_VALUES, defaultValue: 0 }),
  proportion: Object.freeze({ tool: 'proportion', values: PROPORTION_LEVELS, defaultValue: 1 })
});

export function normalizeToolConstraints(constraints = {}) {
  return Object.fromEntries(
    Object.entries(CONTROL_DEFINITIONS).map(([property, definition]) => {
      const source = constraints[property] ?? constraints[definition.tool] ?? {};
      const requested = source.allowedValues ?? source.allowedHue ?? definition.values;
      const allowedValues = requested.filter((value) => definition.values.includes(value));
      const lockedValues = (source.lockedValues ?? []).filter(
        (value) => definition.values.includes(value)
      );
      const usableValues = allowedValues.filter((value) => !lockedValues.includes(value));
      const defaultValue = usableValues.includes(source.defaultValue)
        ? source.defaultValue
        : usableValues[0] ?? definition.defaultValue;
      return [property, { allowedValues, lockedValues, defaultValue }];
    })
  );
}

export function isControlValueAllowed(property, value, constraints) {
  const definition = CONTROL_DEFINITIONS[property];
  if (!definition || !definition.values.includes(value)) return false;
  const constraint = constraints[property];
  return constraint.allowedValues.includes(value)
    && !constraint.lockedValues.includes(value);
}
