import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentDefinitions, experimentDefinitionsById } from '../experiment-definitions.js';
import { createExperimentSessionState, getExperimentState, resetExperimentState } from '../experiment-session.js';
import { phase6cDefinitions } from '../phase6c-definitions.js';
import { createPhase6cCourseState, resetPhase6cExperiment, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';

test('the seven released formal student experiments start with blank artwork', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  for (const definition of phase6cDefinitions) {
    assert.deepEqual(definition.initialState.elements, [], definition.principleId);
    assert.deepEqual(getExperimentState(course, definition.id).workingElements, [], definition.principleId);
  }
  const symmetry = phase6cDefinitions.find((item) => item.principleId === 'symmetry');
  assert.equal(symmetry.initialState.gridConfig.enabled, true);
  assert.equal(symmetry.initialState.selectedSymmetryMode, 'vertical');
});

test('all first nine architecture definitions are blank while simplicity owns an independent initial artwork', () => {
  const firstNine = experimentDefinitions.filter((item) => item.principleId !== 'simplicity');
  assert.equal(firstNine.length, 9);
  firstNine.forEach((definition) => assert.deepEqual(definition.initialState.elements, [], definition.principleId));

  const simplicity = experimentDefinitionsById['experiment-simplicity'];
  assert.ok(simplicity.initialState.elements.length > 0);
  assert.deepEqual(simplicity.initialState.elements, simplicity.initialState.beforeState);
  assert.notEqual(simplicity.initialState.elements, simplicity.initialState.beforeState);
  assert.notEqual(simplicity.initialState.elements[0], simplicity.initialState.beforeState[0]);
  assert.ok(simplicity.initialState.coreElementIds.length > 0);
  assert.ok(simplicity.initialState.elements.filter((item) => item.isCore).every((item) => simplicity.initialState.coreElementIds.includes(item.id)));
  assert.deepEqual(simplicity.initialState.nonDeletableElementIds, simplicity.initialState.coreElementIds);
});

test('student reset returns released experiments to blank and simplicity to a fresh complex clone', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const repetition = phase6cDefinitions[0];
  getExperimentState(course, repetition.id).workingElements = structuredClone(phase6cFixtures.repetition.pass.single);
  resetPhase6cExperiment(course, repetition);
  assert.deepEqual(getExperimentState(course, repetition.id).workingElements, []);

  const simplicity = experimentDefinitionsById['experiment-simplicity'];
  const session = createExperimentSessionState([simplicity]);
  const original = structuredClone(simplicity.initialState.elements);
  getExperimentState(session, simplicity.id).workingElements.pop();
  resetExperimentState(session, simplicity);
  assert.deepEqual(getExperimentState(session, simplicity.id).workingElements, original);
  assert.notEqual(getExperimentState(session, simplicity.id).workingElements, simplicity.initialState.elements);
});

test('blank formal artwork fails normally and keeps the existing diagnostic progression', () => {
  for (const definition of phase6cDefinitions) {
    const course = createPhase6cCourseState([definition]);
    const feedback = submitPhase6cExperiment(course, definition);
    assert.equal(feedback.result.passed, false, definition.principleId);
    assert.equal(getExperimentState(course, definition.id).workingElements.length, 0);
    assert.equal(getExperimentState(course, definition.id).attemptCount, 1);
    assert.equal(feedback.hint.level, 'observe');
  }
});

test('dev and automated PASS FAIL fixtures stay separate from student initial state', () => {
  for (const definition of phase6cDefinitions) {
    const fixtures = phase6cFixtures[definition.principleId];
    assert.ok(Object.keys(fixtures.pass).length > 0, definition.principleId);
    assert.ok(Object.keys(fixtures.fail).length > 0, definition.principleId);
    assert.notEqual(definition.initialState.elements, Object.values(fixtures.pass)[0]);
    assert.notEqual(definition.initialState.elements, Object.values(fixtures.fail)[0]);
  }
});
