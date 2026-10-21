import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createPhase6cCourseState, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const definition = phase6cDefinitionsById['experiment-symmetry'];
const fixtures = phase6cFixtures.symmetry;
const validate = (elements, mode = 'vertical') => validatePhase6cExperiment(definition, { workingElements: elements, selectedExperimentOption: mode });
const clone = (items) => structuredClone(items);
const engineering = /[A-Z_]{4,}|threshold|門檻|座標|\bid\b|\d+\s*px/;
const shape = (id, values) => ({ id, shape: 'circle', x: 500, y: 300, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1, ...values });

test('Gate 4 symmetry: the colour tool is open', () => {
  assert.equal(definition.allowedTools.color, true);
});

test('Gate 4 symmetry: all three modes pass with four shape + colour combinations', () => {
  assert.equal(validate(fixtures.pass.vertical, 'vertical').passed, true);
  assert.equal(validate(fixtures.pass.horizontal, 'horizontal').passed, true);
  assert.equal(validate(fixtures.pass.cross, 'cross').passed, true);
  assert.equal(validate(fixtures.pass.directional, 'vertical').passed, true);
});

test('Gate 4 symmetry: teacher example — cross mode with two groups, each in two colours, makes four combinations', () => {
  const result = validate(fixtures.pass.cross, 'cross');
  assert.equal(result.metrics.combinationCount, 4);
  assert.equal(result.metrics.matchedCount, 2);
});

test('Gate 4 symmetry: colour is not checked between mirrored shapes', () => {
  assert.equal(validate(fixtures.pass.colourFree).passed, true);
});

test('Gate 4 symmetry: one shape in one colour is not enough variety', () => {
  const result = validate(fixtures.fail.oneColour);
  assert.equal(result.primaryDiagnosticCode, 'NOT_ENOUGH_VARIETY');
  assert.equal(result.studentDetail, '4 組都是中型的藍色三角形，算同一種；改變其中一組的顏色、大小或方向。');
});

test('Gate 4 symmetry: a square at 0° and a diamond at 45° are no longer mirror images', () => {
  const result = validate(fixtures.fail.diamond);
  assert.equal(result.primaryDiagnosticCode, 'ATTRIBUTE_MISMATCH');
  const diamonds = clone(fixtures.fail.diamond).map((item) => ({ ...item, rotation: item.id.endsWith('3') ? 45 : item.rotation }));
  assert.equal(validate(diamonds).passed, true);
});

test('Gate 4 symmetry: pair counts stay at 4 (left/right, up/down) and 2 (cross)', () => {
  assert.equal(validate(fixtures.pass.vertical.slice(0, 6)).studentDetail, '目前有 3 對，再做 1 對就完成了。');
  assert.equal(validate(fixtures.pass.horizontal.slice(0, 6), 'horizontal').primaryDiagnosticCode, 'NOT_ENOUGH_SYMMETRY');
  assert.equal(validate(fixtures.pass.cross.slice(0, 4), 'cross').studentDetail, '目前有 1 組上下左右的對應，再做 1 組上下左右的對應就完成了。');
});

test('Gate 4 symmetry: shapes on the axis do not count as combinations but are allowed when they are symmetric', () => {
  const result = validate(fixtures.pass.axisShapes);
  assert.equal(result.passed, true);
  assert.equal(result.metrics.combinationCount, 4);
  const onlyAxisVariety = [...clone(fixtures.fail.oneColour), shape('ax1', { shape: 'square', x: 500, y: 100, hue: 'blue' }), shape('ax2', { x: 500, y: 300, hue: 'green' }), shape('ax3', { shape: 'rectangle', x: 500, y: 500, hue: 'yellow' })];
  assert.equal(validate(onlyAxisVariety).primaryDiagnosticCode, 'NOT_ENOUGH_VARIETY');
  assert.equal(validate(onlyAxisVariety).studentDetail, '中線上的造形不算在 4 種裡，兩側再加 3 種不同的造形、顏色、大小或方向。');
  const threeSides = clone(fixtures.pass.vertical).map((item) => (item.id.endsWith('3') ? { ...item, hue: 'red' } : item));
  assert.equal(validate(threeSides).studentDetail, '兩組都是中型的紅色三角形，算同一種；改變其中一組的顏色、大小或方向。');
  const threePlusCentre = [...threeSides, shape('mid', { shape: 'square', x: 500, y: 300, hue: 'green' })];
  assert.equal(validate(threePlusCentre).studentDetail, '中線上的造形不算在 4 種裡，兩側再加 1 種不同的造形、顏色、大小或方向。');
});

