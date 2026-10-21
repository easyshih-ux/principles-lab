import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  experimentActionsMarkup,
  feedbackMarkup,
  nextHash
} from '../experiment-course.js';
import {
  advancePhase6c,
  canAdvancePhase6c,
  createPhase6cFingerprint,
  createPhase6cCourseState,
  invalidatePhase6cValidationIfChanged,
  resetPhase6cExperiment,
  selectPhase6cExperimentOption,
  submitPhase6cExperiment,
  updatePhase6cWorkingElements
} from '../phase6c-course-state.js';
import { phase6cDefinitions } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { getExperimentState } from '../experiment-session.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';

const rendererSource = readFileSync(new URL('../experiment-course.js', import.meta.url), 'utf8');
const fixture = (definition, kind) => structuredClone(Object.values(phase6cFixtures[definition.principleId][kind])[0]);

test('formal balance submit path rejects a mirrored runtime canvas composition', () => {
  const definition = phase6cDefinitions.find((item) => item.principleId === 'balance');
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  const engine = new ConstrainedGeometryEngine({
    elements: [
      { id: 'runtime-left', shape: 'square', x: 280, y: 360, size: 3, hue: 'blue', lightness: 3, rotation: 0, proportion: 1 },
      { id: 'runtime-right', shape: 'square', x: 720, y: 360, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1 }
    ],
    allowedTools: definition.allowedTools
  });
  state.workingElements = engine.getState().elements;

  const feedback = submitPhase6cExperiment(course, definition);

  assert.equal(feedback.result.passed, false);
  assert.equal(feedback.result.primaryDiagnosticCode, 'ASYMMETRY_REQUIRED');
  assert.equal(state.completed, false);
  assert.match(feedbackMarkup(definition, feedback), /左右太像|改變一邊的大小、數量或位置/);
  assert.match(experimentActionsMarkup(course, definition, feedback), /id="experiment-check"/);
  assert.doesNotMatch(experimentActionsMarkup(course, definition, feedback), /id="experiment-next"/);
});

test('all four formal student experiments initially expose one explicit review point', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  for (const definition of phase6cDefinitions) {
    const markup = experimentActionsMarkup(course, definition, null);
    assert.match(markup, /id="experiment-check">檢查構圖<\/button>/);
    assert.doesNotMatch(markup, /id="experiment-next"/);
  }
  assert.equal((rendererSource.match(/id="experiment-check"/g) ?? []).length, 1);
  assert.match(rendererSource, /#experiment-check'\)\?\.addEventListener\('click'[\s\S]*?submitPhase6cExperiment/);
});

test('editing alone never validates or advances a formal experiment', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions[0];
  const state = getExperimentState(course, definition.id);
  course.currentExperimentId = definition.id;
  state.workingElements = fixture(definition, 'pass');
  assert.equal(state.attemptCount, 0);
  assert.equal(state.completed, false);
  assert.equal(course.currentExperimentId, definition.id);
  assert.equal(course.currentIndex, 0);
});

test('failed reviews preserve work, stay on the current experiment and escalate observe think action', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions[0];
  const state = getExperimentState(course, definition.id);
  const failedWork = fixture(definition, 'fail');
  state.workingElements = failedWork;
  course.currentExperimentId = definition.id;

  const first = submitPhase6cExperiment(course, definition);
  assert.equal(first.hint.level, 'observe');
  assert.deepEqual(state.workingElements, failedWork);
  assert.equal(course.currentExperimentId, definition.id);
  assert.match(feedbackMarkup(definition, first), /再觀察一下/);
  assert.match(feedbackMarkup(definition, first), new RegExp(first.result.studentDetail ?? first.hint.text));
  assert.match(experimentActionsMarkup(course, definition, first), /再次檢查/);
  assert.doesNotMatch(experimentActionsMarkup(course, definition, first), /下一個挑戰/);

  const second = submitPhase6cExperiment(course, definition);
  const third = submitPhase6cExperiment(course, definition);
  assert.equal(second.hint.level, 'think');
  assert.equal(third.hint.level, 'action');
  assert.equal(state.attemptCount, 3);
  assert.equal(course.currentIndex, 0);
});

test('success keeps the composition, renders feedback and only then exposes next challenge', () => {
  for (const definition of phase6cDefinitions) {
    const course = createPhase6cCourseState(phase6cDefinitions);
    const state = getExperimentState(course, definition.id);
    const passingWork = fixture(definition, 'pass');
    state.workingElements = passingWork;
    const feedback = submitPhase6cExperiment(course, definition);

    assert.equal(feedback.result.passed, true);
    assert.deepEqual(state.workingElements, passingWork);
    assert.match(feedbackMarkup(definition, feedback), /成功！/);
    assert.match(feedbackMarkup(definition, feedback), /小發現/);
    const nextLabel = definition.principleId === 'simplicity' ? '完成視覺實驗室' : '下一個挑戰';
    assert.match(experimentActionsMarkup(course, definition, feedback), new RegExp(`id="experiment-next">${nextLabel}<\\/button>`));
    assert.doesNotMatch(experimentActionsMarkup(course, definition, feedback), /id="experiment-check"/);
    assert.equal(course.currentIndex, 0, 'success must not auto-advance');
  }
});

