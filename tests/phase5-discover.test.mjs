import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverQuestions, discoverInteractionTypes, overlapPolicies } from '../discover-questions.js';
import { createDiscoverOrder, EASY_START_IDS, isValidDiscoverOrder } from '../discover-randomizer.js';
import { validateDiscoverQuestion } from '../discover-validators.js';
import { advanceDiscoverCourse, applyDiscoverResult, createDiscoverCourseState, currentDiscoverQuestion, setDiscoverSelection, startDiscoverCourse } from '../discover-course-state.js';
import { assertGeometryElement } from '../geometry/model.js';
import { getShapeDimensions } from '../geometry/bounds.js';

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
    return { left: element.x - width / 2, right: element.x + width / 2, bottom: element.y + height / 2 };
  });
  assert.deepEqual(boxes.slice(1).map((box, index) => box.left - boxes[index].right), [50, 50, 50, 50]);
  assert.equal(new Set(boxes.map(({ bottom }) => bottom)).size, 1);
  assert.deepEqual(sizeQuestion.elements.map(({ size }) => size), [5, 4, 2, 3, 1]);
  assert.equal(sizeQuestion.correctAnswer, 'gs-4');
  const gapQuestion = byId['discover-gradation-gap'];
  const edgeGaps = gapQuestion.elements.slice(1).map((element, index) => {
    const previous = gapQuestion.elements[index];
    return (element.x - 18) - (previous.x + 18);
  });
  assert.deepEqual(edgeGaps, [40, 60, 40, 100, 120]);
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
  assert.equal(simplicity.beforeState.some(({ id }) => id === 'si-core'), true);
  assert.equal(simplicity.comparisonPanels[1].elements.some(({ id }) => id === 'si-b-core'), true);
  assert.equal(simplicity.comparisonPanels[2].elements.some(({ hue }) => hue === 'red'), false);
  assert.equal([simplicity.beforeState, ...simplicity.comparisonPanels.map(({ elements }) => elements)].flat().some(({ shape }) => shape === 'line'), false);

  const groups = byId['discover-repetition-group'].elements;
  const groupCenters = [0, 1, 2, 3].map((index) => [groups[index * 2].x, groups[index * 2 + 1].x]);
  assert.deepEqual(groupCenters, [[160, 205], [360, 405], [560, 605], [760, 805]]);
});

test('required-overlap fixtures contain a deliberate local overlap', () => {
  const overlaps = (elements) => elements.some((left, index) => elements.slice(index + 1).some((right) => {
    const a = getShapeDimensions(left); const b = getShapeDimensions(right);
    return Math.abs(left.x - right.x) < (a.width + b.width) / 2 && Math.abs(left.y - right.y) < (a.height + b.height) / 2;
  }));
  discoverQuestions.filter(({ overlapPolicy }) => overlapPolicy === 'required').forEach((question) => {
    const panels = question.comparisonPanels?.map((panel) => panel.elements) ?? [question.elements];
    assert.equal(panels.some(overlaps), true, question.id);
  });
});

test('formal principles and interaction types follow the confirmed specification', () => {
  assert.deepEqual(discoverQuestions.map(({ principleId }) => principleId), ['repetition','repetition','gradation','gradation','gradation','symmetry','symmetry','rhythm','rhythm','proportion','contrast','balance','harmony','unity','synthesis','simplicity']);
  assert.deepEqual(discoverQuestions.map(({ interactionType }) => interactionType), ['element-select','element-select','element-select','element-select','gap-select','element-select','element-select','composition-choice','multi-select-composition','composition-choice','composition-choice','composition-choice','element-select','element-select','pairing','composition-choice']);
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

test('Q15 prerequisite is preserved by order and completion flags track Q13/Q14', () => {
  const state=createDiscoverCourseState(discoverQuestions);startDiscoverCourse(state,discoverQuestions,2026);
  for (const id of ['discover-harmony','discover-unity']) { const q=byId[id];setDiscoverSelection(state,id,q.correctAnswer);applyDiscoverResult(state,q,validateDiscoverQuestion(q,q.correctAnswer)); }
  assert.equal(state.Q13Completed,true);assert.equal(state.Q14Completed,true);
  assert.equal(state.questionOrder.indexOf('discover-harmony-unity')>state.questionOrder.indexOf('discover-harmony'),true);
});
