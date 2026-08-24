import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { principles, stages } from '../data.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { resolveRoute } from '../router.js';
import { phase6cDefinitions } from '../phase6c-definitions.js';
import { advancePhase6c, createPhase6cCourseState } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('principle wall exposes all three student course entries', () => {
  assert.match(rendererSource, /id="start-recognize-course"[^>]*>第一關｜你看得出來嗎？/);
  assert.match(rendererSource, /id="start-discover-course"[^>]*>第二關｜哪裡不對勁？/);
  assert.match(rendererSource, /id="start-experiment-course"[\s\S]*?<strong>第三關｜製作實驗<\/strong>/);
  assert.match(rendererSource, /這次不只是找答案，而是由你親手把形式原理做出來。/);
});

test('course entry click handlers preserve first, second and third routes', () => {
  assert.match(rendererSource, /#start-recognize-course'[\s\S]*?navigate\('#level\/recognize\/start'\)/);
  assert.match(rendererSource, /#start-discover-course'[\s\S]*?navigate\('#level\/discover\/start'\)/);
  assert.match(rendererSource, /#start-experiment-course'[\s\S]*?navigate\('#level\/experiment\/start'\)/);
});

test('experiment start and the complete four-experiment route chain resolve safely', () => {
  const expected = [
    ['#level/experiment/start', 'experimentStart'],
    ['#level/experiment/repetition', 'experiment'],
    ['#level/experiment/gradation', 'experiment'],
    ['#level/experiment/balance', 'experiment'],
    ['#level/experiment/rhythm', 'experiment'],
    ['#level/experiment/complete', 'experimentComplete']
  ];

  for (const [hash, routeName] of expected) {
    const route = resolveRoute(hash, stages, principles, recognizeQuestions);
    assert.equal(route.name, routeName);
    assert.notEqual(route.isFallback, true);
  }
});

test('entry release uses a fresh application cache marker', () => {
  assert.match(indexSource, /app\.js\?v=phase6c-entry/);
});
test('explicit completion advances through repetition, gradation, balance, rhythm and then completion', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const expectedNextIds = ['experiment-gradation', 'experiment-balance', 'experiment-rhythm', null];

  phase6cDefinitions.forEach((definition, index) => {
    getExperimentState(course, definition.id).completed = true;
    assert.equal(advancePhase6c(course, definition), expectedNextIds[index]);
  });

  assert.equal(course.currentIndex, phase6cDefinitions.length);
  assert.equal(course.currentExperimentId, null);
});
