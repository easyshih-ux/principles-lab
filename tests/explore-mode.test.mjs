import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { classroomCourseCardsMarkup } from '../renderers.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const appSource = source('../app.js');
const rendererSource = source('../renderers.js');
const exploreEntry = source('../explore/index.html');

test('/explore/ is a physical GitHub Pages shell using only root shared assets', () => {
  assert.match(exploreEntry, /href="\.\.\/styles\.css\?v=author-credit-2"/);
  assert.match(exploreEntry, /href="\.\.\/phase6c\.css\?v=final-phase-1"/);
  assert.match(exploreEntry, /href="\.\.\/post-final-a\.css\?v=post-final-a-templates"/);
  assert.match(exploreEntry, /href="\.\.\/classroom-control\.css\?v=classroom-control-1"/);
  assert.match(exploreEntry, /src="\.\.\/app\.js\?v=explore-1"/);
  assert.doesNotMatch(exploreEntry, /(?:href|src)="(?:\.\/)?(?:styles|app)\.js/);
});

test('runtime mode defaults to class and recognizes only explicit explore paths', () => {
  assert.match(appSource, /runtimePath === '\/principles-lab\/explore' \|\| runtimePath === '\/explore' \? 'explore' : 'class'/);
  assert.match(appSource, /const isExploreMode = runtimeMode === 'explore'/);
  assert.match(appSource, /academicYearState = isExploreMode[\s\S]*status: 'ready'[\s\S]*source: 'explore'/);
});

test('explore startup never reads official student or classroom localStorage', () => {
  assert.match(appSource, /if \(!isExploreMode\) \{[\s\S]*?window\.localStorage[\s\S]*?\}/);
  assert.match(appSource, /isExploreMode \? null : loadCurrentStudent\(classroomStorage\)/);
  assert.match(appSource, /isExploreMode[\s\S]*recognize: true, discover: true, experiment: true[\s\S]*loadClassroomUnlocks\(classroomStorage\)/);
  assert.match(appSource, /if \(!isExploreMode\)[\s\S]*if \(state\.currentStudent\) attachStudentControls\(\)/);
});

test('explore has both checkpoint protections and cannot touch studentProgress', () => {
  assert.match(appSource, /function saveCloudCheckpoint\(checkpointName\) \{\s*if \(runtimeMode !== 'class' \|\| !state\.currentStudent \|\| isTeacherTeachingMode\(\)\) return;/);
  assert.match(appSource, /const checkpointCallback = isExploreMode \? \(\) => \{\} : \(checkpointName\) => \{/);
  for (const factory of ['createRenderers', 'createRecognizeCourseRenderers', 'createDiscoverCourseRenderers', 'createExperimentCourseRenderers']) {
    assert.match(appSource, new RegExp(`${factory}\\([^;]*onCheckpoint: checkpointCallback`));
  }
});

test('explore protects entry, student, and teacher hashes before formal route startup', () => {
  const guard = appSource.indexOf("isExploreMode && ['entry', 'studentEntry', 'teacher'].includes(route.name)");
  const entry = appSource.indexOf("if (route.name === 'entry')", guard);
  const teacher = appSource.indexOf("if (route.name === 'teacher')", guard);
  const academicYear = appSource.indexOf("if (!isExploreMode && !isTeacherTeachingMode() && academicYearState.status === 'loading')", guard);
  assert.ok(guard > 0 && guard < entry && guard < teacher && guard < academicYear);
  assert.match(appSource.slice(guard, entry), /history\.replaceState\(null, '', '#home'\)/);
});

test('explore never attaches student or teacher teaching controls', () => {
  assert.match(appSource, /if \(!isExploreMode\) \{\s*if \(state\.currentStudent\) attachStudentControls\(\);\s*else if \(isTeacherTeachingMode\(\)\) attachTeacherTeachingControls\(\);\s*\}/);
});

test('explore lobby shares the existing renderer while removing class-only controls', () => {
  const cards = classroomCourseCardsMarkup(
    { recognize: true, discover: true, experiment: true },
    {},
    {},
    'home'
  );
  assert.equal((cards.match(/data-course-enter/g) ?? []).length, 3);
  assert.doesNotMatch(cards, /\u8f38\u5165\u901a\u884c\u78bc|\u7b49\u5f85\u8001\u5e2b\u958b\u653e/);
  assert.match(rendererSource, /mode = 'class'/);
  assert.match(rendererSource, /\u81ea\u7531\u9ad4\u9a57\u6a21\u5f0f\uff5c\u5b78\u7fd2\u9032\u5ea6\u4e0d\u5217\u5165\u73ed\u7d1a\u7d00\u9304/);
  assert.match(rendererSource, /isExploreMode \? '' : '<button class="home-teacher-entry"/);
  assert.match(appSource, /if \(!isExploreMode\)[\s\S]*if \(state\.currentStudent\) attachStudentControls\(\)/);
  assert.doesNotMatch(source('../recognize-course.js'), /runtimeMode|isExploreMode/);
  assert.doesNotMatch(source('../discover-course.js'), /runtimeMode|isExploreMode/);
  assert.doesNotMatch(source('../experiment-course.js'), /runtimeMode|isExploreMode/);
});

test('class mode keeps Firebase, identity, unlock, teacher, and all four checkpoints wired', () => {
  assert.match(appSource, /await ensureAnonymousAuth\(client\)[\s\S]*loadActiveAcademicYear\(client\)/);
  assert.match(appSource, /loadClassConfigs\(client, academicYear\.academicYear/);
  assert.match(appSource, /saveCurrentStudent\(identityDraft, classroomStorage/);
  assert.match(appSource, /if \(!isExploreMode && !state\.currentStudent && !isTeacherTeachingMode\(\)\)/);
  assert.match(appSource, /activeTeacherPage = renderTeacherPage/);
  for (const checkpoint of ['freeReviewComplete', 'level1Complete', 'level2Complete', 'level3Complete']) {
    const courseSources = [rendererSource, source('../recognize-course.js'), source('../discover-course.js'), source('../experiment-course.js')];
    assert.ok(courseSources.some((text) => text.includes(`onCheckpoint('${checkpoint}')`)));
  }
});
