import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitionsById } from '../phase6c-definitions.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { feedbackMarkup } from '../experiment-course.js';
import { createSimplicityInitialArtwork } from '../simplicity-initial-state.js';

// Gate 4C (10/22): the other six questions get the same copy format as the first four —
// task + pass conditions, one creation tip, and one specific sentence per failed check.
// Only the wording changes; every pass condition stays as it was.
const def = (id) => phase6cDefinitionsById[`experiment-${id}`];
const check = (id, elements) => validatePhase6cExperiment(def(id), { workingElements: elements });
const el = (id, values = {}) => ({ id, shape: 'circle', x: 500, y: 300, size: 3, hue: 'red', lightness: 3, rotation: 0, proportion: 1, ...values });

test('Gate 4C copy: six tasks list their pass conditions and each has one creation tip', () => {
  const expected = {
    balance: ['讓左右兩邊不一樣，但整個畫面看起來穩定。過關：①左右兩邊都要有造形 ②左右不能一模一樣 ③左右兩邊一樣重', '大的造形比較重，離中線越遠也越重。可以用一個大的對兩個小的，或把小的放遠一點。'],
    rhythm: ['讓造形由左到右排成一條路線，用變化帶著視線前進。過關：①至少 5 個造形 ②由左往右一個接一個排 ③高低、方向、大小或間距，至少一種變化有好幾座山的起伏', '例如讓造形像波浪一樣一高一低，做出好幾座山的起伏。'],
    proportion: ['用 1×、2×、3× 三種尺寸，做出清楚的大小關係。過關：①至少 6 個造形 ②三種尺寸都要用到', '2× 是 1× 的兩倍大，3× 是 1× 的三倍大。怎麼排列由你決定。'],
    unity: ['用至少 7 個造形，讓它們有一個共同特色，同時保留一點變化。過關：①至少 7 個造形 ②7 個裡至少 6 個有同樣的顏色、造形或方向 ③還要有一點不同，例如大小', '先決定共同特色，例如全部用藍色，或都用有角的造形；再讓大小或造形有一點不同。'],
    harmony: ['用相近的顏色，讓畫面看起來協調。過關：①至少 6 個造形 ②大約四分之三以上的造形，用同一個顏色的深淺，或色環上相鄰的顏色', '可以選一個顏色，用它的深淺變化；或選色環上相鄰的幾個顏色，例如紅、紅橙、橙。'],
    simplicity: ['讓畫面更單純，但要留下中間的花。過關：①花要留下 ②至少留 1 個裝飾 ③用一種方法：刪掉 2 個以上、排整齊，或減少顏色和大小的種類', '先找出最重要的花，再想想哪些裝飾可以刪掉、排整齊，或改成一樣的顏色。']
  };
  for (const [id, [task, tip]] of Object.entries(expected)) {
    assert.equal(def(id).task, task, id);
    assert.equal(def(id).creationTips, tip, id);
    assert.match(feedbackMarkup(def(id), null), /創作提示/, id);
  }
});

test('Gate 4C balance: one specific sentence per failure', () => {
  assert.equal(check('balance', []).studentDetail, '先放上造形，左右兩邊都要有。');
  assert.equal(check('balance', [el('a', { x: 480 }), el('b', { x: 520 })]).studentDetail, '造形都擠在中線附近，中間的造形不算左邊也不算右邊。把一些造形移到兩側。');
  assert.equal(check('balance', [el('a', { x: 200 }), el('b', { x: 300, y: 150 })]).studentDetail, '目前只有左邊有造形，另一邊也要放。');
  assert.equal(check('balance', [el('a', { x: 300 }), el('b', { x: 700 })]).studentDetail, '左右一模一樣，這是對稱。改變一邊的大小、數量或位置。');
  const leftHeavy = check('balance', [el('a', { x: 150, size: 5 }), el('b', { x: 600, size: 1 })]);
  assert.equal(leftHeavy.primaryDiagnosticCode, 'LEFT_HEAVY');
  assert.equal(leftHeavy.studentDetail, '畫面往左邊倒了。把左邊的造形變小或移近中線，或讓右邊的變大、移遠一點。');
  assert.match(check('balance', [el('a', { x: 850, size: 5 }), el('b', { x: 400, size: 1 })]).studentDetail, /^畫面往右邊倒了/);
  assert.equal(check('balance', [el('a', { x: 200, size: 4 }), el('b', { x: 780, size: 2 }), el('c', { x: 860, y: 150, size: 2 })]).passed, true);
});