test('Gate 4 symmetry: a tilted shape on the axis closes the old loophole', () => {
  const result = validate(fixtures.fail.tiltedOnAxis);
  assert.equal(result.primaryDiagnosticCode, 'AXIS_SHAPE_NOT_SYMMETRIC');
  assert.equal(result.studentDetail, '放在中線上的造形要左右對稱，斜放的三角形不行。轉動它，或把它移開中線。');
  const horizontalAxis = [...clone(fixtures.pass.horizontal), shape('hz', { shape: 'triangle', x: 500, y: 300, rotation: 0 })];
  assert.equal(validate(horizontalAxis, 'horizontal').primaryDiagnosticCode, 'AXIS_SHAPE_NOT_SYMMETRIC');
  const sideways = [...clone(fixtures.pass.horizontal), shape('hz', { shape: 'triangle', x: 500, y: 300, rotation: 90 })];
  assert.equal(validate(sideways, 'horizontal').passed, true);
});

test('Gate 4 symmetry: in cross mode, axis shapes need a partner across the other axis and the centre must be symmetric both ways', () => {
  const alone = validate(fixtures.fail.crossAxisAlone, 'cross');
  assert.equal(alone.primaryDiagnosticCode, 'CROSS_INCOMPLETE');
  assert.equal(alone.studentDetail, '十字對稱需要上下也對稱。上方中線上的黃色三角形，在下方中線上找不到對應的造形。你的作品已經左右對稱了！也可以改選『左右對稱』試試看。');
  const paired = [...clone(fixtures.fail.crossAxisAlone), shape('sk-axis2', { shape: 'triangle', x: 500, y: 520, rotation: 180, hue: 'yellow' })];
  assert.equal(validate(paired, 'cross').passed, true);
  const centreTriangle = [...clone(fixtures.pass.cross), shape('centre', { shape: 'triangle', x: 500, y: 300 })];
  assert.equal(validate(centreTriangle, 'cross').studentDetail, '放在正中心的造形要上下左右都對稱，斜放的三角形不行。轉動它，或把它移開中線。');
  const centreSquare = [...clone(fixtures.pass.cross), shape('centre', { shape: 'square', x: 500, y: 300, rotation: 45 })];
  assert.equal(validate(centreSquare, 'cross').passed, true);
});

test('Gate 4 symmetry: one direction done in cross mode says which direction is still missing', () => {
  const result = validate(fixtures.fail.crossIncomplete, 'cross');
  assert.equal(result.primaryDiagnosticCode, 'CROSS_INCOMPLETE');
  assert.equal(result.studentDetail, '十字對稱需要上下也對稱。左上的藍色圓形，在左下找不到對應的造形。');
});

test('Gate 4 symmetry: mismatches name the shape and where it is', () => {
  assert.equal(validate(fixtures.fail.missing).studentDetail, '左邊的藍色圓形，在右邊找不到對應的造形。');
  const rightOnly = [shape('r1', { shape: 'triangle', x: 760, y: 120 })];
  assert.equal(validate(rightOnly).studentDetail, '右上角的紅色三角形，在左邊找不到對應的造形。');
  assert.equal(validate(fixtures.fail.position).studentDetail, '右邊的藍色圓形離中線遠了一格。');
  assert.equal(validate(fixtures.fail.attribute).studentDetail, '左邊的藍色圓形，在左右對應的位置上是正方形，兩邊的造形不一樣。');
  const sizes = [shape('z1', { x: 300, y: 220 }), shape('z2', { x: 700, y: 220, size: 5 })];
  assert.equal(validate(sizes).studentDetail, '左右兩邊的圓形大小不一樣。');
  const turned = [shape('d1', { shape: 'triangle', x: 300, y: 220, rotation: 45 }), shape('d2', { shape: 'triangle', x: 700, y: 220, rotation: 45 })];
  assert.match(validate(turned).studentDetail, /^左右兩邊的三角形方向沒有對應/);
});

