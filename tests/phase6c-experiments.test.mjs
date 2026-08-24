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

test('formal experiment course exposes the seven completed experiments in confirmed order', () => {
  assert.deepEqual(phase6cDefinitions.map((item) => item.principleId), ['repetition', 'gradation', 'balance', 'rhythm', 'symmetry', 'contrast', 'proportion']);
  assert.ok(phase6cDefinitions.every((item) => item.status === 'phase6c-formal'));
});

test('formal routes resolve seven experiments, completion and dev lab', () => {
  for (const principleId of ['repetition', 'gradation', 'balance', 'rhythm', 'symmetry', 'contrast', 'proportion']) {
    assert.equal(resolveRoute(`#level/experiment/${principleId}`, stages, principles, recognizeQuestions).name, 'experiment');
  }
  assert.equal(resolveRoute('#level/experiment/complete', stages, principles, recognizeQuestions).name, 'experimentComplete');
  assert.equal(resolveRoute('#dev/experiments', stages, principles, recognizeQuestions).name, 'experimentDev');
  assert.equal(resolveRoute('#level/experiment/unity', stages, principles, recognizeQuestions).isFallback, true);
});

test('single repetition passes without equal spacing', () => {
  const result = validate('repetition', phase6cFixtures.repetition.pass.single);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['single']);
});

test('group repetition passes and is detected before its component singles', () => {
  const result = validate('repetition', phase6cFixtures.repetition.pass.group);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['group']);
});

test('two occurrences and inconsistent collections fail with specific diagnostics', () => {
  assert.equal(validate('repetition', phase6cFixtures.repetition.fail.two).primaryDiagnosticCode, 'NOT_ENOUGH_REPETITION');
  assert.equal(validate('repetition', phase6cFixtures.repetition.fail.inconsistent).primaryDiagnosticCode, 'INCONSISTENT_REPEAT');
});

for (const fixture of ['size', 'descending', 'nonEqual', 'lightness', 'spacing']) {
  test(`${fixture} gradation path passes`, () => {
    assert.equal(validate('gradation', phase6cFixtures.gradation.pass[fixture]).passed, true);
  });
}

test('multiple gradation paths are reported together', () => {
  const result = validate('gradation', phase6cFixtures.gradation.pass.multiple);
  assert.equal(result.passed, true);
  assert.ok(result.detectedMethods.includes('multiple'));
  assert.ok(result.detectedMethods.includes('size'));
  assert.ok(result.detectedMethods.includes('spacing'));
});

test('gradation direction break and too few stages fail specifically', () => {
  assert.equal(validate('gradation', phase6cFixtures.gradation.fail.directionBreak).primaryDiagnosticCode, 'DIRECTION_BREAK');
  assert.equal(validate('gradation', phase6cFixtures.gradation.fail.tooFew).primaryDiagnosticCode, 'TOO_FEW_STAGES');
});

test('symmetrical and asymmetrical balance both pass and classify correctly', () => {
  assert.deepEqual(validate('balance', phase6cFixtures.balance.pass.symmetrical).detectedMethods, ['symmetrical']);
  assert.deepEqual(validate('balance', phase6cFixtures.balance.pass.asymmetrical).detectedMethods, ['asymmetrical']);
});

test('balance rejects one-side, heavy-side and centered exploits', () => {
  assert.equal(validate('balance', phase6cFixtures.balance.fail.oneSide).primaryDiagnosticCode, 'ONE_SIDE_EMPTY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.leftHeavy).primaryDiagnosticCode, 'LEFT_HEAVY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.rightHeavy).primaryDiagnosticCode, 'RIGHT_HEAVY');
  assert.equal(validate('balance', phase6cFixtures.balance.fail.centered).primaryDiagnosticCode, 'TOO_CENTERED');
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
  assert.equal(third.result.primaryDiagnosticCode, 'NOT_ENOUGH_REPETITION');
});

test('four course states stay isolated and reset affects only the current experiment', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = definition('repetition');
  const gradation = definition('gradation');
  getExperimentState(course, repetition.id).workingElements = phase6cFixtures.repetition.pass.single;
  submitPhase6cExperiment(course, repetition);
  getExperimentState(course, gradation.id).attemptCount = 2;
  resetPhase6cExperiment(course, repetition);
  assert.equal(getExperimentState(course, repetition.id).attemptCount, 0);
  assert.equal(getExperimentState(course, gradation.id).attemptCount, 2);
});

test('success never advances automatically and requires explicit advance', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = definition('repetition');
  getExperimentState(course, repetition.id).workingElements = phase6cFixtures.repetition.pass.single;
  submitPhase6cExperiment(course, repetition);
  assert.equal(course.currentIndex, 0);
  assert.equal(course.currentExperimentId, null);
  assert.equal(advancePhase6c(course, repetition), 'experiment-gradation');
  assert.equal(course.currentIndex, 1);
});