test('Gate 4C rhythm: one specific sentence per failure, including why the path cannot be followed', () => {
  const row = (ys, values = {}) => ys.map((y, index) => el(`r${index}`, { x: 120 + index * 170, y, ...values }));
  assert.equal(check('rhythm', row([300, 200, 300, 200])).studentDetail, '目前有 4 個造形，至少要 5 個。');
  assert.equal(check('rhythm', row([300, 300, 300, 300, 300])).studentDetail, '造形排得很整齊，但都一樣。讓位置一高一低，或改變方向、大小、間距。');
  assert.equal(check('rhythm', row([300, 280, 300, 280, 300])).studentDetail, '變化太小，看不太出來。讓高低差大一點，或方向轉多一點。');
  assert.equal(check('rhythm', row([300, 160, 300, 160, 300])).passed, true);
  const stacked = [el('s0', { x: 200, y: 150 }), el('s1', { x: 200, y: 450 }), el('s2', { x: 400, y: 150 }), el('s3', { x: 600, y: 450 }), el('s4', { x: 800, y: 150 })];
  assert.equal(check('rhythm', stacked).studentDetail, '有兩個造形上下排在同一條直線上。造形要由左往右一個接一個排。');
  const gap = [100, 180, 260, 340, 900].map((x, index) => el(`g${index}`, { x, y: index % 2 ? 150 : 400 }));
  assert.equal(check('rhythm', gap).studentDetail, '有一段空隙特別大，路線斷掉了。把造形之間的距離排得平均一點。');
});

test('Gate 4C proportion: names the missing size', () => {
  const sized = (levels) => levels.map((level, index) => el(`p${index}`, { x: 100 + index * 140, proportion: level, ratioLevel: level }));
  assert.equal(check('proportion', sized([1, 2, 3, 1, 2])).studentDetail, '目前有 5 個造形，至少要 6 個。');
  assert.equal(check('proportion', sized([1, 2, 1, 2, 1, 2])).studentDetail, '還沒用到 3×。1×、2×、3× 三種尺寸都要有。');
  assert.equal(check('proportion', sized([1, 2, 3, 1, 2, 3])).passed, true);
});

test('Gate 4C unity: says how many more shapes need the common feature', () => {
  const seven = (values) => Array.from({ length: 7 }, (_, index) => el(`u${index}`, { x: 100 + index * 130, ...values(index) }));
  assert.equal(check('unity', seven(() => ({})).slice(0, 6)).studentDetail, '目前有 6 個造形，至少要 7 個。');
  const fiveBlue = seven((index) => ({ hue: index < 5 ? 'blue' : index === 5 ? 'red' : 'yellow', size: index % 2 ? 2 : 4, shape: index % 2 ? 'circle' : 'triangle' }));
  assert.equal(check('unity', fiveBlue).studentDetail, '藍色的造形有 5 個，還差 1 個。把其他造形也改成藍色。');
  assert.equal(check('unity', seven((index) => ({ hue: index < 6 ? 'blue' : 'red', size: index % 2 ? 2 : 4 }))).passed, true);
  assert.equal(check('unity', seven(() => ({ hue: 'blue' }))).studentDetail, '全部都一樣了。讓一些造形的大小、顏色或方向不同。');
  const scattered = seven((index) => ({ hue: ['red', 'blue', 'yellow', 'green', 'violet', 'orange', 'blue-green'][index], shape: ['circle', 'square', 'triangle', 'rectangle', 'circle', 'square', 'triangle'][index], rotation: [0, 0, 45, 90, 0, 0, 135][index] }));
  // The closest common feature may be a shape family (here: shapes with corners), as in the existing checker.
  assert.equal(check('unity', scattered).studentDetail, '有角的造形有 5 個，還差 1 個。把其他造形也換成有角的造形。');
});

