import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  attemptClassroomUnlock,
  CLASSROOM_UNLOCK_STORAGE_KEY,
  createLockedClassroomUnlocks,
  isClassroomRouteAllowed,
  loadClassroomUnlocks,
  resetClassroomUnlocks
} from '../classroom-unlocks.js';
import { classroomCourseCardsMarkup } from '../renderers.js';
import { recognizeCompletionMarkup } from '../recognize-course.js';
import { discoverCompletionMarkup } from '../discover-course.js';
import { finalCompletionMarkup } from '../experiment-course.js';
import { createAppState, syncCourseCompletion } from '../state.js';
import { resetRecognizeCourse } from '../recognize-course-state.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { discoverQuestions } from '../discover-questions.js';
import { principles, stages } from '../data.js';
import { resolveRoute } from '../router.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const formalRoute = (hash) => resolveRoute(hash, stages, principles, recognizeQuestions);
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('classroom unlocks start with all three courses locked', () => {
  assert.deepEqual(createLockedClassroomUnlocks(), { recognize: false, discover: false, experiment: false });
  assert.deepEqual(loadClassroomUnlocks(new MemoryStorage()), { recognize: false, discover: false, experiment: false });
  const html = classroomCourseCardsMarkup(createLockedClassroomUnlocks(), {}, {});
  assert.equal((html.match(/🔒 等待老師開放/g) ?? []).length, 3);
  assert.equal((html.match(/輸入通行碼/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-course-enter/);
});

test('LOOK THINK and CREATE unlock only their matching course with trim and case folding', () => {
  const storage = new MemoryStorage();
  let unlocks = createLockedClassroomUnlocks();
  let result = attemptClassroomUnlock('recognize', '  look ', unlocks, storage);
  assert.equal(result.ok, true);
  assert.deepEqual(result.unlocks, { recognize: true, discover: false, experiment: false });
  unlocks = result.unlocks;
  result = attemptClassroomUnlock('discover', 'Think', unlocks, storage);
  assert.deepEqual(result.unlocks, { recognize: true, discover: true, experiment: false });
  result = attemptClassroomUnlock('experiment', 'CREATE', result.unlocks, storage);
  assert.deepEqual(result.unlocks, { recognize: true, discover: true, experiment: true });
});

test('a wrong passcode never unlocks or reveals another course', () => {
  const initial = createLockedClassroomUnlocks();
  const result = attemptClassroomUnlock('discover', 'LOOK', initial, new MemoryStorage());
  assert.equal(result.ok, false);
  assert.deepEqual(result.unlocks, initial);
});

test('unlock persistence uses an isolated namespace and reset helper', () => {
  const storage = new MemoryStorage();
  const result = attemptClassroomUnlock('experiment', 'create', createLockedClassroomUnlocks(), storage);
  assert.equal(storage.values.has(CLASSROOM_UNLOCK_STORAGE_KEY), true);
  assert.deepEqual(loadClassroomUnlocks(storage), result.unlocks);
  assert.deepEqual(resetClassroomUnlocks(storage), createLockedClassroomUnlocks());
  assert.equal(storage.getItem(CLASSROOM_UNLOCK_STORAGE_KEY), null);
});

test('completion and unlock remain separate and never unlock the next course', () => {
  const state = createAppState(stages, recognizeQuestions, discoverQuestions);
  state.classroomUnlocks = attemptClassroomUnlock('recognize', 'LOOK', state.classroomUnlocks).unlocks;
  state.recognizeCourse.completed = true;
  syncCourseCompletion(state);
  assert.equal(state.classroomUnlocks.discover, false);
  state.classroomUnlocks = attemptClassroomUnlock('discover', 'THINK', state.classroomUnlocks).unlocks;
  state.discoverCourse.completed = true;
  syncCourseCompletion(state);
  assert.equal(state.classroomUnlocks.experiment, false);
  const html = classroomCourseCardsMarkup(state.classroomUnlocks, state.completion.courses, {});
  assert.match(html, /✓ 已完成/);
  assert.match(html, /再次進入/);
});

test('formal routes require their own unlock while Dev routes bypass the guard', () => {
  const locked = createLockedClassroomUnlocks();
  assert.equal(isClassroomRouteAllowed(formalRoute('#level/recognize/start'), locked), false);
  assert.equal(isClassroomRouteAllowed(formalRoute('#level/discover/question'), locked), false);
  assert.equal(isClassroomRouteAllowed(formalRoute('#level/experiment/contrast'), locked), false);
  const recognizeOnly = { ...locked, recognize: true };
  assert.equal(isClassroomRouteAllowed(formalRoute('#level/recognize/start'), recognizeOnly), true);
  assert.equal(isClassroomRouteAllowed(formalRoute('#level/discover/start'), recognizeOnly), false);
  for (const hash of ['#dev/recognize-templates', '#dev/phase5', '#dev/experiments', '#dev/geometry']) {
    assert.equal(isClassroomRouteAllowed(formalRoute(hash), locked), true);
  }
  const appSource = source('../app.js');
  assert.match(appSource, /history\.replaceState\(null, '', '#principles'\)/);
  assert.match(appSource, /這一關尚未開放，請等待老師公布通行碼。/);
});

test('unlock operations do not reset any course progress or recognize session choices', () => {
  const state = createAppState(stages, recognizeQuestions, discoverQuestions);
  resetRecognizeCourse(state.recognizeCourse, recognizeQuestions, () => 0);
  state.recognizeCourse.questions[state.recognizeCourse.questionOrder[0]].attempts = 2;
  state.discoverCourse.currentIndex = 6;
  state.discoverCourse.started = true;
  state.experimentCourse = { currentIndex: 4, feedbackById: { sample: { passed: false } } };
  const snapshot = structuredClone({
    questionOrder: state.recognizeCourse.questionOrder,
    variants: state.recognizeCourse.variantSelections,
    options: state.recognizeCourse.optionOrders,
    attempts: state.recognizeCourse.questions,
    discover: state.discoverCourse,
    experiment: state.experimentCourse
  });
  for (const [courseId, code] of [['recognize', 'LOOK'], ['discover', 'THINK'], ['experiment', 'CREATE']]) {
    state.classroomUnlocks = attemptClassroomUnlock(courseId, code, state.classroomUnlocks).unlocks;
  }
  assert.deepEqual({
    questionOrder: state.recognizeCourse.questionOrder,
    variants: state.recognizeCourse.variantSelections,
    options: state.recognizeCourse.optionOrders,
    attempts: state.recognizeCourse.questions,
    discover: state.discoverCourse,
    experiment: state.experimentCourse
  }, snapshot);
});

test('completion pages return to the laboratory and preserve the final completion page', () => {
  assert.match(recognizeCompletionMarkup(), /id="recognize-wall-return">返回實驗室/);
  assert.doesNotMatch(recognizeCompletionMarkup(), /前往第二關/);
  assert.match(discoverCompletionMarkup(), /id="discover-wall">返回實驗室/);
  assert.doesNotMatch(discoverCompletionMarkup(), /前往第三關/);
  assert.match(finalCompletionMarkup(principles), /視覺實驗室完成！/);
});

test('passcode UI has labels, submit behavior, readable errors and focus wiring', () => {
  const rendererSource = source('../renderers.js');
  const active = classroomCourseCardsMarkup(createLockedClassroomUnlocks(), {}, { activeCourseId: 'recognize', error: '通行碼不正確，請確認老師公布的通行碼。' });
  assert.match(active, /<label for="classroom-code-recognize">第一關通行碼<\/label>/);
  assert.match(active, /data-unlock-form="recognize"/);
  assert.match(active, /role="alert"/);
  assert.match(rendererSource, /addEventListener\('submit'/);
  assert.match(rendererSource, /data-course-enter=\"\$\{courseId\}\"/);
  assert.match(rendererSource, /\.focus\(\)/);
});
