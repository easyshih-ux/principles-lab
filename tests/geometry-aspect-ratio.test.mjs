import test from 'node:test';
import assert from 'node:assert/strict';
import { getShapeDimensions } from '../geometry/bounds.js';
import { logicalScaleToScreen } from '../geometry/coordinates.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { createPhase6cCourseState, resetPhase6cExperiment } from '../phase6c-course-state.js';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { getExperimentState } from '../experiment-session.js';

const canvas = { width: 1000, height: 600 };
const nonUniformViewport = { width: 700, height: 500 };
const baseElement = (shape) => ({ id: shape, shape, x: 500, y: 300, size: 3, hue: 'blue', lightness: 3, rotation: 0, proportion: 1 });

function screenDimensions(element) {
  const logical = getShapeDimensions(element);
  const scale = logicalScaleToScreen(nonUniformViewport, canvas);
  return { width: logical.width * scale, height: logical.height * scale };
}

function sizeEngine(shape) {
  const engine = new ConstrainedGeometryEngine({ elements: [baseElement(shape)], allowedTools: { size: true, duplicate: true } });
  engine.select(shape);
  return engine;
}

function ratioEngine(shape) {
  const engine = new ConstrainedGeometryEngine({ elements: [baseElement(shape)], allowedTools: { ratioSize: true, duplicate: true } });
  engine.select(shape);
  return engine;
}

test('square stays square across 1-5 and reverse size sequences', () => {
  const engine = sizeEngine('square');
  for (const level of [1, 2, 3, 4, 5, 1, 5]) {
    engine.setProperty('size', level);
    const dimensions = screenDimensions(engine.getSelectedElement());
    assert.equal(dimensions.width, dimensions.height);
  }
});

test('circle stays circular at every size level', () => {
  const engine = sizeEngine('circle');
  for (const level of [1, 2, 3, 4, 5]) {
    engine.setProperty('size', level);
    const dimensions = screenDimensions(engine.getSelectedElement());
    assert.equal(dimensions.width, dimensions.height);
  }
});

test('triangle semicircle and rectangle keep fixed aspect ratios through repeated resizing', () => {
  for (const [shape, ratio] of [['triangle', 1], ['semicircle', 3], ['rectangle', 1.5]]) {
    const engine = sizeEngine(shape);
    for (const level of [1, 5, 2, 4, 3, 1]) {
      engine.setProperty('size', level);
      const dimensions = screenDimensions(engine.getSelectedElement());
      assert.equal(dimensions.width / dimensions.height, ratio, `${shape} size ${level}`);
    }
  }
});

test('ratioSize scales whole shapes in 1-2-3 and 3-1-2 sequences without drift', () => {
  for (const shape of ['circle', 'square', 'triangle', 'semicircle', 'rectangle']) {
    const engine = ratioEngine(shape);
    const initial = getShapeDimensions(engine.getSelectedElement());
    const expectedRatio = initial.width / initial.height;
    for (const level of [1, 2, 3, 3, 1, 2]) {
      engine.setProperty('ratioLevel', level);
      const element = engine.getSelectedElement();
      const dimensions = screenDimensions(element);
      assert.equal(element.logicalSize, level * 40);
      assert.ok(Math.abs(dimensions.width / dimensions.height - expectedRatio) < 1e-12, `${shape} ratio ${level}`);
    }
  }
});

test('duplicate then resize does not distort source or copy', () => {
  const engine = sizeEngine('square');
  engine.duplicate();
  const copyId = engine.getSelectedElement().id;
  engine.setProperty('size', 5);
  const copy = engine.getSelectedElement();
  const source = engine.getState().elements.find((element) => element.id !== copyId);
  assert.equal(screenDimensions(copy).width, screenDimensions(copy).height);
  assert.equal(screenDimensions(source).width, screenDimensions(source).height);
  assert.equal(source.size, 3);
});

test('proportion reset returns blank state and a new element starts with canonical aspect ratio', () => {
  const definition = phase6cDefinitionsById['experiment-proportion'];
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  state.workingElements = [baseElement('square')];
  resetPhase6cExperiment(course, definition);
  assert.deepEqual(getExperimentState(course, definition.id).workingElements, []);
  const engine = ratioEngine('square');
  const dimensions = screenDimensions(engine.getSelectedElement());
  assert.equal(dimensions.width, dimensions.height);
});

test('uniform render scale is independent of selection outline and axis-specific stretch', () => {
  const scale = logicalScaleToScreen(nonUniformViewport, canvas);
  assert.equal(scale, 0.7);
  assert.deepEqual(screenDimensions({ shape: 'square', logicalSize: 80 }), { width: 56, height: 56 });
});