test('Gate 4C harmony: names the colour that is too far away', () => {
  const six = (hues, values = {}) => hues.map((hue, index) => el(`h${index}`, { x: 100 + index * 150, hue, size: index % 2 ? 2 : 4, ...values }));
  assert.equal(check('harmony', six(['red', 'red', 'red-orange', 'orange', 'red'])).studentDetail, '目前有 5 個造形，至少要 6 個。');
  assert.equal(check('harmony', six(['red', 'red', 'red', 'red', 'red', 'red'])).studentDetail, '全部是同一個顏色、同一個深淺。加入深淺變化，或換成相鄰的顏色。');
  assert.equal(check('harmony', six(['red', 'red', 'red', 'yellow-green', 'green', 'blue-green'])).primaryDiagnosticCode, 'COLORS_TOO_FAR_APART');
  assert.match(check('harmony', six(['red', 'red', 'red', 'yellow-green', 'green', 'blue-green'])).studentDetail, /在色環上離得太遠了。把.+換成紅色旁邊的顏色。$/);
  const weak = six(['red', 'red-orange', 'orange', 'red', 'green', 'blue']);
  assert.equal(check('harmony', weak).primaryDiagnosticCode, 'HARMONY_TOO_WEAK');
  assert.match(check('harmony', weak).studentDetail, /^還有 2 個造形的顏色離得比較遠，例如.+的(綠色|藍色)圓形。$/);
  assert.equal(check('harmony', six(['red', 'red-orange', 'orange', 'red', 'red-orange', 'orange'])).passed, true);
});

test('Gate 4C simplicity: names the missing flower part and keeps the reset hint', () => {
  const start = createSimplicityInitialArtwork();
  const without = (pattern) => start.filter((item) => !pattern.test(item.id));
  assert.equal(check('simplicity', without(/petal-top/)).studentDetail, '中間的花要留下來，紅色花瓣不見了。按「復原本題」重新開始。');
  assert.equal(check('simplicity', without(/decoration/)).studentDetail, '裝飾全部刪掉了，至少留下 1 個。按「復原本題」重新開始。');
  assert.equal(check('simplicity', start).studentDetail, '畫面還沒有變單純。刪掉 2 個以上的裝飾、把造形排整齊，或把顏色改成一樣。');
  assert.equal(check('simplicity', without(/dot-1|dot-2/)).passed, true);
});

test('Gate 4C copy: student sentences avoid engineering words', () => {
  const engineering = /[A-Z_]{4,}|threshold|門檻|座標|權重|\d+\s*px|%/;
  for (const id of ['balance', 'rhythm', 'proportion', 'unity', 'harmony', 'simplicity']) {
    assert.doesNotMatch(def(id).task + def(id).creationTips, engineering, id);
  }
});

// Gate 4C (10/22) teacher decisions: judgement changes, each with its own check.
test('Gate 4C balance: a near-mirror (one shape moved a little) now counts as symmetric', () => {
  const pair = (dx) => [el('a', { x: 300, y: 200 }), el('b', { x: 700 + dx, y: 200 }), el('c', { x: 260, y: 420, size: 2 }), el('d', { x: 740, y: 420, size: 2 })];
  assert.equal(check('balance', pair(0)).primaryDiagnosticCode, 'ASYMMETRY_REQUIRED');
  assert.equal(check('balance', pair(40)).primaryDiagnosticCode, 'ASYMMETRY_REQUIRED');
  assert.equal(check('balance', pair(100)).primaryDiagnosticCode !== 'ASYMMETRY_REQUIRED', true);
});