test('successful work cannot advance after its canvas content changes', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions[0];
  const state = getExperimentState(course, definition.id);
  state.workingElements = fixture(definition, 'pass');
  submitPhase6cExperiment(course, definition);
  assert.equal(canAdvancePhase6c(course, definition), true);

  state.workingElements = [...state.workingElements, {
    ...state.workingElements[0], id: 'changed-after-success', x: state.workingElements[0].x + 40
  }];
  assert.equal(canAdvancePhase6c(course, definition), false);
});

test('fingerprints are stable for UI-only state and preserve stacking order', () => {
  const definition = phase6cDefinitions[0];
  const elements = fixture(definition, 'pass');
  const uiOnly = elements.map((item, index) => ({
    ...item, selected: index === 0, dragging: index === 1, previewX: 999
  }));
  assert.equal(createPhase6cFingerprint(uiOnly), createPhase6cFingerprint(elements));
  assert.notEqual(createPhase6cFingerprint([...elements].reverse()), createPhase6cFingerprint(elements));
});

test('every validator-relevant canvas edit invalidates only the current pass', () => {
  const definition = phase6cDefinitions[0];
  const passingWork = fixture(definition, 'pass');
  const edits = {
    add: (items) => [...items, { ...items[0], id: 'added', x: items[0].x + 80 }],
    move: (items) => items.map((item, index) => index ? item : { ...item, x: item.x + 20 }),
    delete: (items) => items.slice(0, -1),
    duplicate: (items) => [...items, { ...items[0], id: 'duplicate', x: items[0].x + 40 }],
    size: (items) => items.map((item, index) => index ? item : { ...item, size: item.size === 5 ? 1 : 5 }),
    color: (items) => items.map((item, index) => index ? item : { ...item, hue: item.hue === 'red' ? 'blue' : 'red' }),
    lightness: (items) => items.map((item, index) => index ? item : { ...item, lightness: item.lightness === 5 ? 1 : 5 }),
    rotation: (items) => items.map((item, index) => index ? item : { ...item, rotation: item.rotation === 90 ? 45 : 90 }),
    proportion: (items) => items.map((item, index) => index ? item : { ...item, proportion: item.proportion === 3 ? 1 : 3 })
  };

  for (const [operation, edit] of Object.entries(edits)) {
    const course = createPhase6cCourseState(phase6cDefinitions);
    const state = getExperimentState(course, definition.id);
    state.workingElements = structuredClone(passingWork);
    submitPhase6cExperiment(course, definition);
    const changed = edit(structuredClone(state.workingElements));
    assert.equal(updatePhase6cWorkingElements(course, definition, changed), true, operation);
    assert.equal(state.completed, true, `${operation} preserves history`);
    assert.equal(state.currentValidationPassed, false, operation);
    assert.equal(canAdvancePhase6c(course, definition), false, operation);
    assert.deepEqual(course.feedbackById[definition.id], { stale: true }, operation);
    assert.deepEqual(state.workingElements, changed, `${operation} preserves work`);
  }
});

test('selection, redraw, and unchanged payloads do not invalidate a current pass', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions[0];
  const state = getExperimentState(course, definition.id);
  state.workingElements = fixture(definition, 'pass');
  submitPhase6cExperiment(course, definition);
  const uiOnly = state.workingElements.map((item, index) => ({ ...item, selected: index === 0 }));
  assert.equal(updatePhase6cWorkingElements(course, definition, uiOnly), false);
  assert.equal(invalidatePhase6cValidationIfChanged(course, definition), false);
  assert.equal(canAdvancePhase6c(course, definition), true);
});

test('a stale composition must pass review again before next is restored', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions[0];
  const state = getExperimentState(course, definition.id);
  const passingWork = fixture(definition, 'pass');
  state.workingElements = structuredClone(passingWork);
  submitPhase6cExperiment(course, definition);
  updatePhase6cWorkingElements(course, definition, [
    ...state.workingElements,
    { ...state.workingElements[0], id: 'temporary-change', x: state.workingElements[0].x + 40 }
  ]);
  assert.match(feedbackMarkup(definition, course.feedbackById[definition.id]), /作品有新的變化/);
  assert.match(experimentActionsMarkup(course, definition, course.feedbackById[definition.id]), /再次檢查/);
  assert.doesNotMatch(experimentActionsMarkup(course, definition, course.feedbackById[definition.id]), /experiment-next/);

  updatePhase6cWorkingElements(course, definition, structuredClone(passingWork));
  assert.equal(canAdvancePhase6c(course, definition), false, 'returning to the old fingerprint stays conservative');
  submitPhase6cExperiment(course, definition);
  assert.equal(canAdvancePhase6c(course, definition), true);
  assert.match(experimentActionsMarkup(course, definition, course.feedbackById[definition.id]), /experiment-next/);
});

