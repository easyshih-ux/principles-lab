import test from 'node:test';
import assert from 'node:assert/strict';
import { principles, stages } from '../data.js';
import { resolveRoute } from '../router.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import {
  validateFormalBalance,
  validateFormalGradation,
  validateFormalRepetition,
  validateFormalRhythm
} from '../phase6c-validators.js';
import {
  advancePhase6c,
  createPhase6cCourseState,
  resetPhase6cExperiment,
  submitPhase6cExperiment
} from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const definition = (principle) => phase6cDefinitionsById[`experiment-${principle}`];
const validate = (principle, elements) => ({
  repetition: validateFormalRepetition,
  gradation: validateFormalGradation,
  balance: validateFormalBalance,
  rhythm: validateFormalRhythm
}[principle]({ elements, spec: definition(principle).validationSpec }));

test('formal experiment course exposes all ten experiments in confirmed order', () => {
  assert.deepEqual(phase6cDefinitions.map((item) => item.principleId), ['repetition', 'gradation', 'balance', 'rhythm', 'symmetry', 'contrast', 'proportion', 'unity', 'harmony', 'simplicity']);
  assert.ok(phase6cDefinitions.every((item) => item.status === 'phase6c-formal'));
});

test('formal routes resolve ten experiments, completion and dev lab', () => {
  for (const principleId of ['repetition', 'gradation', 'balance', 'rhythm', 'symmetry', 'contrast', 'proportion', 'unity', 'harmony', 'simplicity']) {
    assert.equal(resolveRoute(`#level/experiment/${principleId}`, stages, principles, recognizeQuestions).name, 'experiment');
  }
  assert.equal(resolveRoute('#level/experiment/complete', stages, principles, recognizeQuestions).name, 'experimentComplete');
  assert.equal(resolveRoute('#dev/experiments', stages, principles, recognizeQuestions).name, 'experimentDev');
  assert.equal(resolveRoute('#level/experiment/emphasis', stages, principles, recognizeQuestions).isFallback, true);
});

test('Gate 4: shapes repeated on their own no longer count as repetition', () => {
  const result = validate('repetition', phase6cFixtures.repetition.fail.singleKind);
  assert.equal(result.passed, false);
  assert.equal(result.primaryDiagnosticCode, 'NOT_GROUPED_INTO_UNITS');
});

test('unit repetition passes with five identical units', () => {
  const result = validate('repetition', phase6cFixtures.repetition.pass.group);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['unit']);
});

test('Gate 4 repetition enforces five units', () => {
  assert.equal(validate('repetition', phase6cFixtures.repetition.pass.group.slice(0, 12)).passed, false);
});

test('two identical shapes and unrelated collections fail with specific diagnostics', () => {
  assert.equal(validate('repetition', phase6cFixtures.repetition.fail.two).primaryDiagnosticCode, 'NOT_GROUPED_INTO_UNITS');
  assert.equal(validate('repetition', phase6cFixtures.repetition.fail.inconsistent).primaryDiagnosticCode, 'NO_REPEAT_UNIT');
});

for (const fixture of Object.keys(phase6cFixtures.gradation.pass)) {
  test(`Gate 4 ${fixture} gradation passes`, () => {
    assert.equal(validate('gradation', phase6cFixtures.gradation.pass[fixture]).passed, true);
  });
}

test('Gate 4 gradation reports every change that passed together', () => {
  for (const [fixture, methods] of [
    ['sizeLightness', ['size', 'lightness']],
    ['sizeHue', ['size', 'hue']],
    ['hueSpacing', ['hue', 'spacing']],
    ['threeChanges', ['size', 'lightness', 'hue']]
  ]) {
    const result = validate('gradation', phase6cFixtures.gradation.pass[fixture]);
    assert.equal(result.passed, true);
    assert.equal(result.detectedMethods[0], 'multiple');
    for (const method of methods) assert.ok(result.detectedMethods.includes(method), `${fixture} ${method}`);
  }
});

