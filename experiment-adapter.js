import { validateExperiment as runPhase3Validator } from './experiment-validators.js';
import { createValidatorPayload } from './geometry/constrained-tools.js';

export function validateExperiment(experimentDefinition, experimentState) {
  const normalized = createValidatorPayload(
    experimentState.workingElements ?? [],
    {
      ...experimentDefinition.validationSpec,
      ...(typeof experimentState.selectedExperimentOption === 'object'
        ? experimentState.selectedExperimentOption
        : {})
    }
  );
  const payload = experimentDefinition.principleId === 'simplicity'
    ? {
        beforeState: experimentState.beforeState ?? [],
        afterState: normalized.elements,
        spec: normalized.spec,
        simplificationActions: experimentState.detectedMethods ?? []
      }
    : normalized;
  const result = runPhase3Validator(experimentDefinition.validatorId, payload);
  const detectedMethods = result.detectedMethods
    ?? result.metrics?.detectedMethods
    ?? experimentState.detectedMethods
    ?? [];
  return {
    ...result,
    detectedMethods: [...detectedMethods],
    primaryDiagnosticCode: result.primaryDiagnosticCode ?? result.code
  };
}
