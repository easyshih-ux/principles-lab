import { generateGradationSizeQuestion, getDiscoverQuestion } from './discover-questions.js';
import { createSeededRandom } from './discover-randomizer.js';
import { getShapeDimensions } from './geometry/bounds.js';

const SHAPES = ['circle', 'square', 'triangle', 'rectangle'];
const HUES = ['red', 'orange', 'yellow', 'green', 'blue'];
const clone = (value) => JSON.parse(JSON.stringify(value));
const pick = (items, random) => items[Math.floor(random() * items.length)];
const integer = (minimum, maximum, random) => minimum + Math.floor(random() * (maximum - minimum + 1));
const different = (items, value, random) => pick(items.filter((item) => item !== value), random);

function shuffle(items, random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function element(id, shape, x, y, size, hue, extra = {}) {
  return { id, shape, x, y, size, hue, lightness: 3, rotation: 0, proportion: 1, layer: 1, ...extra };
}

function fromTemplate(id, changes = {}) {
  return { ...clone(getDiscoverQuestion(id)), ...changes };
}

function shuffledPanels(template, panels, random) {
  const letters = ['a', 'b', 'c'];
  const arranged = shuffle(panels, random).map((panel, index) => ({
    ...panel,
    id: letters[index],
    label: letters[index].toUpperCase()
  }));
  return {
    ...template,
    comparisonPanels: arranged,
    options: arranged.map(({ id, label }) => ({ id, label }))
  };
}

function generateRepetitionSingle(random) {
  const commonShape = pick(SHAPES, random);
  const wrongShape = different(SHAPES, commonShape, random);
  const hue = pick(HUES, random);
  const wrongIndex = integer(1, 4, random);
  const y = integer(280, 340, random);
  const elements = Array.from({ length: 6 }, (_, index) => element(
    index === wrongIndex ? 'r1-wrong' : `r1-${index + 1}`,
    index === wrongIndex ? wrongShape : commonShape,
    170 + index * 132,
    y,
    2,
    hue
  ));
  return fromTemplate('discover-repetition-single', {
    elements,
    selectableElementIds: elements.map(({ id }) => id),
    correctAnswer: 'r1-wrong',
    correctIndex: wrongIndex
  });
}

function generateRepetitionGroup(random) {
  const firstShape = pick(SHAPES, random);
  const secondShape = different(SHAPES, firstShape, random);
  const wrongShape = different(SHAPES, secondShape, random);
  const firstHue = pick(HUES, random);
  const secondHue = different(HUES, firstHue, random);
  const wrongGroup = integer(0, 3, random);
  const elements = [0, 1, 2, 3].flatMap((groupIndex) => [
    element(`rg-a-${groupIndex}`, firstShape, 130 + groupIndex * 240, 285 + (groupIndex % 2) * 30, 2, firstHue),
    element(groupIndex === wrongGroup ? 'rg-wrong' : `rg-b-${groupIndex}`, groupIndex === wrongGroup ? wrongShape : secondShape, 205 + groupIndex * 240, 315 + (groupIndex % 2) * 30, 2, secondHue)
  ]);
  return fromTemplate('discover-repetition-group', {
    overlapPolicy: 'avoid',
    elements,
    selectableElementIds: elements.map(({ id }) => id),
    correctAnswer: 'rg-wrong',
    correctIndex: elements.findIndex(({ id }) => id === 'rg-wrong')
  });
}

function isStrictlyMonotonic(values) {
  const differences = values.slice(1).map((value, index) => value - values[index]);
  return differences.every((difference) => difference > 0) || differences.every((difference) => difference < 0);
}

function generateGradationLightness(random) {
  const direction = random() < 0.5 ? 'ascending' : 'descending';
  const expected = direction === 'ascending' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
  const correctIndex = integer(1, 3, random);
  const actual = expected.slice();
  const ascendingWrongValues = { 1: 4, 2: 5, 3: 2 };
  actual[correctIndex] = direction === 'ascending'
    ? ascendingWrongValues[correctIndex]
    : 6 - ascendingWrongValues[correctIndex];
  if (!isStrictlyMonotonic(actual.filter((_, index) => index !== correctIndex))) {
    throw new Error('Invalid lightness gradation fixture.');
  }
  const shape = pick(['square', 'circle', 'triangle'], random);
  const hue = pick(['red', 'green', 'blue', 'violet'], random);
  const elements = actual.map((lightness, index) => element(
    index === correctIndex ? 'gl-wrong' : `gl-${index + 1}`,
    shape,
    220 + index * 140,
    310,
    3,
    hue,
    { lightness }
  ));
  return fromTemplate('discover-gradation-lightness', {
    elements,
    selectableElementIds: elements.map(({ id }) => id),
    correctAnswer: 'gl-wrong',
    correctIndex,
    gradationDirection: direction,
    expectedLightness: expected,
    actualLightness: actual
  });
}

function gapRow(prefix, gaps, shape, hue) {
  const size = 1;
  const diameter = 36;
  const totalWidth = gaps.reduce((sum, gap) => sum + gap, diameter * (gaps.length + 1));
  let center = (1000 - totalWidth) / 2 + diameter / 2;
  const elements = [element(`${prefix}-1`, shape, center, 310, size, hue)];
  gaps.forEach((gap, index) => {
    center += diameter + gap;
    elements.push(element(`${prefix}-${index + 2}`, shape, center, 310, size, hue));
  });
  return elements;
}

function generateGradationGap(random) {
  const shape = pick(['circle', 'square'], random);
  const hue = pick(HUES, random);
  const start = integer(24, 34, random);
  const step = integer(12, 18, random);
  const increasing = Array.from({ length: 5 }, (_, index) => start + index * step);
  const monotonic = random() < 0.5 ? increasing : increasing.slice().reverse();
  const equal = Array(5).fill(integer(48, 72, random));
  const irregular = [monotonic[0], monotonic[2], monotonic[1], monotonic[4], monotonic[3]];
  const result = shuffledPanels(fromTemplate('discover-gradation-gap'), [
    { role: 'equal', elements: gapRow('gap-equal', equal, shape, hue) },
    { role: 'correct', elements: gapRow('gap-correct', monotonic, shape, hue) },
    { role: 'irregular', elements: gapRow('gap-irregular', irregular, shape, hue) }
  ], random);
  result.correctAnswer = result.comparisonPanels.find(({ role }) => role === 'correct').id;
  result.generatedGaps = { equal, monotonic, irregular };
  return result;
}

function symmetryBase(random) {
  const ys = shuffle([175, 310, 445], random);
  const distances = [150, 230, 190];
  const shapes = shuffle(SHAPES, random).slice(0, 3);
  const hue = pick(HUES, random);
  return { ys, distances, shapes, hue };
}

function generateSymmetryShape(random) {
  const { ys, distances, hue } = symmetryBase(random);
  const commonShape = pick(SHAPES, random);
  const wrongShape = different(SHAPES, commonShape, random);
  const wrongPair = integer(0, 2, random);
  const wrongSide = random() < 0.5 ? 'left' : 'right';
  const elements = [];
  for (let index = 0; index < 3; index += 1) {
    const leftWrong = index === wrongPair && wrongSide === 'left';
    const rightWrong = index === wrongPair && wrongSide === 'right';
    elements.push(element(leftWrong ? 'ss-wrong' : `ss-l${index + 1}`, leftWrong ? wrongShape : commonShape, 500 - distances[index], ys[index], 2, hue));
    elements.push(element(rightWrong ? 'ss-wrong' : `ss-r${index + 1}`, rightWrong ? wrongShape : commonShape, 500 + distances[index], ys[index], 2, hue));
  }
  return fromTemplate('discover-symmetry-shape', { elements, selectableElementIds: elements.map(({ id }) => id), correctAnswer: 'ss-wrong', correctIndex: elements.findIndex(({ id }) => id === 'ss-wrong') });
}

function generateSymmetryPosition(random) {
  const { ys, shapes, hue } = symmetryBase(random);
  const distances = [200, 200, 200];
  const wrongPair = integer(0, 2, random);
  const wrongSide = random() < 0.5 ? 'left' : 'right';
  const shift = integer(55, 85, random) * (random() < 0.5 ? -1 : 1);
  const elements = [];
  for (let index = 0; index < 3; index += 1) {
    const leftWrong = index === wrongPair && wrongSide === 'left';
    const rightWrong = index === wrongPair && wrongSide === 'right';
    elements.push(element(leftWrong ? 'sp-wrong' : `sp-l${index + 1}`, shapes[index], 500 - distances[index] + (leftWrong ? shift : 0), ys[index], 2, hue));
    elements.push(element(rightWrong ? 'sp-wrong' : `sp-r${index + 1}`, shapes[index], 500 + distances[index] + (rightWrong ? shift : 0), ys[index], 2, hue));
  }
  return fromTemplate('discover-symmetry-position', { elements, selectableElementIds: elements.map(({ id }) => id), correctAnswer: 'sp-wrong', correctIndex: elements.findIndex(({ id }) => id === 'sp-wrong') });
}

function rhythmRow(prefix, ys, shape, hue, rotations = []) {
  return ys.map((y, index) => element(`${prefix}-${index + 1}`, shape, 170 + index * 132, y, 2, hue, { rotation: rotations[index] ?? 0 }));
}

function generateRhythmCompare(random) {
  const shape = pick(['circle', 'triangle', 'square'], random);
  const hue = pick(HUES, random);
  const center = integer(285, 325, random);
  const amplitude = integer(90, 125, random);
  const wave = random() < 0.5
    ? [center + amplitude, center, center - amplitude, center, center + amplitude, center]
    : [center - amplitude, center, center + amplitude, center, center - amplitude, center];
  const result = shuffledPanels(fromTemplate('discover-rhythm-compare'), [
    { role: 'flat', elements: rhythmRow('rc-flat', Array(6).fill(center), shape, hue) },
    { role: 'rhythm', elements: rhythmRow('rc-rhythm', wave, shape, hue) }
  ], random);
  result.correctAnswer = result.comparisonPanels.find(({ role }) => role === 'rhythm').id;
  return result;
}

function generateRhythmMultiple(random) {
  const hue = pick(HUES, random);
  const center = 300;
  const amplitude = integer(95, 125, random);
  const flatShape = pick(['circle', 'square'], random);
  const waveShape = different(['circle', 'square', 'triangle'], flatShape, random);
  const dynamicShape = different(SHAPES, waveShape, random);
  const panels = [
    { role: 'flat', elements: rhythmRow('rm-flat', Array(6).fill(center), flatShape, hue) },
    { role: 'wave', elements: rhythmRow('rm-wave', [center + amplitude, center, center - amplitude, center, center + amplitude, center], waveShape, hue) },
    { role: 'dynamic', elements: rhythmRow('rm-dynamic', [410, 330, 215, 170, 245, 390], dynamicShape, hue, [315, 0, 45, 90, 45, 135]) }
  ];
  const result = shuffledPanels(fromTemplate('discover-rhythm-multiple'), panels, random);
  result.correctAnswer = result.comparisonPanels.filter(({ role }) => role !== 'flat').map(({ id }) => id).sort();
  result.feedbackByCode = { ...result.feedbackByCode, incorrect: '再比較三張圖的起伏、方向與視線動勢。只有再次出現，還不一定形成明顯律動。' };
  return result;
}

function proportionElements(prefix, sizes, shape, hue) {
  return sizes.map((displaySize, index) => element(`${prefix}-${index + 1}`, shape, 300 + index * 200, 420 - displaySize / 2, 3, hue, { displaySize }));
}

function generateProportion(random) {
  const unit = integer(38, 48, random);
  const shape = pick(['circle', 'square'], random);
  const hue = pick(HUES, random);
  const correct = [unit, unit * 2, unit * 3];
  const result = shuffledPanels(fromTemplate('discover-proportion'), [
    { role: 'correct', elements: proportionElements('p-correct', correct, shape, hue) },
    { role: 'low-middle', elements: proportionElements('p-low', [unit, Math.round(unit * 1.55), unit * 3], shape, hue) },
    { role: 'high-middle', elements: proportionElements('p-high', [unit, Math.round(unit * 2.55), unit * 3], shape, hue) }
  ], random);
  result.correctAnswer = result.comparisonPanels.find(({ role }) => role === 'correct').id;
  result.ratioUnit = unit;
  return result;
}

function contrastGroup(prefix, accent, shape, hue, accentIndex) {
  const points = [[300,210],[500,190],[700,220],[350,390],[550,390],[750,370]];
  return points.map(([x, y], index) => element(`${prefix}-${index}`, index === accentIndex ? accent.shape : shape, x, y, 2, index === accentIndex ? accent.hue : hue, { lightness: index === accentIndex ? accent.lightness ?? 3 : 3 }));
}

function generateContrast(random) {
  const baseShape = pick(['circle', 'square'], random);
  const baseHue = pick(HUES, random);
  const accentShape = different(SHAPES, baseShape, random);
  const accentHue = different(HUES, baseHue, random);
  const accentIndex = integer(0, 5, random);
  const result = shuffledPanels(fromTemplate('discover-contrast'), [
    { role: 'weak', elements: contrastGroup('ct-weak', { shape: baseShape, hue: baseHue, lightness: 4 }, baseShape, baseHue, accentIndex) },
    { role: 'medium', elements: contrastGroup('ct-medium', { shape: accentShape, hue: baseHue }, baseShape, baseHue, accentIndex) },
    { role: 'strong', elements: contrastGroup('ct-strong', { shape: accentShape, hue: accentHue }, baseShape, baseHue, accentIndex) }
  ], random);
  result.correctAnswer = result.comparisonPanels.find(({ role }) => role === 'strong').id;
  return result;
}

function balancePanels(random) {
  const hue = pick(HUES, random);
  const largeShape = pick(['circle', 'square'], random);
  const smallShape = different(['circle', 'square', 'triangle'], largeShape, random);
  const flip = random() < 0.5;
  const left = flip ? 700 : 300;
  const right = flip ? 300 : 700;
  const stable = [element('ba-stable-large', largeShape, left, 310, 5, hue), ...[190,310,430].map((y,index)=>element(`ba-stable-small-${index}`,smallShape,right,y,2,hue))];
  const shifted = [element('ba-shift-large', largeShape, flip ? 760 : 240, 310, 5, hue), ...[190,310,430].map((y,index)=>element(`ba-shift-small-${index}`,smallShape,flip ? 540 : 460,y,2,hue))];
  const unequal = [element('ba-unequal-large', largeShape, left, 310, 5, hue), element('ba-unequal-small', smallShape, right, 310, 1, hue)];
  return { stable, shifted, unequal };
}

function generateBalance(random) {
  const panels = balancePanels(random);
  const result = shuffledPanels(fromTemplate('discover-balance'), [
    { role: 'unequal', elements: panels.unequal },
    { role: 'correct', elements: panels.stable },
    { role: 'shifted', elements: panels.shifted }
  ], random);
  result.correctAnswer = result.comparisonPanels.find(({ role }) => role === 'correct').id;
  return result;
}

const ADJACENT_SETS = [
  { hues: ['blue', 'green'], colors: ['#3E78B2', '#3E8F91', '#4F9D78'], outlier: ['orange', '#DC7832'] },
  { hues: ['red', 'orange'], colors: ['#D95A4B', '#DC7832', '#E89A5D'], outlier: ['blue', '#3E78B2'] },
  { hues: ['yellow', 'green'], colors: ['#D5AC2D', '#91A848', '#4F9D78'], outlier: ['purple', '#9467B2'] }
];
const SCATTER = [[230,180],[390,300],[540,170],[690,300],[830,170],[790,430],[500,430]];

function generateHarmony(random) {
  const palette = pick(ADJACENT_SETS, random);
  const wrongIndex = integer(0, 6, random);
  const positions = shuffle(SCATTER, random);
  const shapes = Array.from({ length: 7 }, () => pick(SHAPES, random));
  const elements = positions.map(([x,y], index) => element(index === wrongIndex ? 'ha-wrong' : `ha-${index+1}`, shapes[index], x, y, index % 2 ? 2 : 3, palette.hues[index % palette.hues.length], { displayColor: index === wrongIndex ? palette.outlier[1] : palette.colors[index % palette.colors.length] }));
  return fromTemplate('discover-harmony', { overlapPolicy:'avoid', elements, selectableElementIds:elements.map(({id})=>id), correctAnswer:'ha-wrong', correctIndex:wrongIndex });
}

function generateUnity(random) {
  const commonHue = pick(HUES, random);
  const wrongHue = different(HUES, commonHue, random);
  const wrongIndex = integer(0, 6, random);
  const positions = shuffle(SCATTER, random);
  const elements = positions.map(([x,y], index) => element(index === wrongIndex ? 'un-wrong' : `un-${index+1}`, pick(SHAPES, random), x, y, index % 2 ? 2 : 3, index === wrongIndex ? wrongHue : commonHue));
  return fromTemplate('discover-unity', { overlapPolicy:'avoid', elements, selectableElementIds:elements.map(({id})=>id), correctAnswer:'un-wrong', correctIndex:wrongIndex });
}

function synthesisPanel(prefix, mode, random) {
  const positions = [[250,190],[420,330],[590,180],[760,330]];
  const shapes = shuffle(SHAPES, random);
  if (mode === 'unity') {
    const hue = pick(HUES, random);
    return positions.map(([x,y],index)=>element(`${prefix}-${index}`,shapes[index],x,y,index%2?2:3,hue));
  }
  const palette = pick(ADJACENT_SETS, random);
  return positions.map(([x,y],index)=>element(`${prefix}-${index}`,shapes[index],x,y,index%2?2:3,palette.hues[index%2],{displayColor:palette.colors[index%3]}));
}

function generateHarmonyUnity(random) {
  const result = shuffledPanels(fromTemplate('discover-harmony-unity'), [
    { role:'harmony', elements:synthesisPanel('hu-harmony','harmony',random) },
    { role:'unity', elements:synthesisPanel('hu-unity','unity',random) }
  ], random);
  result.pairingTargets = ['harmony','unity'];
  result.correctAnswer = Object.fromEntries(result.comparisonPanels.map(({id,role})=>[id,role]));
  result.overlapPolicy = 'avoid';
  result.successFeedback = result.comparisonPanels.map(({id,role})=>`${id.toUpperCase()}｜${role==='harmony'?'調和：相近 → 協調':'統一：共同 → 一致'}`).join('　　');
  return result;
}

function recolor(elements, flowerHue, centerHue, stemHue) {
  return clone(elements).map((item) => ({ ...item, hue: item.id.includes('center') ? centerHue : item.id.includes('stem') ? stemHue : item.id.includes('petal') ? flowerHue : item.hue }));
}

function generateSimplicity(random) {
  const template = fromTemplate('discover-simplicity');
  const flowerHue = pick(['red','orange','blue'],random);
  const centerHue = different(['yellow','orange','red'],flowerHue,random);
  const stemHue = 'green';
  template.beforeState = recolor(template.beforeState,flowerHue,centerHue,stemHue);
  const roles = ['partial','correct','excessive'];
  const panels = template.comparisonPanels.map((panel,index)=>({role:roles[index],elements:recolor(panel.elements,flowerHue,centerHue,stemHue)}));
  const result = shuffledPanels(template,panels,random);
  result.correctAnswer = result.comparisonPanels.find(({role})=>role==='correct').id;
  const partialId = result.comparisonPanels.find(({role})=>role==='partial').id;
  const excessiveId = result.comparisonPanels.find(({role})=>role==='excessive').id;
  result.feedbackByCode = { incomplete:'請先選擇一個版本。',[partialId]:'雖然少了一些元素，但畫面是不是還有不少不必要的裝飾？',[excessiveId]:'東西最少不一定就是單純。原本主要的花朵還看得出來嗎？' };
  return result;
}

const GENERATORS = {
  'discover-repetition-single': generateRepetitionSingle,
  'discover-repetition-group': generateRepetitionGroup,
  'discover-gradation-size': generateGradationSizeQuestion,
  'discover-gradation-lightness': generateGradationLightness,
  'discover-gradation-gap': generateGradationGap,
  'discover-symmetry-shape': generateSymmetryShape,
  'discover-symmetry-position': generateSymmetryPosition,
  'discover-rhythm-compare': generateRhythmCompare,
  'discover-rhythm-multiple': generateRhythmMultiple,
  'discover-proportion': generateProportion,
  'discover-contrast': generateContrast,
  'discover-balance': generateBalance,
  'discover-harmony': generateHarmony,
  'discover-unity': generateUnity,
  'discover-harmony-unity': generateHarmonyUnity,
  'discover-simplicity': generateSimplicity
};

function questionSelections(question) {
  if (question.interactionType === 'element-select') return question.selectableElementIds ?? [];
  if (question.interactionType === 'gap-select') return question.selectableGapIds ?? [];
  if (question.interactionType === 'pairing') return question.comparisonPanels.map(({id})=>id);
  return question.options?.map(({id})=>id) ?? [];
}

function visualDimensions(item) {
  if (item.displaySize != null) {
    return { width: item.displaySize * (item.shape === 'rectangle' ? 1.5 : 1), height: item.displaySize };
  }
  return getShapeDimensions(item);
}

function hasUnwantedOverlap(elements) {
  return elements.some((left, leftIndex) => elements.slice(leftIndex + 1).some((right) => {
    const leftSize = visualDimensions(left);
    const rightSize = visualDimensions(right);
    return Math.abs(left.x - right.x) < (leftSize.width + rightSize.width) / 2 + 8
      && Math.abs(left.y - right.y) < (leftSize.height + rightSize.height) / 2 + 8;
  }));
}

export function validateGeneratedQuestion(question) {
  const selections = questionSelections(question);
  const answers = question.interactionType === 'pairing' ? Object.keys(question.correctAnswer)
    : Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
  if (!answers.every((answer) => selections.includes(answer))) return false;
  const groups = [question.elements ?? [], question.beforeState ?? [], ...(question.comparisonPanels ?? []).map(({elements})=>elements)];
  return groups.every((elements) => {
    const ids = elements.map(({id})=>id);
    return ids.length === new Set(ids).size
      && elements.every((item) => item.x >= 40 && item.x <= 960 && item.y >= 40 && item.y <= 560 && (item.displaySize ?? 80) <= 160)
      && (question.overlapPolicy !== 'avoid' || !hasUnwantedOverlap(elements));
  });
}

export function generateDiscoverQuestions(questions, seed = Date.now()) {
  const random = createSeededRandom(Number(seed) ^ 0x44594E41);
  return Object.fromEntries(questions.map((template) => {
    const generator = GENERATORS[template.id];
    if (!generator) throw new Error(`Missing generator for ${template.id}`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const generated = generator(random);
      if (validateGeneratedQuestion(generated)) return [template.id, generated];
    }
    throw new Error(`Unable to generate a safe question for ${template.id}`);
  }));
}

export { GENERATORS as discoverQuestionGenerators };
