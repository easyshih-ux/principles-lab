import test from 'node:test';
import assert from 'node:assert/strict';
import { auditComposition } from '../composition-audit.js';
import { phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { createSimplicityInitialArtwork } from '../simplicity-initial-state.js';
import { resolveDiagnosticHint } from '../experiment-hints.js';

const element = (id, values = {}) => ({
  id, shape: 'circle', x: 300, y: 300, size: 3, hue: 'blue',
  lightness: 3, rotation: 0, proportion: 1, ...values
});
const definition = (id) => phase6cDefinitionsById[`experiment-${id}`];
const validate = (id, elements, selectedExperimentOption) => validatePhase6cExperiment(definition(id), {
  workingElements: structuredClone(elements),
  beforeState: structuredClone(definition(id).initialState.beforeState ?? []),
  coreElementIds: [...(definition(id).initialState.coreElementIds ?? [])],
  selectedExperimentOption
});

test('audit collapses only high-confidence identical visible placements', () => {
  const elements = Array.from({ length: 7 }, (_, index) => element(`stack-${index}`));
  const result = auditComposition(elements);
  assert.equal(result.rawElementCount, 7);
  assert.equal(result.effectiveElementCount, 1);
  assert.deepEqual(result.duplicateElementIds, elements.slice(1).map(({ id }) => id));
  assert.equal(result.hasObviousPadding, true);
  assert.equal(result.diagnosticCode, 'EXCESSIVE_OVERLAP');
  assert.match(result.studentMessage, /完全疊在一起/);
});

test('visually equivalent circle and square rotations cannot inflate effective counts', () => {
  const circles = [0, 45, 90].map((rotation, index) => element(`circle-${index}`, { rotation }));
  const squares = [0, 90, 180].map((rotation, index) => element(`square-${index}`, {
    shape: 'square', rotation
  }));
  const rectangles = [0, 180].map((rotation, index) => element(`rectangle-${index}`, {
    shape: 'rectangle', rotation
  }));
  const lines = [45, 225].map((rotation, index) => element(`line-${index}`, {
    shape: 'line', rotation
  }));
  for (const elements of [circles, squares, rectangles, lines]) {
    const result = auditComposition(elements);
    assert.equal(result.effectiveElementCount, 1);
    assert.deepEqual(result.duplicateElementIds, elements.slice(1).map(({ id }) => id));
    assert.equal(result.hasObviousPadding, elements.length >= 3);
  }
});

test('rotation metadata on concentric contrast circles cannot manufacture six visible elements', () => {
  const elements = [0, 45, 90].flatMap((rotation, index) => [
    element(`large-red-${index}`, { x: 500, y: 300, size: 5, hue: 'red', rotation }),
    element(`small-blue-${index}`, { x: 500, y: 300, size: 1, hue: 'blue', rotation })
  ]);
  const result = validate('contrast', elements);
  assert.equal(result.passed, false);
  assert.equal(result.primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
  assert.equal(result.metrics.compositionAudit.effectiveElementCount, 2);
});

test('legal separated and partially overlapping contrast groups still pass', () => {
  const separated = phase6cFixtures.contrast.pass.dual;
  const overlapping = separated.map((item, index) => ({
    ...item,
    x: index < 3 ? 220 + index * 45 : 610 + (index - 3) * 45,
    y: index % 2 ? 305 : 270
  }));
  assert.equal(validate('contrast', separated).passed, true);
  assert.equal(validate('contrast', overlapping).passed, true);
});

test('partial overlap, concentric layers, rotated triangles, and crossing lines remain distinct', () => {
  const cases = [
    [element('partial-a'), element('partial-b', { x: 320 })],
    [element('center-small', { size: 1, hue: 'yellow' }), element('center-large', { size: 5, hue: 'blue' })],
    [element('triangle-a', { shape: 'triangle', rotation: 0 }), element('triangle-b', { shape: 'triangle', rotation: 90 })],
    [element('semicircle-a', { shape: 'semicircle', rotation: 0 }), element('semicircle-b', { shape: 'semicircle', rotation: 90 })],
    [element('rectangle-a', { shape: 'rectangle', rotation: 0 }), element('rectangle-b', { shape: 'rectangle', rotation: 90 })],
    [element('line-a', { shape: 'line', rotation: 0 }), element('line-b', { shape: 'line', rotation: 90 })]
  ];
  for (const elements of cases) {
    const result = auditComposition(elements);
    assert.equal(result.effectiveElementCount, 2);
    assert.equal(result.duplicateElementIds.length, 0);
    assert.equal(result.hasObviousPadding, false);
  }
});

test('concentrated compositions and large blank areas are not audited by coverage or quadrants', () => {
  const elements = Array.from({ length: 7 }, (_, index) => element(`cluster-${index}`, {
    x: 300 + (index % 3) * 30,
    y: 250 + Math.floor(index / 3) * 30
  }));
  const result = auditComposition(elements);
  assert.equal(result.effectiveElementCount, 7);
  assert.equal(result.hasObviousPadding, false);
});

test('formal repetition rejects seven stacked singles and four stacked AB copies', () => {
  const singles = Array.from({ length: 7 }, (_, index) => element(`single-${index}`));
  assert.equal(validate('repetition', singles).primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
  const groups = Array.from({ length: 4 }, (_, index) => [
    element(`a-${index}`, { x: 300 }),
    element(`b-${index}`, { x: 360, shape: 'triangle', size: 2, hue: 'red' })
  ]).flat();
  const result = validate('repetition', groups);
  assert.equal(result.primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
  assert.equal(result.metrics.compositionAudit.effectiveElementCount, 2);
});

test('formal symmetry cannot use stacked copies to manufacture four mirror pairs', () => {
  const elements = Array.from({ length: 4 }, (_, index) => [
    element(`left-${index}`, { x: 300, y: 220 }),
    element(`right-${index}`, { x: 700, y: 220 })
  ]).flat();
  assert.equal(validate('symmetry', elements, 'vertical').primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
});

test('formal contrast and unity cannot fill minimum counts with stacked copies', () => {
  const contrast = phase6cFixtures.contrast.pass.dual.map((item, index) => ({
    ...item,
    x: index < 3 ? 300 : 700,
    y: 300
  }));
  assert.equal(validate('contrast', contrast).primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
  const unity = Array.from({ length: 7 }, (_, index) => element(`unity-${index}`, { x: 500 }));
  assert.equal(validate('unity', unity).primaryDiagnosticCode, 'EXCESSIVE_OVERLAP');
});

test('overlap diagnostics resolve to concrete student-facing guidance', () => {
  const hint = resolveDiagnosticHint(definition('repetition'), 'EXCESSIVE_OVERLAP', 3);
  assert.equal(hint.level, 'action');
  assert.match(hint.text, /移開一點/);
  assert.doesNotMatch(hint.text, /ID|AABB|比例|座標/);
});

test('all formal validators expose the same composition audit metrics', () => {
  for (const id of ['repetition','gradation','balance','rhythm','symmetry','contrast','proportion','unity','harmony','simplicity']) {
    const source = id === 'simplicity' ? createSimplicityInitialArtwork() : [];
    const result = validate(id, source, id === 'symmetry' ? 'vertical' : undefined);
    assert.equal(typeof result.metrics.compositionAudit.rawElementCount, 'number', id);
    assert.equal(typeof result.metrics.compositionAudit.effectiveElementCount, 'number', id);
  }
});

test('official flower, legal simplifications, and balance rhythm proportion passes survive the audit', () => {
  const official = auditComposition(createSimplicityInitialArtwork(), {
    preserveElementIds: definition('simplicity').initialState.coreElementIds
  });
  assert.equal(official.rawElementCount, 10);
  assert.equal(official.effectiveElementCount, 10);
  assert.equal(official.hasObviousPadding, false);
  for (const fixture of Object.values(phase6cFixtures.simplicity.pass)) {
    assert.equal(validate('simplicity', fixture).passed, true);
  }
  for (const id of ['balance','rhythm','proportion']) {
    for (const fixture of Object.values(phase6cFixtures[id].pass)) {
      assert.equal(validate(id, fixture).passed, true, id);
    }
  }
});
