import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createPhase6cCourseState, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const definition = phase6cDefinitionsById['experiment-repetition'];
const fixtures = phase6cFixtures.repetition;
const validate = (elements) => validatePhase6cExperiment(definition, { workingElements: elements });
const clone = (items) => structuredClone(items);
const without = (items, ...ids) => clone(items).filter((item) => !ids.includes(item.id));
const engineering = /[A-Z_]{4,}|threshold|門檻|座標|\bid\b|\d+\s*px|\bA\b|\bB\b|ru-|rt-|rk-|rx-/;
const NOT_GROUPED = '你的造形已經反覆出現了！下一步：把它們組成一個單元，讓每個單元都一樣，就能完成這一關。';

test('Gate 4 repetition: teacher sample (triangle + circle + square unit ×5) passes', () => {
  const result = validate(fixtures.pass.group);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['unit']);
  assert.equal(result.metrics.unitCount, 5);
  assert.equal(result.metrics.unitSize, 3);
});

test('Gate 4 repetition: teacher sample shapes scattered without units fail with the agreed message', () => {
  const result = validate(fixtures.fail.scattered);
  assert.equal(result.passed, false);
  assert.equal(result.primaryDiagnosticCode, 'NOT_GROUPED_INTO_UNITS');
  assert.equal(result.studentDetail, NOT_GROUPED);
});

test('Gate 4 repetition: turned and flipped units still count as the same unit', () => {
  assert.equal(validate(fixtures.pass.turnedUnits).passed, true);
});

test('Gate 4 repetition: overlapping shapes, two-shape units and ▲▼ units pass; more than five units pass', () => {
  assert.equal(validate(fixtures.pass.concentric).passed, true);
  assert.equal(validate(fixtures.pass.directionUnit).passed, true);
  const six = [...clone(fixtures.pass.concentric), { id: 'k6s', shape: 'square', x: 860, y: 450, size: 4, hue: 'blue', lightness: 3, rotation: 0 }, { id: 'k6c', shape: 'circle', x: 860, y: 450, size: 2, hue: 'yellow', lightness: 3, rotation: 0 }];
  six.find((item) => item.id === 'rk-s-4').x = 560; six.find((item) => item.id === 'rk-c-4').x = 560;
  assert.equal(validate(six).passed, true);
});

test('Gate 4 repetition: shapes repeated on their own (no units) fail with the agreed message', () => {
  assert.equal(validate(fixtures.fail.singleKind).studentDetail, NOT_GROUPED);
  assert.equal(validate(fixtures.fail.two).studentDetail, NOT_GROUPED);
});

test('Gate 4 repetition: four units are not enough and say how many are missing', () => {
  const four = without(fixtures.pass.group, 'ru-t-4', 'ru-c-4', 'ru-s-4');
  const result = validate(four);
  assert.equal(result.primaryDiagnosticCode, 'NOT_ENOUGH_REPETITION');
  assert.equal(result.studentDetail, '目前有 4 個單元，再做 1 個就完成了。');
  assert.equal(validate(without(fixtures.pass.group, 'ru-t-1', 'ru-c-1', 'ru-s-1', 'ru-t-2', 'ru-c-2', 'ru-s-2', 'ru-t-3', 'ru-c-3', 'ru-s-3', 'ru-t-4', 'ru-c-4', 'ru-s-4')).studentDetail, '目前有 1 個單元，再做 4 個就完成了。');
});

test('Gate 4 repetition: a shape outside every unit is named by place, colour and shape', () => {
  const elements = [...clone(fixtures.pass.group), { id: 'stray', shape: 'square', x: 920, y: 560, size: 1, hue: 'yellow-orange', lightness: 3, rotation: 0 }];
  const result = validate(elements);
  assert.equal(result.primaryDiagnosticCode, 'OUTSIDE_UNIT');
  assert.equal(result.studentDetail, '右下角有一個橘色正方形不屬於任何單元。可以刪除它，或把它加進單元裡。');
});

test('Gate 4 repetition: a unit missing a shape is named', () => {
  const result = validate(without(fixtures.pass.group, 'ru-c-0'));
  assert.equal(result.primaryDiagnosticCode, 'UNIT_MISSING_SHAPE');
  assert.equal(result.studentDetail, '左邊有一個單元少了紅色圓形。補上之後，讓它和其他單元一樣。');
});

