import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createPhase6cCourseState, submitPhase6cExperiment, updatePhase6cWorkingElements, isPhase6cValidationCurrent } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { GeometryControlPanel } from '../geometry/control-panel.js';
import { STEP_COLOR_PALETTE, getElementColor, getDisplayColor, COLOR_PALETTE } from '../geometry/palette.js';
import { STEP_SIZE_TO_LOGICAL, SIZE_LEVELS, LIGHTNESS_LEVELS } from '../geometry/config.js';
import { auditComposition } from '../composition-audit.js';

const definition = phase6cDefinitionsById['experiment-gradation'];
const fixtures = phase6cFixtures.gradation;
const validate = (elements) => validatePhase6cExperiment(definition, { workingElements: elements });
const STEP = { 1: 36, 2: 45, 3: 57, 4: 71, 5: 89, 6: 111, 7: 140 };
const line = (values, { dx = 135, dy = 0, x0 = 80, y0 = 300, fields = ['stepSize', 'stepLightness'] } = {}) => values.map((value, index) => ({
  id: `t-${index}`, shape: 'circle', x: x0 + index * dx, y: y0 + index * dy, size: 3, hue: 'blue', lightness: 3, rotation: 0, proportion: 1,
  stepSize: 4, stepLightness: 4, ...Object.fromEntries(fields.map((field) => [field, value])), logicalSize: STEP[fields.includes('stepSize') ? value : 4]
}));
const engineering = /[A-Z_]{4,}|threshold|門檻|座標|\bid\b|\d+\s*px|轉折|轉一次彎/;

test('Gate 4 gradation: the teacher examples 1234567, 7654321, 123454321 and 1234321 pass; 1212121 does not', () => {
  assert.equal(validate(line([1, 2, 3, 4, 5, 6, 7])).passed, true);
  assert.equal(validate(line([7, 6, 5, 4, 3, 2, 1])).passed, true);
  assert.equal(validate(line([1, 2, 3, 4, 5, 4, 3, 2, 1], { dx: 105, x0: 70 })).passed, true);
  assert.equal(validate(line([1, 2, 3, 4, 3, 2, 1])).passed, true);
  const rhythm = validate(line([1, 2, 1, 2, 1, 2, 1]));
  assert.equal(rhythm.passed, false);
  assert.equal(rhythm.studentDetail, '你的作品變大又變小好幾次，像好幾座山連在一起，這比較像律動。漸層只能有一座山喔！');
});

test('Gate 4 gradation: stages are counted by position, so not every one of the 7 levels is needed', () => {
  assert.equal(validate(line([1, 2, 3, 4, 3, 2, 1])).passed, true);
  assert.equal(validate(line([2, 3, 4, 5, 6, 7, 6], {})).passed, true);
});

test('Gate 4 gradation: rows, columns, diagonals, arcs, S-curves and rings all pass, in either direction', () => {
  for (const name of ['vertical', 'diagonal', 'arc', 'sCurve', 'ring', 'descending']) assert.equal(validate(fixtures.pass[name]).passed, true, name);
  assert.equal(validate([...fixtures.pass.arc].reverse()).passed, true);
});

test('Gate 4 gradation: three or more changes together also pass', () => {
  const result = validate(fixtures.pass.threeChanges);
  assert.equal(result.passed, true);
  assert.deepEqual(result.detectedMethods, ['multiple', 'size', 'lightness', 'hue']);
});

test('Gate 4 gradation: only one change asks for a second one', () => {
  assert.equal(validate(fixtures.fail.onlySize).studentDetail, '目前只有大小在變化，再加入第二種變化，例如深淺或間距。');
});