test('Gate 4 gradation failures get their own diagnosis', () => {
  for (const [fixture, code] of [
    ['onlySize', 'ONLY_ONE_CHANGE'], ['stopsAtFourth', 'CHANGE_STOPS'], ['manyPeaks', 'TOO_MANY_PEAKS'], ['fiveStages', 'TOO_FEW_STAGES'],
    ['decoration', 'NOT_ON_PATH'], ['scattered', 'NO_CLEAR_PATH'], ['hueJump', 'HUE_JUMP'], ['ringBreak', 'CHANGE_STOPS']
  ]) assert.equal(validate('gradation', phase6cFixtures.gradation.fail[fixture]).primaryDiagnosticCode, code, fixture);
});

test('gradation success feedback stays student-facing', () => {
  for (const text of [...Object.values(definition('gradation').successFeedback.byMethod), ...Object.values(definition('gradation').discoveryFeedback)]) {
    assert.doesNotMatch(text, /monotonic|single-turn|distance|tolerance|threshold|轉折/i);
  }
});

test('formal balance rejects near mirrors and accepts asymmetric balance', () => {
  for (const fixtureName of ['symmetrical', 'symmetricalPairs']) {
    const result = validate('balance', phase6cFixtures.balance.fail[fixtureName]);
    assert.equal(result.passed, false, fixtureName);
    assert.equal(result.primaryDiagnosticCode, 'ASYMMETRY_REQUIRED', fixtureName);
    assert.equal(result.metrics.isMirror, true, fixtureName);
  }
  assert.deepEqual(validate('balance', phase6cFixtures.balance.pass.asymmetrical).detectedMethods, ['asymmetrical']);
});

test('classroom balance accepts basic, asymmetric, and grouped visual weight arrangements', () => {
  for (const fixtureName of ['borderlineLargeAgainstTwoSmall', 'borderlineUnevenPositions', 'largeAgainstMediumAndThreeSmall', 'reportedLargeAgainstGroup', 'reportedLargeAgainstGroupShifted', 'equalCountDifferentSize', 'equalCountDifferentPositions']) {
    const result = validate('balance', phase6cFixtures.balance.pass[fixtureName]);
    assert.equal(result.passed, true, fixtureName);
    assert.deepEqual(result.detectedMethods, ['asymmetrical'], fixtureName);
    assert.ok(result.metrics.differenceRatio <= 0.45, `${fixtureName} must remain visually plausible`);
    assert.equal(result.metrics.tolerance, 0.45);
  }
  const reported = validate('balance', phase6cFixtures.balance.pass.reportedLargeAgainstGroup);
  assert.ok(reported.metrics.leftVisualWeight > 0);
  assert.ok(reported.metrics.rightVisualWeight > 0);
});

test('formal balance gives a student-facing asymmetric challenge and mirror hint', () => {
  const balance = definition('balance');
  assert.match(balance.title, /不對稱/);
  assert.match(balance.task, /左右不能一模一樣/);
  assert.match(balance.diagnosticHints.ASYMMETRY_REQUIRED.action, /大小、數量或位置/);
  assert.doesNotMatch(Object.values(balance.diagnosticHints.ASYMMETRY_REQUIRED).join(' '), /threshold|tolerance|mirror score|validator/i);
});

test('extreme balance arrangements still fail on the visibly heavier side', () => {
  const left = validate('balance', phase6cFixtures.balance.fail.extremeLeftHeavy);
  const right = validate('balance', phase6cFixtures.balance.fail.extremeRightHeavy);
  assert.equal(left.primaryDiagnosticCode, 'LEFT_HEAVY');
  assert.equal(right.primaryDiagnosticCode, 'RIGHT_HEAVY');
  assert.ok(left.metrics.differenceRatio > 0.45);
  assert.ok(right.metrics.differenceRatio > 0.45);
});

