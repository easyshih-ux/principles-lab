import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createPhase6cCourseState, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const definition = phase6cDefinitionsById['experiment-contrast'];
const validate = (elements) => validatePhase6cExperiment(definition, { workingElements: elements });
const engineering = /[A-Z_]{4,}|threshold|門檻|座標|\bid\b|\d+\s*px/;
// Two groups of three, spaced so nothing overlaps: a big group on the top row, a small group on the bottom row.
const groups = (big, small, extra = []) => [
  ...[0, 1, 2].map((i) => ({ id: `b${i}`, shape: 'circle', x: 150 + i * 220, y: 160, size: 5, hue: 'red', lightness: 3, rotation: 0, proportion: 1, ...big })),
  ...[0, 1, 2].map((i) => ({ id: `s${i}`, shape: 'circle', x: 220 + i * 220, y: 450, size: 1, hue: 'blue', lightness: 3, rotation: 0, proportion: 1, ...small })),
  ...extra
];

test('Gate 4 contrast: two clear groups, very different in size and colour, pass', () => {
  assert.equal(validate(groups({}, {})).passed, true);
  assert.equal(validate(phase6cFixtures.contrast.pass.dual).passed, true);
});

test('Gate 4 contrast: hues at least 4 steps apart count, including complements', () => {
  assert.equal(validate(groups({ hue: 'red' }, { hue: 'yellow' })).passed, true);
  assert.equal(validate(groups({ hue: 'red' }, { hue: 'green' })).passed, true);
  assert.equal(validate(groups({ hue: 'yellow' }, { hue: 'violet' })).passed, true);
});

test('Gate 4 contrast: neighbouring hues such as red and orange do not count', () => {
  const result = validate(groups({ hue: 'red' }, { hue: 'orange' }));
  assert.equal(result.primaryDiagnosticCode, 'COLOR_CONTRAST_REQUIRED');
  assert.equal(result.studentDetail, '紅色和橙色太接近了，換一個色環上距離更遠的顏色。');
  assert.equal(validate(groups({ hue: 'red' }, { hue: 'yellow-orange' })).passed, false);
  assert.equal(validate(groups({ hue: 'blue' }, { hue: 'blue' })).studentDetail, '兩組都是藍色，換一個色環上距離很遠的顏色，例如紅配藍。');
});

test('Gate 4 contrast: a lightness gap of 3 levels also counts (kept in the rule, not in the task text)', () => {
  assert.equal(validate(groups({ hue: 'blue', lightness: 1 }, { hue: 'blue', lightness: 4 })).passed, true);
  assert.equal(validate(groups({ hue: 'blue', lightness: 2 }, { hue: 'blue', lightness: 4 })).passed, false);
  assert.doesNotMatch(definition.task + definition.creationTips, /深淺|明度/);
});

test('Gate 4 contrast: the size rule is unchanged and its message is student-friendly', () => {
  const result = validate(groups({ size: 3 }, { size: 2 }));
  assert.equal(result.primaryDiagnosticCode, 'SIZE_CONTRAST_REQUIRED');
  assert.equal(result.studentDetail, '兩組圖形的大小差不多，讓一組更大、一組更小。');
  assert.equal(validate(groups({ size: 4 }, { size: 1 })).passed, true);
});

test('Gate 4 contrast: a shape that belongs to neither group is pointed out', () => {
  const stray = { id: 'x', shape: 'triangle', x: 880, y: 300, size: 3, hue: 'green', lightness: 3, rotation: 0, proportion: 1 };
  const result = validate(groups({}, {}, [stray, { ...stray, id: 'y', x: 500, y: 300, hue: 'yellow' }]));
  assert.equal(result.primaryDiagnosticCode, 'OUTSIDE_GROUPS');
  assert.match(result.studentDetail, /^有 2 個圖形看不出屬於哪一組/);
  // Every shape must belong to a group: a single odd shape fails with the teacher's message.
  const single = validate(groups({}, {}, [stray]));
  assert.equal(single.passed, false);
  assert.equal(single.primaryDiagnosticCode, 'OUTSIDE_GROUPS');
  assert.match(single.studentDetail, /^有一個圖形看不出屬於哪一組：右邊的綠色三角形。/);
  const lonely = validate([...groups({}, {}).slice(0, 4), { ...stray, id: 'z', x: 660, y: 450, size: 1, hue: 'blue' }, { ...stray, id: 'w', x: 880, y: 160, size: 5, hue: 'red' }].map((item, index) => (index === 3 ? { ...item, hue: 'green' } : item)));
  assert.equal(lonely.passed, false);
});

test('Gate 4 contrast: too few shapes, all the same, and only the form different', () => {
  assert.equal(validate(groups({}, {}).slice(0, 5)).studentDetail, '目前有 5 個圖形，至少要 6 個，分成兩組。');
  assert.equal(validate(groups({ size: 3, hue: 'blue' }, { size: 3 })).studentDetail, '目前所有圖形都一樣。分成兩組：一組大、一組小，顏色也要差很多。');
  assert.equal(validate(phase6cFixtures.contrast.fail.shapeOnly).studentDetail, '目前只有造形不同。讓一組更大、一組更小，顏色也要差很多。');
});

test('Gate 4 contrast: student task, tip and hints', () => {
  assert.equal(definition.task, '做出兩組對比強烈的圖形：大小要差很多，顏色也要差很多。至少 6 個圖形。');
  assert.equal(definition.creationTips, '顏色可以選色環上距離很遠的，例如紅配藍、黃配紫。');
  assert.match(feedbackMarkup(definition, null), /紅配藍、黃配紫/);
  for (const hint of Object.values(definition.diagnosticHints)) for (const text of Object.values(hint)) assert.doesNotMatch(text, engineering);
  for (const elements of Object.values(phase6cFixtures.contrast.fail)) {
    const result = validate(elements);
    assert.ok(definition.diagnosticHints[result.primaryDiagnosticCode], result.primaryDiagnosticCode);
    if (result.studentDetail) assert.doesNotMatch(result.studentDetail, engineering);
  }
});

test('Gate 4 contrast: failed checks show one specific next step', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  getExperimentState(course, definition.id).workingElements = groups({ hue: 'red' }, { hue: 'orange' });
  const markup = feedbackMarkup(definition, submitPhase6cExperiment(course, definition));
  assert.equal((markup.match(/<p/g) ?? []).length, 2);
  assert.match(markup, /紅色和橙色太接近了/);
});

test('Gate 4 contrast: the other questions are unaffected (harmony unchanged)', () => {
  const harmony = phase6cDefinitionsById['experiment-harmony'];
  assert.equal(harmony.validationSpec.maximumHarmonyHueArcSpan, undefined);
  assert.equal(phase6cDefinitionsById['experiment-contrast'].allowedTools.lightness, false);
});
