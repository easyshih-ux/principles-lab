import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createPhase6cCourseState, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

// Gate 4C contrast (10/22): at least 3 places of strong contrast. A place is two shapes next to
// each other (touching, overlapping or almost touching) that differ a lot in size OR colour.
// Every shape needs a strongly different neighbour. Each shape counts in one place at most.
const definition = phase6cDefinitionsById['experiment-contrast'];
const fixtures = phase6cFixtures.contrast;
const validate = (elements) => validatePhase6cExperiment(definition, { workingElements: elements });
const el = (id, values = {}) => ({ id, shape: 'circle', x: 500, y: 300, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1, ...values });
// Three touching pairs across the middle row.
const pairs = (a, b, gap = 80) => [150, 450, 750].flatMap((x, i) => [el(`a${i}`, { x, ...a }), el(`b${i}`, { x: x + gap, ...b })]);

test('Gate 4C contrast: the teacher iPad artwork (5 big circles, each overlapped by a small circle of another colour) passes', () => {
  const result = validate(fixtures.pass.teacherFivePairs);
  assert.equal(result.passed, true);
  assert.equal(result.metrics.places, 5);
});

test('Gate 4C contrast: 3 big red and 3 small blue, placed as 3 touching pairs, pass', () => {
  const result = validate(fixtures.pass.dual);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['multiple', 'size', 'color']);
});

test('Gate 4C contrast: size alone or colour alone is enough for each place', () => {
  assert.deepEqual(validate(pairs({ size: 5, hue: 'blue' }, { size: 2, hue: 'blue' }, 88)).detectedMethods, ['size']);
  assert.deepEqual(validate(pairs({ hue: 'red' }, { hue: 'green' })).detectedMethods, ['color']);
  assert.equal(validate(pairs({ hue: 'red' }, { hue: 'yellow' })).passed, true, 'hues 4 steps apart');
  assert.equal(validate(pairs({ hue: 'red' }, { hue: 'blue-green' })).passed, true, 'complements');
  assert.equal(validate(pairs({ lightness: 1 }, { lightness: 4 })).passed, true, 'lightness 3 levels apart (rule only)');
});

test('Gate 4C contrast: look-alike neighbours do not count (same size, same colour family)', () => {
  const result = validate(pairs({ hue: 'red' }, { hue: 'red-orange' }));
  assert.equal(result.passed, false);
  assert.equal(result.studentDetail, '左邊的紅色圓形和紅橙色圓形，大小和顏色都太接近了。讓一個變大或變小很多，或換一個顏色差很多的。');
  assert.equal(validate(pairs({ hue: 'red' }, { hue: 'orange' })).passed, false, 'red and orange are neighbours');
  assert.equal(validate(pairs({ size: 4 }, { size: 2 }, 82)).passed, false, 'a 2-level size gap is not enough');
  assert.equal(validate(pairs({}, {})).studentDetail, '左邊的兩個紅色圓形，大小和顏色都太接近了。讓一個變大或變小很多，或換一個顏色差很多的。');
});

test('Gate 4C contrast: a shape with no strongly different neighbour is pointed out by place and colour', () => {
  assert.equal(validate(fixtures.fail.lonely).studentDetail, '右下的藍色圓形旁邊，沒有和它差很多的圖形。');
  assert.match(validate(fixtures.fail.apart).studentDetail, /旁邊，沒有和它差很多的圖形。$/);
});

test('Gate 4C contrast: counts places and says how many more are needed', () => {
  assert.equal(validate(fixtures.fail.twoPlaces).studentDetail, '目前有 2 處對比，再做 1 處。');
  // One big circle with three small circles around it is one place, not three.
  const centre = validate(fixtures.fail.oneCentre);
  assert.equal(centre.metrics.places, 1);
  assert.equal(centre.studentDetail, '目前有 1 處對比，再做 2 處。');
  assert.equal(validate([]).studentDetail, '先放上圖形：大的旁邊放小的，或紅色旁邊放綠色。');
});

test('Gate 4C contrast: overlapping pairs count as next to each other', () => {
  const overlapping = [150, 450, 750].flatMap((x, i) => [el(`o${i}`, { x, size: 5 }), el(`p${i}`, { x: x + 40, size: 1, hue: 'blue' })]);
  assert.equal(validate(overlapping).passed, true);
});

test('Gate 4C contrast: student task and tip, without the word 組', () => {
  assert.equal(definition.task, '讓畫面中至少有 3 個地方出現強烈的對比。過關：①至少 3 處對比 ②每處是兩個靠在一起（相鄰或重疊）的圖形：大小差很多，或顏色差很多 ③每個圖形旁邊，都要有一個和它差很多的圖形');
  assert.equal(definition.creationTips, '例如大圓旁邊放小圓，紅色旁邊放綠色；兩種一起用，對比會更強烈。');
  const studentText = [definition.task, definition.creationTips, ...Object.values(definition.successFeedback.byMethod), ...Object.values(definition.discoveryFeedback), ...Object.values(definition.diagnosticHints).flatMap((hint) => Object.values(hint))];
  for (const text of studentText) assert.doesNotMatch(text, /組/, text);
  const details = Object.values(fixtures.fail).map((work) => validate(work).studentDetail);
  for (const text of details) { assert.doesNotMatch(text, /組/, text); assert.doesNotMatch(text, /[A-Z_]{4,}|門檻|座標/, text); }
});

test('Gate 4C contrast: a failed check shows one specific next step', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  state.workingElements = structuredClone(fixtures.fail.twoPlaces);
  const markup = feedbackMarkup(definition, submitPhase6cExperiment(course, definition));
  assert.equal((markup.match(/<p/g) ?? []).length, 2);
  assert.match(markup, /目前有 2 處對比，再做 1 處。/);
});

test('Gate 4C contrast: harmony and contrast still do not overlap (contrast needs 4 hue steps)', () => {
  assert.equal(phase6cDefinitionsById['experiment-harmony'].validationSpec.maximumHarmonyHueArcSpan, 3);
  assert.equal(definition.validationSpec.minimumHueDistance, 4);
  assert.equal(definition.allowedTools.lightness, false);
});
