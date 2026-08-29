import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverQuestions, discoverInteractionTypes, generateGradationSizeQuestion, overlapPolicies } from '../discover-questions.js';
import { createDiscoverOrder, createSeededRandom, EASY_START_IDS, isValidDiscoverOrder } from '../discover-randomizer.js';
import { validateDiscoverQuestion } from '../discover-validators.js';
import { advanceDiscoverCourse, applyDiscoverResult, createDiscoverCourseState, currentDiscoverQuestion, setDiscoverSelection, startDiscoverCourse } from '../discover-course-state.js';
import { assertGeometryElement } from '../geometry/model.js';
import { getShapeDimensions } from '../geometry/bounds.js';
import { discoverQuestionGenerators, generateDiscoverQuestions, validateGeneratedQuestion } from '../discover-generators.js';

const ids = discoverQuestions.map(({ id }) => id);
const byId = Object.fromEntries(discoverQuestions.map((question) => [question.id, question]));

test('Phase 5 has exactly sixteen unique formal questions', () => {
  assert.equal(discoverQuestions.length, 16);
  assert.equal(new Set(ids).size, 16);
});

test('all questions have the required data-driven fields', () => {
  discoverQuestions.forEach((question) => {
    ['id','principleId','conceptVariant','interactionType','prompt','overlapPolicy','correctAnswer','hints','successFeedback','validatorId','allowedTools','difficulty','randomizationGroup'].forEach((field) => assert.notEqual(question[field], undefined, `${question.id}: ${field}`));
    assert.equal(discoverInteractionTypes.includes(question.interactionType), true);
    assert.equal(overlapPolicies.includes(question.overlapPolicy), true);
    assert.equal(question.hints.length >= 2, true);
    [...(question.elements ?? []), ...(question.beforeState ?? []), ...(question.comparisonPanels ?? []).flatMap((panel) => panel.elements)].forEach(assertGeometryElement);
  });
});

test('gradation fixtures isolate size and gap changes', () => {
  const sizeQuestion = byId['discover-gradation-size'];
  const boxes = sizeQuestion.elements.map((element) => {
    const { width, height } = getShapeDimensions(element);
    const renderedHeight = Math.max(height, 64); // 48px minimum hit area at the current canvas scale.
    return { left: element.x - width / 2, right: element.x + width / 2, bottom: element.y + renderedHeight / 2 };
  });
  assert.deepEqual(sizeQuestion.elements.slice(1).map((element, index) => element.x - sizeQuestion.elements[index].x), [140, 140, 140, 140]);
  assert.equal(new Set(boxes.map(({ bottom }) => bottom)).size, 1);
  assert.equal(boxes[0].bottom, 420);
  assert.deepEqual(sizeQuestion.elements.map(({ shape }) => shape), ['rectangle', 'rectangle', 'rectangle', 'rectangle', 'rectangle']);
  assert.equal(new Set(sizeQuestion.elements.map(({ hue }) => hue)).size, 1);
  assert.equal(new Set(sizeQuestion.elements.map(({ proportion }) => proportion)).size, 1);
  assert.deepEqual(sizeQuestion.elements.map(({ size }) => size), [5, 4, 2, 3, 1]);
  assert.equal(sizeQuestion.correctAnswer, 'gs-4');
  const gapQuestion = byId['discover-gradation-gap'];
  assert.equal(gapQuestion.interactionType, 'composition-choice');
  const panelGaps = gapQuestion.comparisonPanels.map((panel) => panel.elements.slice(1).map((element, index) => (
    (element.x - 18) - (panel.elements[index].x + 18)
  )));
  assert.deepEqual(panelGaps, [[60, 60, 60, 60, 60], [30, 50, 70, 90, 110], [30, 70, 50, 110, 70]]);
  assert.equal(gapQuestion.correctAnswer, 'b');
});