test('successful symmetry cannot advance after switching validation mode', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const definition = phase6cDefinitions.find((item) => item.principleId === 'symmetry');
  const state = getExperimentState(course, definition.id);
  state.workingElements = structuredClone(phase6cFixtures.symmetry.pass.vertical);
  state.selectedExperimentOption = 'vertical';
  submitPhase6cExperiment(course, definition);
  assert.equal(canAdvancePhase6c(course, definition), true);

  assert.equal(selectPhase6cExperimentOption(course, definition, 'horizontal'), true);
  assert.equal(canAdvancePhase6c(course, definition), false);
  assert.equal(state.completed, true);
  assert.deepEqual(course.feedbackById[definition.id], { stale: true });
  assert.equal(selectPhase6cExperimentOption(course, definition, 'vertical'), false);
  assert.equal(canAdvancePhase6c(course, definition), false, 'switching back cannot restore the old pass');

  state.workingElements = structuredClone(phase6cFixtures.symmetry.pass.horizontal);
  state.selectedExperimentOption = 'horizontal';
  submitPhase6cExperiment(course, definition);
  assert.equal(canAdvancePhase6c(course, definition), true);
});

test('explicit next challenge follows the ten-route formal progression', () => {
  const expectedRoutes = [
    '#level/experiment/gradation',
    '#level/experiment/balance',
    '#level/experiment/rhythm',
    '#level/experiment/symmetry',
    '#level/experiment/contrast',
    '#level/experiment/proportion',
    '#level/experiment/unity',
    '#level/experiment/harmony',
    '#level/experiment/simplicity',
    '#level/experiment/complete'
  ];
  const course = createPhase6cCourseState(phase6cDefinitions);

  phase6cDefinitions.forEach((definition, index) => {
    const state = getExperimentState(course, definition.id);
    state.workingElements = fixture(definition, 'pass');
    if (definition.principleId === 'symmetry') state.selectedExperimentOption = 'vertical';
    submitPhase6cExperiment(course, definition);
    assert.equal(nextHash(definition), expectedRoutes[index]);
    advancePhase6c(course, definition);
  });

  assert.equal(course.currentIndex, phase6cDefinitions.length);
});

test('reset clears only the active experiment review state', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const current = phase6cDefinitions[0];
  const currentState = getExperimentState(course, current.id);
  currentState.attemptCount = 3;
  currentState.completed = true;
  currentState.currentValidationPassed = true;
  course.feedbackById[current.id] = { result: { passed: true }, hint: null };
  for (const other of phase6cDefinitions.slice(1)) {
    const otherState = getExperimentState(course, other.id);
    otherState.attemptCount = 2;
    otherState.completed = true;
    course.feedbackById[other.id] = { result: { passed: true }, hint: null };
  }
  course.completed = true;

  resetPhase6cExperiment(course, current);

  assert.equal(getExperimentState(course, current.id).attemptCount, 0);
  assert.equal(getExperimentState(course, current.id).completed, true);
  assert.equal(getExperimentState(course, current.id).currentValidationPassed, false);
  assert.deepEqual(course.feedbackById[current.id], { stale: true });
  for (const other of phase6cDefinitions.slice(1)) {
    assert.equal(getExperimentState(course, other.id).attemptCount, 2);
    assert.equal(getExperimentState(course, other.id).completed, true);
    assert.notEqual(course.feedbackById[other.id], null);
  }
  assert.equal(course.completed, true, 'historical level completion is never revoked locally');
});

test('formal three-column workspace keeps side tools around the canvas and actions directly below it', () => {
  const workspaceIndex = rendererSource.indexOf('<section class="experiment-workspace');
  const leftIndex = rendererSource.indexOf('experiment-tool-panel-left');
  const centerIndex = rendererSource.indexOf('experiment-center-workspace');
  const canvasIndex = rendererSource.indexOf('<div class="experiment-canvas-wrap');
  const footerIndex = rendererSource.indexOf('<footer class="experiment-footer">');
  const rightIndex = rendererSource.indexOf('experiment-tool-panel-right');
  assert.ok(workspaceIndex >= 0 && leftIndex > workspaceIndex && centerIndex > leftIndex && canvasIndex > centerIndex && footerIndex > canvasIndex && rightIndex > footerIndex);
});