test('Gate 4C rhythm: several hills pass; one hill or one direction is a gradation', () => {
  const row = (field, values) => values.map((value, index) => el(`w${index}`, { x: 120 + index * 170, [field]: value }));
  assert.equal(check('rhythm', row('y', [300, 160, 300, 160, 300])).passed, true);
  assert.equal(check('rhythm', row('size', [1, 3, 1, 3, 1])).passed, true);
  const oneHill = check('rhythm', row('y', [400, 300, 180, 300, 400]));
  assert.equal(oneHill.primaryDiagnosticCode, 'ONE_HILL_ONLY');
  assert.equal(oneHill.studentDetail, '只有一座山比較像漸層，律動要有好幾座山的起伏。');
  assert.equal(check('rhythm', row('size', [1, 2, 3, 4, 5])).studentDetail, '變化一路往同一個方向，比較像漸層。律動要有好幾座山的起伏。');
  assert.equal(check('rhythm', row('rotation', [0, 45, 90, 135, 180])).primaryDiagnosticCode, 'ONE_HILL_ONLY');
  assert.equal(check('rhythm', row('rotation', [0, 90, 0, 90, 0])).passed, true);
});

test('Gate 4C unity: a rectangle turned 180° faces the same way', () => {
  const shapes = [['rectangle', 0], ['rectangle', 180], ['rectangle', 180], ['triangle', 0], ['triangle', 0], ['semicircle', 0], ['semicircle', 0]];
  const hues = ['red', 'blue', 'yellow', 'green', 'violet', 'orange', 'blue-green'];
  const work = shapes.map(([shape, rotation], index) => el(`d${index}`, { shape, rotation, x: 100 + index * 130, hue: hues[index] }));
  const result = check('unity', work);
  assert.equal(result.passed, true);
  assert.ok(result.detectedMethods.includes('rotation'));
});

test('Gate 4C harmony: close colours are within 3 steps, so harmony and contrast no longer overlap', () => {
  const six = (hues) => hues.map((hue, index) => el(`k${index}`, { x: 100 + index * 150, hue, size: index % 2 ? 2 : 4 }));
  assert.equal(check('harmony', six(['red', 'red-orange', 'orange', 'yellow-orange', 'red', 'orange'])).passed, true);
  assert.equal(check('harmony', six(['red', 'red', 'red-orange', 'yellow', 'yellow', 'orange'])).passed, false);
  assert.equal(check('harmony', six(['red', 'red-orange', 'red', 'red-orange', 'red', 'yellow'])).passed, true);
});

test('Gate 4C balance: the two sides must weigh about the same (heavier side at most 1.5×)', () => {
  assert.equal(def('balance').validationSpec.balanceTolerance, 0.2);
  const c = (id, x, size, y = 300) => el(id, { x, y, size });
  const works = {
    A: [[c('a', 250, 5), c('b', 700, 3, 220), c('c', 800, 3, 400)], true],
    B: [[c('a', 380, 5), c('b', 880, 3)], true],
    E: [[c('a', 250, 5), c('b', 750, 4)], true],
    H: [[c('a', 300, 3, 200), c('b', 300, 3, 420), c('c', 820, 4)], true],
    C: [[c('a', 250, 5), c('b', 750, 3)], false],
    D: [[c('a', 250, 2, 180), c('b', 250, 2, 300), c('c', 250, 2, 420), c('d', 750, 4)], false],
    G: [[c('a', 250, 5), c('b', 750, 2)], false],
    F: [[c('a', 200, 5), c('b', 350, 4, 450), c('c', 750, 2)], false]
  };
  for (const [name, [work, passes]] of Object.entries(works)) assert.equal(check('balance', work).passed, passes, name);
  // Three small against one big still works once the big one moves further out.
  assert.equal(check('balance', [c('a', 300, 2, 180), c('b', 300, 2, 300), c('c', 300, 2, 420), c('d', 900, 4)]).passed, true);
});