test('calibrated comparison fixtures keep their intended visual variables', () => {
  const lightness = byId['discover-gradation-lightness'];
  assert.deepEqual(lightness.elements.map((element) => element.lightness), [1, 2, 5, 4, 5]);

  const proportion = byId['discover-proportion'];
  assert.deepEqual(proportion.comparisonPanels.map((panel) => panel.elements.map((element) => element.displaySize)), [
    [50, 100, 150], [50, 75, 150], [50, 125, 150]
  ]);

  const balance = byId['discover-balance'];
  const panelB = balance.comparisonPanels[1].elements;
  const panelC = balance.comparisonPanels[2].elements;
  assert.deepEqual(panelB.map(({ shape, size }) => [shape, size]), panelC.map(({ shape, size }) => [shape, size]));
  assert.notDeepEqual(panelB.map(({ x }) => x), panelC.map(({ x }) => x));

  const simplicity = byId['discover-simplicity'];
  assert.equal(simplicity.beforeState.some(({ id }) => id === 'si-before-center'), true);
  assert.equal(simplicity.comparisonPanels[1].elements.length, 6);
  assert.equal(simplicity.comparisonPanels[1].elements.some(({ id }) => id === 'si-b-stem'), true);
  assert.equal(simplicity.comparisonPanels[2].elements.length, 1);
  assert.equal(simplicity.comparisonPanels[2].elements.some(({ id }) => id === 'si-c-center'), true);

  const groups = byId['discover-repetition-group'].elements;
  const groupCenters = [0, 1, 2, 3].map((index) => [groups[index * 2].x, groups[index * 2 + 1].x]);
  assert.deepEqual(groupCenters, [[130, 205], [360, 435], [590, 665], [820, 895]]);
});

test('Phase 5 no longer forces overlap', () => {
  assert.equal(discoverQuestions.some(({ overlapPolicy }) => overlapPolicy === 'required'), false);
});

test('formal principles and interaction types follow the confirmed specification', () => {
  assert.deepEqual(discoverQuestions.map(({ principleId }) => principleId), ['repetition','repetition','gradation','gradation','gradation','symmetry','symmetry','rhythm','rhythm','proportion','contrast','balance','harmony','unity','synthesis','simplicity']);
  assert.deepEqual(discoverQuestions.map(({ interactionType }) => interactionType), ['element-select','element-select','element-select','element-select','composition-choice','element-select','element-select','composition-choice','multi-select-composition','composition-choice','composition-choice','composition-choice','element-select','element-select','pairing','composition-choice']);
});

for (const seed of [7, 42, 2026, 5501, 99173]) {
  test(`seed ${seed} creates a complete constrained order`, () => {
    const order = createDiscoverOrder(discoverQuestions, seed);
    assert.equal(order.length, 16);
    assert.deepEqual(new Set(order), new Set(ids));
    assert.equal(EASY_START_IDS.includes(order[0]), true);
    assert.equal(isValidDiscoverOrder(order, discoverQuestions), true);
    assert.equal(order.indexOf('discover-harmony-unity') > order.indexOf('discover-harmony'), true);
    assert.equal(order.indexOf('discover-harmony-unity') > order.indexOf('discover-unity'), true);
    assert.equal(order.indexOf('discover-simplicity') >= 8, true);
    for (let index = 1; index < order.length; index += 1) assert.notEqual(byId[order[index]].principleId, byId[order[index - 1]].principleId);
  });
}

test('restarting creates a new legal order while rerender reads the saved order', () => {
  const state = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(state, discoverQuestions, 7);
  const first = state.questionOrder.slice();
  assert.equal(currentDiscoverQuestion(state, discoverQuestions).id, first[0]);
  assert.deepEqual(state.questionOrder, first);
  startDiscoverCourse(state, discoverQuestions, 42);
  assert.notDeepEqual(state.questionOrder, first);
  assert.equal(isValidDiscoverOrder(state.questionOrder, discoverQuestions), true);
});

test('generated size gradation has one recorded answer across varied directions and positions', () => {
  const directions = new Set();
  const answerIndexes = new Set();
  for (let seed = 1; seed <= 100; seed += 1) {
    const question = generateGradationSizeQuestion(createSeededRandom(seed));
    directions.add(question.gradationDirection);
    answerIndexes.add(question.correctIndex);
    assert.equal(question.correctIndex >= 1 && question.correctIndex <= 3, true);
    assert.equal(question.correctAnswer, question.elements[question.correctIndex].id);
    assert.equal(question.actualSizes[question.correctIndex] > Math.max(...question.expectedSizes), true);
    assert.equal(new Set(question.elements.map(({ shape }) => shape)).size, 1);
    assert.equal(new Set(question.elements.map(({ hue }) => hue)).size, 1);
    assert.deepEqual(question.elements.slice(1).map((item, index) => item.x - question.elements[index].x), [190, 190, 190, 190]);
    assert.equal(question.elements.slice(1).every((item, index) => {
      const previous = question.elements[index];
      return item.x - item.displaySize * 0.75 > previous.x + previous.displaySize * 0.75;
    }), true);
    assert.equal(new Set(question.elements.map((item) => item.y + Math.max(item.displaySize, 64) / 2)).size, 1);

    const monotonicAfterRemoval = question.actualSizes.map((_, removedIndex) => {
      const remaining = question.actualSizes.filter((__, index) => index !== removedIndex);
      const differences = remaining.slice(1).map((value, index) => value - remaining[index]);
      return differences.every((difference) => difference > 0) || differences.every((difference) => difference < 0);
    });
    assert.deepEqual(monotonicAfterRemoval.map((valid, index) => valid ? index : -1).filter((index) => index >= 0), [question.correctIndex]);
  }
  assert.deepEqual(directions, new Set(['ascending', 'descending']));
  assert.deepEqual(answerIndexes, new Set([1, 2, 3]));
});