test('Gate 4 symmetry: student text, tip and hints', () => {
  assert.equal(definition.task, '做出對稱的畫面，用至少 4 種不同的造形、顏色、大小或方向。<br>左右、上下對稱要有 4 對互相對應的造形；十字對稱要有 2 組（每組上下左右 4 個）。');
  assert.equal(definition.creationTips, '造形要對稱，色彩可以自由變化。中線上也可以放造形，但不算在 4 種裡。');
  for (const text of [definition.task, definition.creationTips]) assert.doesNotMatch(text, /鏡像|搭配/);
  assert.match(feedbackMarkup(definition, null), /造形要對稱，色彩可以自由變化/);
  for (const hint of Object.values(definition.diagnosticHints)) for (const text of Object.values(hint)) assert.doesNotMatch(text, engineering);
  for (const [name, elements] of Object.entries(fixtures.fail)) {
    const result = validate(elements, name.startsWith('cross') ? 'cross' : 'vertical');
    assert.ok(definition.diagnosticHints[result.primaryDiagnosticCode], `${name} ${result.primaryDiagnosticCode}`);
    assert.doesNotMatch(result.studentDetail, engineering);
    assert.doesNotMatch(result.studentDetail, /鏡像|搭配|四向/);
  }
});

test('Gate 4 symmetry: failed checks show one specific next step; switching mode still needs a new check (Gate 3)', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const state = getExperimentState(course, definition.id);
  state.workingElements = clone(fixtures.fail.oneColour);
  state.selectedExperimentOption = 'vertical';
  const markup = feedbackMarkup(definition, submitPhase6cExperiment(course, definition));
  assert.equal((markup.match(/<p/g) ?? []).length, 2);
  assert.match(markup, /算同一種；改變其中一組的顏色、大小或方向/);
});

test('Gate 4 symmetry: teacher artwork — cross mode says the main problem first and suggests left-right mode', () => {
  const result = validate(fixtures.pass.teacherLeftRight, 'cross');
  assert.equal(result.passed, false);
  assert.equal(result.primaryDiagnosticCode, 'CROSS_INCOMPLETE');
  assert.equal(result.studentDetail, '十字對稱需要上下也對稱。左上的藍綠色圓形，在左下找不到對應的造形。你的作品已經左右對稱了！也可以改選『左右對稱』試試看。');
  assert.doesNotMatch(result.studentDetail, /對面|另一條/);
});

test('Gate 4 symmetry: the same teacher artwork passes after switching to left-right mode', () => {
  const result = validate(fixtures.pass.teacherLeftRight, 'vertical');
  assert.equal(result.passed, true);
  assert.equal(result.metrics.matchedCount, 5);
  assert.equal(result.metrics.combinationCount, 5);
});

test('Gate 4 symmetry: a partner one square off says so clearly', () => {
  const pairs = [[240, 140, 'red'], [360, 200, 'blue'], [640, 160, 'yellow'], [800, 220, 'green']].flatMap(([x, y, hue], index) => [shape(`p${index}a`, { x, y, hue }), shape(`p${index}b`, { x, y: 600 - y, hue })]);
  const rectangles = [shape('ra', { shape: 'rectangle', x: 500, y: 120, rotation: 0 }), shape('rb', { shape: 'rectangle', x: 500, y: 460, rotation: 0 })];
  const closer = validate([...pairs, ...rectangles].map((item) => ({ ...item, x: item.x === 500 ? 500 : item.x })), 'horizontal');
  assert.equal(closer.studentDetail, '下方的紅色長方形離中線近了一格。');
  const shifted = [...pairs.filter((item) => item.id !== 'p0b'), shape('p0b', { x: 260, y: 460, hue: 'red' })];
  assert.equal(validate(shifted, 'horizontal').studentDetail, '左下角的紅色圓形偏右一格。');
  const further = [...pairs.slice(0, 7), shape('p3b', { x: 800, y: 420, hue: 'green' })];
  assert.equal(validate(further, 'horizontal').studentDetail, '右下角的綠色圓形離中線遠了兩格。');
});

