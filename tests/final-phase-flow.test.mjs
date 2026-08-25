import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { principles, stages } from '../data.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { discoverQuestions } from '../discover-questions.js';
import { recognizeCompletionMarkup } from '../recognize-course.js';
import { discoverCompletionMarkup } from '../discover-course.js';
import {
  experimentActionsMarkup,
  finalCompletionMarkup,
  nextHash
} from '../experiment-course.js';
import { createPhase6cCourseState, advancePhase6c } from '../phase6c-course-state.js';
import { phase6cDefinitions } from '../phase6c-definitions.js';
import { getExperimentState } from '../experiment-session.js';
import { createAppState, syncCourseCompletion } from '../state.js';
import { resolveRoute } from '../router.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const rendererSource = source('../renderers.js');
const recognizeSource = source('../recognize-course.js');
const discoverSource = source('../discover-course.js');
const experimentSource = source('../experiment-course.js');
const appSource = source('../app.js');
const indexSource = source('../index.html');

test('FLOW A exposes home to principles and three unlocked course entries', () => {
  assert.ok(rendererSource.includes("button('進入實驗室', 'primary-button', 'enter-lab')"));
  assert.ok(rendererSource.includes("navigate('#principles')"));
  for (const [id, label, hash] of [
    ['start-recognize-course', '第一關｜我看得出來', '#level/recognize/start'],
    ['start-discover-course', '第二關｜我找得到問題', '#level/discover/start'],
    ['start-experiment-course', '第三關｜我自己做得出來', '#level/experiment/start']
  ]) {
    assert.ok(rendererSource.includes(`id="${id}"`));
    assert.ok(rendererSource.includes(label));
    assert.ok(rendererSource.includes(`navigate('${hash}')`));
  }
  assert.doesNotMatch(rendererSource, /id="start-(?:discover|experiment)-course"[^>]*disabled/);
});

test('FLOW B first completion exposes second course without auto navigation', () => {
  const html = recognizeCompletionMarkup();
  assert.match(html, /id="recognize-discover">前往第二關/);
  assert.match(html, /id="recognize-wall-return">返回實驗室/);
  assert.doesNotMatch(html, /施工中|disabled/);
  assert.ok(recognizeSource.includes("document.querySelector('#recognize-discover')"));
  assert.equal(recognizeSource.includes('setTimeout'), false);
});

test('FLOW C second completion exposes third course without auto navigation', () => {
  const html = discoverCompletionMarkup();
  assert.match(html, /id="discover-experiment">前往第三關/);
  assert.match(html, /id="discover-wall">返回實驗室/);
  assert.doesNotMatch(html, /準備中|disabled/);
  assert.ok(discoverSource.includes("document.querySelector('#discover-experiment')"));
  assert.equal(discoverSource.includes('setTimeout'), false);
});

test('FLOW D preserves the formal ten-experiment sequence and explicit final action', () => {
  const expectedIds = [
    'repetition', 'gradation', 'balance', 'rhythm', 'symmetry',
    'contrast', 'proportion', 'unity', 'harmony', 'simplicity'
  ];
  assert.deepEqual(phase6cDefinitions.map(({ principleId }) => principleId), expectedIds);
  const expectedRoutes = expectedIds.slice(1).map((id) => `#level/experiment/${id}`);
  expectedRoutes.push('#level/experiment/complete');
  phase6cDefinitions.forEach((definition, index) => {
    assert.equal(nextHash(definition), expectedRoutes[index]);
  });

  const course = createPhase6cCourseState(phase6cDefinitions);
  const simplicity = phase6cDefinitions.at(-1);
  assert.doesNotMatch(experimentActionsMarkup(course, simplicity, null), /experiment-next/);
  getExperimentState(course, simplicity.id).completed = true;
  assert.match(experimentActionsMarkup(course, simplicity, { result: { passed: true } }), /完成視覺實驗室/);
  assert.doesNotMatch(experimentActionsMarkup(course, simplicity, { result: { passed: true } }), />下一個挑戰</);
});

test('third course completion state is set only after explicit final advance', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  phase6cDefinitions.forEach((definition) => {
    getExperimentState(course, definition.id).completed = true;
    advancePhase6c(course, definition);
  });
  assert.equal(course.completed, true);
  assert.equal(course.currentIndex, phase6cDefinitions.length);
});

test('Final Completion uses principle metadata and presents the full learning closure', () => {
  const html = finalCompletionMarkup(principles);
  assert.match(html, /視覺實驗室完成！/);
  assert.match(html, /你看得出來。/);
  assert.match(html, /你找得到問題。/);
  assert.match(html, /你也做得出來。/);
  assert.match(html, /形式原理不是只有一個標準答案，而是可以被觀察、理解，也可以被你自己運用。/);
  for (const principle of principles) assert.match(html, new RegExp(`<li>${principle.name}</li>`));
  assert.equal((html.match(/<li>/g) ?? []).length, principles.length);
  assert.match(html, /id="experiment-return">回到形式原理實驗室/);
  assert.ok(experimentSource.includes("document.querySelector('#experiment-return')"));
});

test('completion state distinguishes three courses and the whole course', () => {
  const state = createAppState(stages, recognizeQuestions, discoverQuestions);
  state.experimentCourse = createPhase6cCourseState(phase6cDefinitions);
  assert.deepEqual(syncCourseCompletion(state), {
    recognize: false, discover: false, experiment: false, all: false
  });
  state.recognizeCourse.completed = true;
  state.discoverCourse.completed = true;
  assert.equal(syncCourseCompletion(state).all, false);
  state.experimentCourse.completed = true;
  assert.deepEqual(syncCourseCompletion(state), {
    recognize: true, discover: true, experiment: true, all: true
  });
});

test('FLOW E final completion and legacy/dev routes resolve without student Dev links', () => {
  for (const hash of ['#level/experiment/complete', '#dev/geometry', '#dev/validators', '#dev/phase5', '#dev/experiments']) {
    assert.notEqual(resolveRoute(hash, stages, principles, recognizeQuestions).isFallback, true);
  }
  assert.equal(rendererSource.includes("navigate('#dev/"), false);
  assert.equal(recognizeSource.includes("navigate('#dev/"), false);
});

test('formal student renderers contain no construction placeholders', () => {
  const formalSources = [rendererSource, recognizeSource, experimentSource];
  for (const text of formalSources) {
    assert.doesNotMatch(text, /施工中|準備中|尚未開放|即將開放|coming soon|placeholder/i);
  }
});

test('accessibility and Final Phase cache markers remain scoped', () => {
  assert.doesNotMatch(indexSource, /<main[^>]*aria-live/);
  assert.match(recognizeSource, /aria-live="polite"/);
  assert.match(experimentSource, /id="experiment-feedback" aria-live="polite"/);
  assert.ok(indexSource.includes('app.js?v=final-phase-2'));
  assert.ok(indexSource.includes('phase6c.css?v=final-phase-1'));
  assert.ok(appSource.includes('recognize-course.js?v=final-phase-2'));
  assert.ok(appSource.includes('discover-course.js?v=final-phase-2'));
  assert.ok(appSource.includes('experiment-course.js?v=final-phase-2'));
  assert.ok(appSource.includes("heading.setAttribute('tabindex', '-1')"));
  assert.ok(appSource.includes('heading.focus({ preventScroll: true })'));
  assert.ok(recognizeSource.includes("document.querySelector('#recognize-next')?.focus()"));
  assert.ok(discoverSource.includes("document.querySelector('#discover-next')?.focus()"));
  assert.ok(experimentSource.includes("document.querySelector('#experiment-next')?.focus()"));
});