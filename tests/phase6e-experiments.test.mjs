import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { createPhase6cCourseState, resetPhase6cExperiment, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';
import { nextHash, experimentActionsMarkup } from '../experiment-course.js';
import { resolveRoute } from '../router.js';
import { principles, stages } from '../data.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { COLOR_LIBRARY, HUE_FAMILIES, areNeighborHues } from '../geometry/constrained-tools.js';

const definition = (id) => phase6cDefinitionsById['experiment-' + id];
const validate = (id, elements, extra = {}) => validatePhase6cExperiment(definition(id), {
  workingElements: structuredClone(elements),
  beforeState: structuredClone(extra.beforeState ?? definition(id).initialState.beforeState ?? []),
  selectedExperimentOption: extra.selectedExperimentOption
});

test('formal experiment course contains all ten principles in the confirmed order', () => {
  assert.deepEqual(phase6cDefinitions.map((item) => item.principleId), ['repetition','gradation','balance','rhythm','symmetry','contrast','proportion','unity','harmony','simplicity']);
  for (const id of phase6cDefinitions.map((item) => item.principleId)) {
    assert.equal(resolveRoute('#level/experiment/' + id, stages, principles, recognizeQuestions).name, 'experiment');
  }
});

test('unity supports color rotation shapeFeature and multiple without requiring total sameness', () => {
  for (const method of ['color','rotation','shapeFeature','multiple']) {
    const result = validate('unity', phase6cFixtures.unity.pass[method]);
    assert.equal(result.passed, true, method);
    assert.ok(result.detectedMethods.includes(method === 'multiple' ? 'multiple' : method), method);
  }
  assert.ok(new Set(phase6cFixtures.unity.pass.color.map((item) => item.shape)).size > 1);
});
test('unity accepts exact shared shapes with different colors at the formal minimum', () => {
  for (const [shape, count] of [['circle', 4], ['square', 5]]) {
    const elements = Array.from({ length: count }, (_, index) => ({
      ...phase6cFixtures.unity.pass.color[index % phase6cFixtures.unity.pass.color.length],
      id: `${shape}-${index}`,
      shape,
      hue: ['red', 'yellow', 'green', 'blue', 'violet'][index]
    }));
    const result = validate('unity', elements);
    assert.equal(result.passed, true, shape);
    assert.ok(result.detectedMethods.includes('shapeFeature'), shape);
    assert.equal(result.metrics.exactShape.ratio, 1, shape);
  }
});

test('unity applies minimum element and whole-composition coverage to shared direction', () => {
  const directionalShapes = ['triangle', 'rectangle', 'semicircle', 'line'];
  const fourAligned = directionalShapes.map((shape, index) => ({
    ...phase6cFixtures.unity.pass.rotation[index], id: `aligned-${index}`, shape, rotation: 45
  }));
  const alignedResult = validate('unity', fourAligned);
  assert.equal(alignedResult.passed, true);
  assert.ok(alignedResult.detectedMethods.includes('rotation'));

  assert.equal(validate('unity', fourAligned.slice(0, 3)).passed, false);

  const plainShapes = ['circle', 'square', 'circle', 'square', 'circle'];
  const hiddenMinority = [
    ...plainShapes.map((shape, index) => ({
      ...phase6cFixtures.unity.pass.color[index], id: `plain-${index}`, shape,
      hue: ['red', 'yellow', 'green', 'blue', 'violet'][index]
    })),
    ...fourAligned.slice(0, 3).map((item, index) => ({
      ...item, id: `minority-${index}`, hue: ['red-orange', 'yellow-green', 'blue-violet'][index]
    }))
  ];
  const minorityResult = validate('unity', hiddenMinority);
  assert.equal(minorityResult.passed, false);
  assert.equal(minorityResult.metrics.directionCoverage, 3 / 8);
});

test('unity rejects too few exact shapes, dispersed directions and insufficient color coverage', () => {
  const threeCircles = ['red', 'blue', 'green'].map((hue, index) => ({
    ...phase6cFixtures.unity.pass.color[index], id: `three-${index}`, shape: 'circle', hue
  }));
  assert.equal(validate('unity', threeCircles).passed, false);

  const diverseShapes = ['triangle', 'rectangle', 'semicircle', 'line'];
  const dispersed = diverseShapes.map((shape, index) => ({
    ...phase6cFixtures.unity.pass.rotation[index], id: `dispersed-${index}`, shape,
    hue: ['red', 'yellow', 'green', 'blue'][index], rotation: [0, 45, 90, 135][index]
  }));
  assert.equal(validate('unity', dispersed).passed, false);

  const unrelated = ['circle', 'square', 'triangle', 'semicircle'].map((shape, index) => ({
    ...phase6cFixtures.unity.pass.color[index], id: `unrelated-${index}`, shape,
    hue: ['red', 'yellow', 'green', 'blue'][index], rotation: [0, 45, 90, 135][index]
  }));
  assert.equal(validate('unity', unrelated).passed, false);
});

test('unity rejects local coincidence and unrelated diversity', () => {
  assert.equal(validate('unity', phase6cFixtures.unity.fail.weak).passed, false);
  assert.equal(validate('unity', phase6cFixtures.unity.fail.unrelated).passed, false);
});

test('non directional shapes do not create rotation unity from metadata alone', () => {
  const elements = ['circle','square','circle','square'].map((shape,index) => ({ ...phase6cFixtures.unity.pass.color[index], id:'nd'+index, shape, hue:['red','blue','green','yellow'][index], rotation:45 }));
  const result = validate('unity', elements);
  assert.equal(result.passed, false);
  assert.equal(result.metrics.directionalCount, 0);
});

test('harmony supports same hue lightness neighboring hues ring wrap and mixed', () => {
  for (const method of ['sameHueLightness','neighborHue','wrapNeighbor','mixed']) {
    assert.equal(validate('harmony', phase6cFixtures.harmony.pass[method]).passed, true, method);
  }
  assert.equal(areNeighborHues('red','red-violet'), true);
  assert.equal(HUE_FAMILIES.length, 12);
  assert.equal(Object.keys(COLOR_LIBRARY).length, 60);
});
test('harmony preserves cool warm wraparound and same-hue lightness teaching cases', () => {
  const makeHarmony = (hues, lightnesses = hues.map(() => 3)) => hues.map((hue, index) => ({
    ...phase6cFixtures.harmony.pass.neighborHue[index % 4],
    id: `teaching-${hue}-${index}`, hue, lightness: lightnesses[index]
  }));
  assert.equal(validate('harmony', makeHarmony(['blue', 'blue-green', 'green', 'blue-green'])).passed, true);
  assert.equal(validate('harmony', makeHarmony(['red', 'red-orange', 'orange', 'yellow-orange'])).passed, true);
  assert.equal(validate('harmony', makeHarmony(['red', 'red-violet', 'red', 'red-violet'])).passed, true);
  assert.equal(validate('harmony', makeHarmony(['blue', 'blue', 'blue', 'blue'], [1, 2, 4, 5])).passed, true);
});

test('harmony rejects far colors isolated neighbor coincidence and complete identical color', () => {
  assert.equal(validate('harmony', phase6cFixtures.harmony.fail.far).primaryDiagnosticCode, 'COLORS_TOO_FAR_APART');
  assert.equal(validate('harmony', phase6cFixtures.harmony.fail.isolatedPair).passed, false);
  assert.equal(validate('harmony', phase6cFixtures.harmony.fail.identical).primaryDiagnosticCode, 'NO_CLEAR_HARMONY');
});

test('simplicity recognizes reduce organize variety and mixed paths', () => {
  for (const method of ['reduce','organize','simplifyVariety','mixed']) {
    const result = validate('simplicity', phase6cFixtures.simplicity.pass[method]);
    assert.equal(result.passed, true, method + ':' + result.primaryDiagnosticCode);
    assert.ok(result.detectedMethods.includes(method === 'mixed' ? 'multiple' : method), method);
  }
});

test('simplicity protects core and rejects unchanged scattered and over reduced states', () => {
  assert.equal(validate('simplicity', phase6cFixtures.simplicity.fail.notSimplified).primaryDiagnosticCode, 'NOT_SIMPLIFIED');
  assert.equal(validate('simplicity', phase6cFixtures.simplicity.fail.coreMissing).primaryDiagnosticCode, 'CORE_ELEMENT_MISSING');
  assert.equal(validate('simplicity', phase6cFixtures.simplicity.fail.stillDisorganized).primaryDiagnosticCode, 'STILL_DISORGANIZED');
  assert.equal(validate('simplicity', phase6cFixtures.simplicity.fail.overReduced).primaryDiagnosticCode, 'OVER_REDUCED');
});

test('simplicity core deletion is rejected by the engine and regular decoration deletion remains available', () => {
  const simplicity = definition('simplicity');
  const engine = new ConstrainedGeometryEngine({ elements: simplicity.initialState.elements, allowedTools: simplicity.allowedTools, nonDeletableElementIds: simplicity.initialState.nonDeletableElementIds });
  const coreId = simplicity.initialState.coreElementIds[0];
  const decoration = simplicity.initialState.elements.find((item) => !simplicity.initialState.coreElementIds.includes(item.id));
  assert.equal(engine.delete(coreId).reason, 'protected-element');
  assert.equal(engine.getState().elements.some((item) => item.id === coreId), true);
  assert.equal(engine.delete(decoration.id).changed, true);
});

test('unity and harmony reset blank while simplicity restores a fresh official before state', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  for (const id of ['unity','harmony']) {
    const item = definition(id); const state = getExperimentState(course,item.id);
    state.workingElements = structuredClone(phase6cFixtures[id].pass[Object.keys(phase6cFixtures[id].pass)[0]]);
    resetPhase6cExperiment(course,item);
    assert.deepEqual(getExperimentState(course,item.id).workingElements,[]);
  }
  const simplicity = definition('simplicity');
  getExperimentState(course,simplicity.id).workingElements.pop();
  resetPhase6cExperiment(course,simplicity);
  assert.deepEqual(getExperimentState(course,simplicity.id).workingElements,simplicity.initialState.elements);
  assert.notEqual(getExperimentState(course,simplicity.id).workingElements,simplicity.initialState.elements);
});

