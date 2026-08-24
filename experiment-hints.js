export const HINT_LEVELS = Object.freeze(['observe', 'think', 'action']);

export function hintLevelForAttempt(attemptCount) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) return 'observe';
  return HINT_LEVELS[Math.min(attemptCount - 1, HINT_LEVELS.length - 1)];
}

export function resolveDiagnosticHint(definition, diagnosticCode, attemptCount) {
  const hintSet = definition.diagnosticHints?.[diagnosticCode]
    ?? definition.diagnosticHints?.default
    ?? null;
  if (!hintSet) return null;
  const level = hintLevelForAttempt(attemptCount);
  return { code: diagnosticCode, level, text: hintSet[level] ?? '' };
}
