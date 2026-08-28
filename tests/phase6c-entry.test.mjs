import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { principles, stages } from '../data.js';
import { recognizeQuestions } from '../recognize-questions.js';
import { resolveRoute } from '../router.js';
import { phase6cDefinitions } from '../phase6c-definitions.js';
import { advancePhase6c, createPhase6cCourseState } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';
import { classroomCourseCardsMarkup } from '../renderers.js';

const rendererSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const discoverCourseSource = readFileSync(new URL('../discover-course.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('principle wall exposes all three student courses behind classroom gates', () => {
  const html = classroomCourseCardsMarkup(
    { recognize: false, discover: false, experiment: false },
    { courses: { recognize: false, discover: false, experiment: false } },
    {}
  );
  assert.match(html, /第一關｜我看得出來/);
  assert.match(html, /第二關｜我找得到問題/);
  assert.match(html, /第三關｜我自己做得出來/);
  assert.equal((html.match(/等待老師開放/g) ?? []).length, 3);
});

test('unlocked course entry handler navigates to the selected guarded route', () => {
  assert.match(rendererSource, /\[data-course-enter\]/);
  assert.match(rendererSource, /navigate\(course\.route\)/);
});

test('discover completion preserves the wall exit without bypassing the experiment gate', () => {
  assert.match(discoverCourseSource, /id="discover-wall">返回實驗室<\/button>/);
  assert.match(discoverCourseSource, /#discover-wall'[\s\S]*?navigate\('#principles'\)/);
  assert.doesNotMatch(discoverCourseSource, /discover-experiment|前往第三關/);
});

test('experiment start and the complete ten-experiment route chain resolve safely', () => {
  const expected = [
    ['#level/experiment/start', 'experimentStart'],
    ['#level/experiment/repetition', 'experiment'],
    ['#level/experiment/gradation', 'experiment'],
    ['#level/experiment/balance', 'experiment'],
    ['#level/experiment/rhythm', 'experiment'],
    ['#level/experiment/symmetry', 'experiment'],
    ['#level/experiment/contrast', 'experiment'],
    ['#level/experiment/proportion', 'experiment'],
    ['#level/experiment/unity', 'experiment'],
    ['#level/experiment/harmony', 'experiment'],
    ['#level/experiment/simplicity', 'experiment'],
    ['#level/experiment/complete', 'experimentComplete']
  ];

  for (const [hash, routeName] of expected) {
    const route = resolveRoute(hash, stages, principles, recognizeQuestions);
    assert.equal(route.name, routeName);
    assert.notEqual(route.isFallback, true);
  }
});

test('entry release uses a fresh application cache marker', () => {
  assert.match(indexSource, /app\.js\?v=blocking-fixes-1/);
  assert.match(indexSource, /classroom-control\.css\?v=classroom-control-1/);
  assert.match(indexSource, /phase6c\.css\?v=final-phase-1/);
});
test('explicit completion advances through all ten experiments and then completion', () => {
  const course = createPhase6cCourseState(phase6cDefinitions);
  const expectedNextIds = ['experiment-gradation', 'experiment-balance', 'experiment-rhythm', 'experiment-symmetry', 'experiment-contrast', 'experiment-proportion', 'experiment-unity', 'experiment-harmony', 'experiment-simplicity', null];

  phase6cDefinitions.forEach((definition, index) => {
    getExperimentState(course, definition.id).completed = true;
    assert.equal(advancePhase6c(course, definition), expectedNextIds[index]);
  });

  assert.equal(course.currentIndex, phase6cDefinitions.length);
  assert.equal(course.currentExperimentId, null);
});