test('Gate 4 repetition: a unit with an extra shape is named', () => {
  const elements = [...clone(fixtures.pass.group), { id: 'extra', shape: 'circle', x: 860, y: 450, size: 1, hue: 'blue', lightness: 3, rotation: 0 }];
  const result = validate(elements);
  assert.equal(result.primaryDiagnosticCode, 'UNIT_EXTRA_SHAPE');
  assert.match(result.studentDetail, /有一個單元多了藍色圓形/);
});

test('Gate 4 repetition: different colour and different arrangement are told apart', () => {
  const colour = clone(fixtures.pass.group); colour.find((item) => item.id === 'ru-c-2').hue = 'blue';
  assert.equal(validate(colour).primaryDiagnosticCode, 'UNIT_COLOR_SIZE_DIFFERENT');
  assert.match(validate(colour).studentDetail, /^上方那個單元的顏色或大小/);
  const moved = clone(fixtures.pass.group); Object.assign(moved.find((item) => item.id === 'ru-s-3'), { x: 640, y: 460 });
  const result = validate(moved);
  assert.equal(result.primaryDiagnosticCode, 'UNIT_ARRANGEMENT_DIFFERENT');
  assert.match(result.studentDetail, /^下方那個單元的排法和其他單元不一樣/);
});

test('Gate 4 repetition: a triangle turned on its own (not the whole unit) is an arrangement change', () => {
  const turned = clone(fixtures.pass.group); turned.find((item) => item.id === 'ru-t-1').rotation = 90;
  assert.equal(validate(turned).primaryDiagnosticCode, 'UNIT_ARRANGEMENT_DIFFERENT');
});

test('Gate 4 repetition: units touching each other are reported, not guessed', () => {
  const row = Array.from({ length: 10 }, (_, index) => ({ id: `w-${index}`, shape: index % 2 ? 'square' : 'circle', x: 70 + index * 90, y: 300, size: index % 2 ? 2 : 3, hue: index % 2 ? 'red' : 'blue', lightness: 3, rotation: 0 }));
  const result = validate(row);
  assert.equal(result.primaryDiagnosticCode, 'UNITS_TOUCHING');
  assert.match(result.studentDetail, /單元和單元之間留一點空隙/);
});

test('Gate 4 repetition: an empty canvas and unrelated shapes ask for a unit first', () => {
  assert.equal(validate([]).primaryDiagnosticCode, 'NO_REPEAT_UNIT');
  assert.equal(validate(fixtures.fail.inconsistent).primaryDiagnosticCode, 'NO_REPEAT_UNIT');
});

test('Gate 4 repetition: every diagnosis has hints, and no A/B or engineering words reach students', () => {
  const cases = [
    [], fixtures.fail.scattered, fixtures.fail.inconsistent, without(fixtures.pass.group, 'ru-c-0'), without(fixtures.pass.group, 'ru-t-4', 'ru-c-4', 'ru-s-4'),
    [...clone(fixtures.pass.group), { id: 'stray', shape: 'square', x: 920, y: 560, size: 1, hue: 'yellow-orange', lightness: 3, rotation: 0 }]
  ];
  for (const elements of cases) {
    const result = validate(elements);
    assert.ok(definition.diagnosticHints[result.primaryDiagnosticCode], result.primaryDiagnosticCode);
    assert.doesNotMatch(result.studentDetail, engineering);
  }
  for (const hint of Object.values(definition.diagnosticHints)) for (const text of Object.values(hint)) assert.doesNotMatch(text, engineering);
  for (const text of [definition.task, definition.creationTips, ...Object.values(definition.successFeedback.byMethod), ...Object.values(definition.discoveryFeedback)]) {
    assert.doesNotMatch(text, engineering);
    assert.match(text, /單元/);
  }
});

test('Gate 4 repetition: task lists the three pass conditions; the feedback box starts with one tip', () => {
  assert.match(definition.task, /設計一個單元/);
  assert.match(definition.task, /①至少 5 個單元 ②每個單元都一樣 ③每個造形都屬於某個單元/);
  assert.match(feedbackMarkup(definition, null), /創作提示/);
  assert.equal((definition.creationTips.match(/。/g) ?? []).length, 1);
});

test('Gate 4 repetition: failed checks show one specific next step at a time', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  state.workingElements = without(fixtures.pass.group, 'ru-c-0');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const markup = feedbackMarkup(definition, submitPhase6cExperiment(course, definition));
    assert.equal((markup.match(/<p/g) ?? []).length, 2);
    assert.match(markup, /左邊有一個單元少了紅色圓形/);
  }
});