test('generated size gradation is saved for rerenders and regenerated on restart', () => {
  const state = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(state, discoverQuestions, 7);
  const first = state.generatedQuestions['discover-gradation-size'];
  state.currentIndex = state.questionOrder.indexOf('discover-gradation-size');
  assert.equal(currentDiscoverQuestion(state, discoverQuestions), first);
  assert.equal(currentDiscoverQuestion(state, discoverQuestions), first);
  startDiscoverCourse(state, discoverQuestions, 42);
  assert.notDeepEqual(state.generatedQuestions['discover-gradation-size'].actualSizes, first.actualSizes);
});

test('all sixteen templates have a dynamic generator', () => {
  assert.deepEqual(new Set(Object.keys(discoverQuestionGenerators)), new Set(ids));
});

test('dynamic generation produces safe, answerable instances across many seeds', () => {
  const signatures = Object.fromEntries(ids.map((id) => [id, new Set()]));
  const answerPositions = Object.fromEntries(ids.map((id) => [id, new Set()]));
  for (let seed = 1; seed <= 80; seed += 1) {
    const generated = generateDiscoverQuestions(discoverQuestions, seed);
    assert.deepEqual(new Set(Object.keys(generated)), new Set(ids));
    Object.values(generated).forEach((question) => {
      assert.equal(validateGeneratedQuestion(question), true, `${seed}: ${question.id}`);
      assert.equal(validateDiscoverQuestion(question, question.correctAnswer).isValid, true, `${seed}: ${question.id}`);
      signatures[question.id].add(JSON.stringify({
        elements: question.elements,
        panels: question.comparisonPanels,
        answer: question.correctAnswer
      }));
      if (question.interactionType === 'element-select') {
        answerPositions[question.id].add(question.elements.findIndex(({ id }) => id === question.correctAnswer));
      } else if (question.interactionType !== 'pairing') {
        const firstAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer[0] : question.correctAnswer;
        answerPositions[question.id].add(question.options.findIndex(({ id }) => id === firstAnswer));
      } else {
        answerPositions[question.id].add(JSON.stringify(question.correctAnswer));
      }
    });
  }
  ids.forEach((id) => assert.equal(signatures[id].size > 1, true, `${id} content should vary`));
  ['discover-repetition-single','discover-repetition-group','discover-gradation-size','discover-gradation-lightness','discover-symmetry-shape','discover-symmetry-position','discover-harmony','discover-unity']
    .forEach((id) => assert.equal(answerPositions[id].size > 1, true, `${id} answer position should vary`));
  ['discover-gradation-gap','discover-rhythm-compare','discover-rhythm-multiple','discover-proportion','discover-contrast','discover-balance','discover-simplicity','discover-harmony-unity']
    .forEach((id) => assert.equal(answerPositions[id].size > 1, true, `${id} option order should vary`));
});

test('generated lightness gradation has exactly one removable interruption', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const question = generateDiscoverQuestions(discoverQuestions, seed)['discover-gradation-lightness'];
    const possible = question.actualLightness.map((_, removedIndex) => {
      const remaining = question.actualLightness.filter((__, index) => index !== removedIndex);
      const differences = remaining.slice(1).map((value, index) => value - remaining[index]);
      return differences.every((difference) => difference > 0) || differences.every((difference) => difference < 0);
    });
    assert.deepEqual(possible.map((valid,index)=>valid?index:-1).filter((index)=>index>=0), [question.correctIndex]);
  }
});

test('all generated question instances remain stable inside one course run', () => {
  const state = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(state, discoverQuestions, 20260821);
  const saved = state.generatedQuestions;
  state.questionOrder.forEach((id, index) => {
    state.currentIndex = index;
    assert.equal(currentDiscoverQuestion(state, discoverQuestions), saved[id]);
    assert.equal(currentDiscoverQuestion(state, discoverQuestions), saved[id]);
  });
});

test('each formal question has an explicit pass and fail fixture', () => {
  discoverQuestions.forEach((question) => {
    assert.equal(validateDiscoverQuestion(question, question.correctAnswer).isValid, true, question.id);
    const fail = question.interactionType === 'pairing' ? { a:'unity', b:'harmony' }
      : question.interactionType === 'multi-select-composition' ? ['b']
      : '__wrong__';
    assert.equal(validateDiscoverQuestion(question, fail).isValid, false, question.id);
  });
});