test('Gate 4 gradation: resizing alone never counts as a spacing change too', () => {
  let x = 40;
  const equalGaps = [1, 2, 3, 4, 5, 6, 7].map((value, index) => {
    const radius = STEP[value] / 2; x += radius;
    const item = { id: `eg-${index}`, shape: 'circle', x, y: 300, size: 3, hue: 'blue', lightness: 3, rotation: 0, proportion: 1, stepSize: value, stepLightness: 4, logicalSize: STEP[value] };
    x += radius + 30; return item;
  });
  assert.equal(validate(equalGaps).primaryDiagnosticCode, 'ONLY_ONE_CHANGE');
  assert.equal(validate(line([1, 2, 3, 4, 5, 6, 7], { fields: ['stepSize'] })).primaryDiagnosticCode, 'ONLY_ONE_CHANGE');
});

test('Gate 4 gradation: a stopped change is located from the end students read first', () => {
  assert.equal(validate(fixtures.fail.stopsAtFourth).studentDetail, '從左邊數來第 4 個，大小的變化停住了。');
  const reversed = line([7, 6, 5, 5, 3, 2, 1]);
  assert.equal(validate(reversed).studentDetail, '從左邊數來第 4 個，大小的變化停住了。');
  assert.equal(validate(line([1, 2, 3, 3, 5, 6, 7], { dx: 0, dy: 85, x0: 500, y0: 40 })).studentDetail, '從上面數來第 4 個，大小的變化停住了。');
  assert.match(validate(line([1, 2, 3, 3, 5, 6, 7], { dx: 120, dy: 75, x0: 100, y0: 60 })).studentDetail, /^從左上那一端數來第 4 個/);
});

test('Gate 4 gradation: a ring with a break says so', () => {
  assert.equal(validate(fixtures.fail.ringBreak).studentDetail, '圓環上有一處大小的變化斷掉了。找到那一處，讓變化接得上。');
});

test('Gate 4 gradation: too few stages, decorations, scattered shapes and hue jumps', () => {
  assert.equal(validate(fixtures.fail.sixStages).studentDetail, '目前有 6 個階段，再增加 1 個，讓漸層有 7 個階段。');
  assert.equal(validate(fixtures.fail.decoration).primaryDiagnosticCode, 'NOT_ON_PATH');
  assert.match(validate(fixtures.fail.decoration).studentDetail, /^下方的藍色圓形不在漸層的路線上/);
  assert.equal(validate(fixtures.fail.scattered).primaryDiagnosticCode, 'NO_CLEAR_PATH');
  assert.equal(validate(fixtures.fail.hueJump).studentDetail, '從左邊數來第 4 個，顏色一下子跳太遠了。換成色相環上相鄰的顏色。');
  assert.equal(validate([]).primaryDiagnosticCode, 'TOO_FEW_STAGES');
});

test('Gate 4 gradation: student text uses 7 個階段, the agreed tip, and no abstract or engineering words', () => {
  assert.equal(definition.task, '用兩種變化做出 7 個階段的漸層。可以一路變大，也可以先變大再變小。');
  assert.equal(definition.creationTips, '選兩種變化，例如大小和深淺，從第 1 級到第 7 級一路改變。');
  assert.doesNotMatch(definition.task, /7 個造形/);
  assert.match(feedbackMarkup(definition, null), /創作提示/);
  for (const hint of Object.values(definition.diagnosticHints)) for (const text of Object.values(hint)) assert.doesNotMatch(text, engineering);
  for (const elements of Object.values(fixtures.fail)) {
    const result = validate(elements);
    assert.ok(definition.diagnosticHints[result.primaryDiagnosticCode], result.primaryDiagnosticCode);
    assert.doesNotMatch(result.studentDetail, engineering);
  }
});

test('Gate 4 gradation: failed checks show one specific next step', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  getExperimentState(course, definition.id).workingElements = structuredClone(fixtures.fail.stopsAtFourth);
  const markup = feedbackMarkup(definition, submitPhase6cExperiment(course, definition));
  assert.equal((markup.match(/<p/g) ?? []).length, 2);
  assert.match(markup, /從左邊數來第 4 個，大小的變化停住了/);
});