test('final progression continues proportion unity harmony simplicity completion', () => {
  assert.equal(nextHash(definition('proportion')), '#level/experiment/unity');
  assert.equal(nextHash(definition('unity')), '#level/experiment/harmony');
  assert.equal(nextHash(definition('harmony')), '#level/experiment/simplicity');
  assert.equal(nextHash(definition('simplicity')), '#level/experiment/complete');
});

test('new experiments require explicit review and expose next only after success', () => {
  for (const id of ['unity','harmony','simplicity']) {
    const item = definition(id); const course = createPhase6cCourseState(phase6cDefinitions);
    assert.match(experimentActionsMarkup(course,item,null), /檢查構圖/);
    assert.doesNotMatch(experimentActionsMarkup(course,item,null), /下一個挑戰/);
    getExperimentState(course,item.id).workingElements = structuredClone(phase6cFixtures[id].pass[Object.keys(phase6cFixtures[id].pass)[0]]);
    const feedback = submitPhase6cExperiment(course,item);
    assert.equal(feedback.result.passed,true,id);
    const nextLabel = id === 'simplicity' ? '完成視覺實驗室' : '下一個挑戰';
    assert.match(experimentActionsMarkup(course,item,feedback), new RegExp(nextLabel));
  }
});

test('new experiment diagnostics retain observe think action escalation', () => {
  for (const id of ['unity','harmony','simplicity']) {
    const item=definition(id); const course=createPhase6cCourseState([item]);
    getExperimentState(course,item.id).workingElements=structuredClone(phase6cFixtures[id].fail[Object.keys(phase6cFixtures[id].fail)[0]]);
    assert.equal(submitPhase6cExperiment(course,item).hint.level,'observe');
    assert.equal(submitPhase6cExperiment(course,item).hint.level,'think');
    assert.equal(submitPhase6cExperiment(course,item).hint.level,'action');
  }
});

test('only simplicity has formal initial artwork across all ten experiments', () => {
  for (const item of phase6cDefinitions) {
    assert.equal(item.initialState.elements.length > 0, item.principleId === 'simplicity', item.principleId);
  }
});