test('Q09 accepts B+C only and returns targeted failure codes', () => {
  const q = byId['discover-rhythm-multiple'];
  assert.equal(validateDiscoverQuestion(q,['b','c']).isValid,true);
  assert.equal(validateDiscoverQuestion(q,['b']).code,'only-b');
  assert.equal(validateDiscoverQuestion(q,['c']).code,'only-c');
  assert.equal(validateDiscoverQuestion(q,['a','b']).code,'a-b');
  assert.equal(validateDiscoverQuestion(q,['a','b','c']).code,'all');
});

test('Q15 pairing and Q16 before-after have one correct result', () => {
  assert.equal(validateDiscoverQuestion(byId['discover-harmony-unity'],{a:'harmony',b:'unity'}).isValid,true);
  assert.equal(validateDiscoverQuestion(byId['discover-harmony-unity'],{a:'unity',b:'harmony'}).isValid,false);
  const q16=byId['discover-simplicity'];
  assert.equal(validateDiscoverQuestion(q16,'b').isValid,true);
  assert.equal(validateDiscoverQuestion(q16,'a').isValid,false);
  assert.equal(validateDiscoverQuestion(q16,'c').isValid,false);
});

test('wrong answers do not advance, correct answers wait for the next button', () => {
  const state=createDiscoverCourseState(discoverQuestions);startDiscoverCourse(state,discoverQuestions,7);
  const question=currentDiscoverQuestion(state,discoverQuestions);setDiscoverSelection(state,question.id,'__wrong__');
  applyDiscoverResult(state,question,validateDiscoverQuestion(question,'__wrong__'));
  assert.equal(state.currentIndex,0);assert.equal(state.questions[question.id].completed,false);assert.equal(advanceDiscoverCourse(state,discoverQuestions),false);
  setDiscoverSelection(state,question.id,question.correctAnswer);applyDiscoverResult(state,question,validateDiscoverQuestion(question,question.correctAnswer));
  assert.equal(state.currentIndex,0);assert.equal(state.questions[question.id].completed,true);assert.equal(advanceDiscoverCourse(state,discoverQuestions),true);assert.equal(state.currentIndex,1);
});

test('all formal discover questions progress through positions 12 13 and 14 before only the true final question completes', () => {
  const state = createDiscoverCourseState(discoverQuestions);
  startDiscoverCourse(state, discoverQuestions, 20260828);
  const visited = [];
  for (let index = 0; index < state.questionOrder.length; index += 1) {
    const question = currentDiscoverQuestion(state, discoverQuestions);
    visited.push(question.id);
    setDiscoverSelection(state, question.id, question.correctAnswer);
    assert.equal(applyDiscoverResult(state, question, validateDiscoverQuestion(question, question.correctAnswer)), true, question.id);
    assert.equal(state.questions[question.id].completed, true, question.id);
    assert.equal(advanceDiscoverCourse(state, discoverQuestions), true, question.id);
    if (index < state.questionOrder.length - 1) {
      assert.equal(state.currentIndex, index + 1);
      assert.equal(state.completed, false);
    }
  }
  assert.equal(visited.length, discoverQuestions.length);
  assert.deepEqual(new Set(visited), new Set(discoverQuestions.map(({ id }) => id)));
  assert.equal(state.completed, true);
});

test('discover renderer derives progress and final action from the session question order', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../discover-course.js', import.meta.url), 'utf8'));
  assert.match(source, /const\s+total\s*=\s*course\.questionOrder\.length/);
  assert.match(source, /const\s+isLast\s*=\s*course\.currentIndex\s*===\s*total\s*-\s*1/);
  assert.doesNotMatch(source, /currentIndex===15/);
  assert.doesNotMatch(source, /padStart\(2,'0'\)\} \/ 16/);
});
test('Q15 prerequisite is preserved by order and completion flags track Q13/Q14', () => {
  const state=createDiscoverCourseState(discoverQuestions);startDiscoverCourse(state,discoverQuestions,2026);
  for (const id of ['discover-harmony','discover-unity']) { const q=byId[id];setDiscoverSelection(state,id,q.correctAnswer);applyDiscoverResult(state,q,validateDiscoverQuestion(q,q.correctAnswer)); }
  assert.equal(state.Q13Completed,true);assert.equal(state.Q14Completed,true);
  assert.equal(state.questionOrder.indexOf('discover-harmony-unity')>state.questionOrder.indexOf('discover-harmony'),true);
});