test('balance rejects one-side, heavy-side and centered exploits', () => {
  assert.equal(validate('balance', phase6cFixtures.balance.fail.oneSide).primaryDiagnosticCode, 'ONE_SIDE_EMPTY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.oneSideRight).primaryDiagnosticCode, 'ONE_SIDE_EMPTY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.leftHeavy).primaryDiagnosticCode, 'LEFT_HEAVY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.rightHeavy).primaryDiagnosticCode, 'RIGHT_HEAVY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.centered).primaryDiagnosticCode, 'TOO_CENTERED');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.severalLargeAgainstTiny).primaryDiagnosticCode, 'LEFT_HEAVY');
});

for (const fixture of ['regular', 'irregular', 'rotation', 'size', 'spacing', 'mixed', 'noRepetition', 'rhythm-irregular-wave-size-flow']) {
  test(`${fixture} rhythm path passes`, () => {
    assert.equal(validate('rhythm', phase6cFixtures.rhythm.pass[fixture]).passed, true);
  });
}

test('irregular wave with non-periodic size changes is a traceable mixed rhythm', () => {
  const result = validate('rhythm', phase6cFixtures.rhythm.pass['rhythm-irregular-wave-size-flow']);
  assert.equal(result.passed, true);
  assert.equal(result.metrics.path.traceable, true);
  assert.ok(result.detectedMethods.includes('position'));
  assert.ok(result.detectedMethods.includes('size'));
  assert.ok(result.detectedMethods.includes('mixed'));
});

test('static repetition, random scatter, subtle change and unclear motion fail specifically', () => {
  assert.equal(validate('rhythm', phase6cFixtures.rhythm.fail.static).primaryDiagnosticCode, 'STATIC_REPETITION');
  assert.equal(validate('rhythm', phase6cFixtures.rhythm.fail.random).primaryDiagnosticCode, 'TOO_RANDOM');
  assert.equal(validate('rhythm', phase6cFixtures.rhythm.fail.weak).primaryDiagnosticCode, 'CHANGE_TOO_SUBTLE');
  assert.equal(validate('rhythm', phase6cFixtures.rhythm.fail.unclear).primaryDiagnosticCode, 'NO_CLEAR_MOTION');
});

test('diagnostic codes resolve observe, think and action hints', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = definition('repetition');
  getExperimentState(course, repetition.id).workingElements = phase6cFixtures.repetition.fail.two;
  const first = submitPhase6cExperiment(course, repetition);
  const second = submitPhase6cExperiment(course, repetition);
  const third = submitPhase6cExperiment(course, repetition);
  assert.equal(first.hint.level, 'observe');
  assert.equal(second.hint.level, 'think');
  assert.equal(third.hint.level, 'action');
  assert.equal(third.result.primaryDiagnosticCode, 'NOT_GROUPED_INTO_UNITS');
});

test('four course states stay isolated and reset affects only the current experiment', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = definition('repetition');
  const gradation = definition('gradation');
  getExperimentState(course, repetition.id).workingElements = phase6cFixtures.repetition.pass.group;
  submitPhase6cExperiment(course, repetition);
  getExperimentState(course, gradation.id).attemptCount = 2;
  resetPhase6cExperiment(course, repetition);
  assert.equal(getExperimentState(course, repetition.id).attemptCount, 0);
  assert.equal(getExperimentState(course, gradation.id).attemptCount, 2);
});

test('success never advances automatically and requires explicit advance', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = definition('repetition');
  getExperimentState(course, repetition.id).workingElements = phase6cFixtures.repetition.pass.group;
  submitPhase6cExperiment(course, repetition);
  assert.equal(course.currentIndex, 0);
  assert.equal(course.currentExperimentId, null);
  assert.equal(advancePhase6c(course, repetition), 'experiment-gradation');
  assert.equal(course.currentIndex, 1);
});