test('Gate 4 symmetry: in cross mode, an off-by-one partner names the line it is measured from', () => {
  const almost = fixtures.pass.teacherLeftRight.filter((item) => item.id.startsWith('tl-r'));
  const orbits = clone(fixtures.pass.cross);
  const result = validate([...orbits, ...almost], 'cross');
  assert.equal(result.studentDetail, '十字對稱需要上下也對稱。下方中線上的紅色長方形離中間的橫線近了一格。你的作品已經左右對稱了！也可以改選『左右對稱』試試看。');
});

test('Gate 4 symmetry: any shape on the centre line adds the reminder, on a pass and on a failed check', () => {
  const REMINDER = '中線上的造形可以放，但不算在 4 種裡。';
  const passed = validate(fixtures.pass.axisShapes);
  assert.equal(passed.passed, true);
  assert.equal(passed.reminder, REMINDER);
  const successMarkup = feedbackMarkup(definition, { result: passed });
  assert.match(successMarkup, /小提醒/);
  assert.match(successMarkup, /中線上的造形可以放，但不算在 4 種裡/);
  const fewer = validate([...clone(fixtures.pass.vertical).slice(0, 6), shape('mid', { x: 500, y: 300 })]);
  assert.equal(fewer.primaryDiagnosticCode, 'NOT_ENOUGH_SYMMETRY');
  assert.equal(fewer.reminder, REMINDER);
  assert.match(feedbackMarkup(definition, { result: fewer, hint: { text: 'x', level: 'observe' } }), /小提醒/);
});

test('Gate 4 symmetry: no centre-line shape, no reminder; and no repeat when the message already explains it', () => {
  assert.equal(validate(fixtures.pass.vertical).reminder, undefined);
  assert.doesNotMatch(feedbackMarkup(definition, { result: validate(fixtures.pass.vertical) }), /小提醒/);
  assert.equal(validate(fixtures.fail.oneColour).reminder, undefined);
  const centreOnly = [...clone(fixtures.fail.oneColour), shape('ax1', { shape: 'square', x: 500, y: 100, hue: 'blue' })];
  const result = validate(centreOnly);
  assert.match(result.studentDetail, /^中線上的造形不算在 4 種裡/);
  assert.equal(result.reminder, undefined);
  assert.equal(validate(fixtures.fail.tiltedOnAxis).reminder, undefined);
});

test('Gate 4 symmetry: when the feedback suggests switching modes, the centre-line reminder waits for the next check', () => {
  const cross = validate(fixtures.pass.teacherLeftRight, 'cross');
  assert.match(cross.studentDetail, /也可以改選『左右對稱』試試看/);
  assert.equal(cross.reminder, undefined);
  const leftRight = validate(fixtures.pass.teacherLeftRight, 'vertical');
  assert.equal(leftRight.passed, true);
  assert.equal(leftRight.reminder, '中線上的造形可以放，但不算在 4 種裡。');
});

// Gate 4 revision: kinds are counted like repetition — shape, colour, size or visible direction.
const pairAt = (id, y, values, right = {}) => [shape(`${id}L`, { x: 300, y, ...values }), shape(`${id}R`, { x: 700, y, ...values, ...right })];
const mirrorTilt = (rotation) => ((360 - rotation) % 360);