test('Gate 4 seven-step scale: only gradation uses it; other questions keep five levels', () => {
  assert.deepEqual(SIZE_LEVELS, [1, 2, 3, 4, 5]);
  assert.deepEqual(LIGHTNESS_LEVELS, [1, 2, 3, 4, 5]);
  for (const item of phase6cDefinitions) {
    const usesSteps = item.allowedTools.stepSize || item.allowedTools.stepLightness;
    assert.equal(Boolean(usesSteps), item.principleId === 'gradation', item.principleId);
  }
  assert.equal(definition.allowedTools.size, false);
  assert.equal(definition.allowedTools.lightness, false);
});

test('Gate 4 seven-step scale: approved option B values, keeping the old darkest, middle and lightest colours', () => {
  assert.deepEqual(Object.values(STEP_SIZE_TO_LOGICAL), [36, 45, 57, 71, 89, 111, 140]);
  for (const [hue, colours] of Object.entries(STEP_COLOR_PALETTE)) {
    assert.equal(colours.length, 7, hue);
    assert.deepEqual([colours[0], colours[3], colours[6]], [COLOR_PALETTE[hue][0], COLOR_PALETTE[hue][2], COLOR_PALETTE[hue][4]], hue);
  }
  assert.equal(getElementColor({ hue: 'blue', lightness: 3, stepLightness: 6 }), STEP_COLOR_PALETTE.blue[5]);
  assert.equal(getElementColor({ hue: 'blue', lightness: 3 }), getDisplayColor('blue', 3));
});

test('Gate 4 seven-step scale: new shapes start at level 4 and the buttons render seven finger-sized choices', () => {
  const engine = new ConstrainedGeometryEngine({ allowedTools: definition.allowedTools, elements: [] });
  engine.add('circle', { x: 300, y: 300 });
  const added = engine.getSelectedElement();
  assert.equal(added.stepSize, 4); assert.equal(added.stepLightness, 4); assert.equal(added.logicalSize, 71);
  const left = { innerHTML: '', querySelectorAll: () => [] };
  const right = { innerHTML: '', querySelectorAll: () => [] };
  new GeometryControlPanel({ container: left, engine, region: 'primary' });
  new GeometryControlPanel({ container: right, engine, region: 'secondary' });
  assert.equal((right.innerHTML.match(/data-property="stepSize"/g) ?? []).length, 7);
  assert.doesNotMatch(left.innerHTML, /data-property="step/);
  assert.equal((right.innerHTML.match(/data-property="stepLightness"/g) ?? []).length, 7);
  assert.doesNotMatch(left.innerHTML + right.innerHTML, /type="range"/);
  assert.match(right.innerHTML, /aria-label="大小第 7 級"/);
});

test('Gate 4 seven-step scale: changing a seven-step value makes students check again (Gate 3)', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  state.workingElements = structuredClone(fixtures.pass.sizeLightness);
  assert.equal(submitPhase6cExperiment(course, definition).result.passed, true);
  const changed = structuredClone(fixtures.pass.sizeLightness); changed[2].stepLightness = 6;
  assert.equal(updatePhase6cWorkingElements(course, definition, changed), true);
  assert.equal(isPhase6cValidationCurrent(course, definition), false);
});

test('Gate 4 seven-step scale: shapes at the same spot but different seven-step lightness are not merged as duplicates', () => {
  const [first] = structuredClone(fixtures.pass.sizeLightness);
  const audit = auditComposition([first, { ...first, id: 'twin', stepLightness: first.stepLightness + 1 }]);
  assert.equal(audit.effectiveElementCount, 2);
});

test('Gate 4 gradation: small spacing differences from placing shapes by hand never hide the real problem', () => {
  const xs = [100, 220, 360, 500, 640, 800, 940];
  const elements = [1, 2, 3, 3, 5, 6, 7].map((value, index) => ({ id: `h-${index}`, shape: 'circle', x: xs[index], y: 300, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1, stepSize: value, stepLightness: index + 1, logicalSize: STEP[value] }));
  assert.equal(validate(elements).studentDetail, '從左邊數來第 4 個，大小的變化停住了。');
});