test('Gate 4 symmetry kinds: a different size or a different visible direction is a different kind', () => {
  const sizes = [...pairAt('a', 60, { shape: 'triangle', size: 5 }), ...pairAt('b', 200, { shape: 'triangle', size: 2 }), ...pairAt('c', 340, { shape: 'triangle', size: 5, rotation: 180 }), ...pairAt('d', 480, { shape: 'triangle', size: 2, rotation: 180 })];
  const result = validate(sizes);
  assert.equal(result.passed, true);
  assert.equal(result.metrics.combinationCount, 4);
});

test('Gate 4 symmetry kinds: a mirrored tilted pair is one kind; invisible turns do not count', () => {
  const tilted = [...pairAt('a', 60, { shape: 'triangle', rotation: 45 }, { rotation: mirrorTilt(45) }), ...pairAt('b', 200, { shape: 'triangle' })];
  const squares = [...pairAt('c', 340, { shape: 'square' }), ...pairAt('d', 480, { shape: 'square', rotation: 90 })];
  const circles = [shape('e1', { x: 200, y: 560 }), shape('e2', { x: 800, y: 560, rotation: 0 })];
  const result = validate([...tilted, ...squares]);
  assert.equal(result.metrics.combinationCount, 3);
  assert.equal(result.studentDetail, '兩組都是中型的紅色正方形，算同一種；改變其中一組的顏色、大小或方向。');
  const longBars = [...pairAt('f', 340, { shape: 'rectangle' }), ...pairAt('g', 480, { shape: 'rectangle', rotation: 180 })];
  assert.equal(validate([...tilted, ...longBars, ...circles]).metrics.combinationCount, 4);
  const roundTurned = [...tilted, ...squares.slice(0, 2), shape('h1', { x: 300, y: 480, rotation: 45 }), shape('h2', { x: 700, y: 480, rotation: 90 })];
  assert.equal(validate(roundTurned).metrics.combinationCount, 4);
});

test('Gate 4 symmetry kinds: identical pairs still count once, with the teacher message', () => {
  const same = [...pairAt('a', 60, { shape: 'triangle', size: 5 }), ...pairAt('b', 200, { shape: 'triangle', size: 5 }), ...pairAt('c', 340, { hue: 'blue' }), ...pairAt('d', 480, { shape: 'square', hue: 'yellow' })];
  const result = validate(same);
  assert.equal(result.metrics.combinationCount, 3);
  assert.equal(result.studentDetail, '兩組都是大的紅色三角形，算同一種；改變其中一組的顏色、大小或方向。');
  assert.equal(validate(same.map((item) => (item.id.startsWith('b') ? { ...item, rotation: 180 } : item))).passed, true);
  const mixed = [...pairAt('a', 60, {}), ...pairAt('b', 200, { hue: 'blue' }), ...pairAt('c', 340, {}, { hue: 'blue' }), ...pairAt('d', 480, { hue: 'blue' }, { hue: 'red' })];
  assert.equal(validate(mixed).studentDetail, '目前只有 2 種，再加 2 種。可以改變造形、顏色、大小或方向。');
});

test('Gate 4 symmetry kinds: in cross mode a group is one kind, and ▲ on top differs from ▼ on top', () => {
  const orbit = (id, dx, dy, values) => [[500 - dx, 300 - dy, 0], [500 + dx, 300 - dy, 0], [500 - dx, 300 + dy, 180], [500 + dx, 300 + dy, 180]].map(([x, y, turn], index) => shape(`${id}${index}`, { shape: 'triangle', x, y, ...values, rotation: ((values.rotation ?? 0) + turn) % 360 }));
  const up = orbit('a', 300, 200, {});
  const down = orbit('b', 120, 80, { rotation: 180 });
  const result = validate([...up, ...down], 'cross');
  assert.equal(result.metrics.combinationCount, 2);
  assert.equal(validate([...up, ...orbit('c', 120, 80, {})], 'cross').studentDetail, '兩組都是中型的紅色三角形，算同一種；改變其中一組的顏色、大小或方向。');
});
