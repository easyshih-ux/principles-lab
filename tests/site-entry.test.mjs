import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveRoute } from '../router.js';
import { renderSiteEntry, siteEntryMarkup } from '../site-entry.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('empty URL opens the student-first public entry and exposes the teacher route', () => {
  assert.equal(resolveRoute('', [], []).name, 'entry');
  assert.equal(resolveRoute('#entry', [], []).name, 'entry');
  assert.equal(resolveRoute('#student', [], []).name, 'studentEntry');
  assert.equal(resolveRoute('#teacher', [], []).name, 'teacher');
  const markup = siteEntryMarkup();
  assert.match(markup, /形式原理[\s\S]*視覺實驗室/);
  assert.match(markup, /探索形式原理，開啟你的視覺思考力/);
  assert.match(markup, /開始實驗 →/);
  assert.match(markup, /班級與座號確認 →/);
  assert.match(markup, /教師登入 ↗/);
  assert.doesNotMatch(markup, /選擇這次要進入的學習入口|學生使用|教師進度|Google 教師登入/);
  assert.equal((markup.match(/class="site-entry-button"/g) ?? []).length, 1);
});

test('entry buttons route student to identity entry and teacher directly to #teacher', () => {
  const handlers = new Map();
  const navigations = [];
  const app = {
    innerHTML: '',
    querySelector(selector) {
      return { addEventListener: (_type, handler) => handlers.set(selector, handler) };
    }
  };
  renderSiteEntry({ app, navigate: (hash) => navigations.push(hash) });
  handlers.get('#enter-student')();
  handlers.get('#enter-teacher')();
  assert.deepEqual(navigations, ['#student', '#teacher']);
});

test('#teacher and public entry are handled before the student identity gate', () => {
  const appSource = source('../app.js');
  const entryPosition = appSource.indexOf("route.name === 'entry'");
  const teacherPosition = appSource.indexOf("route.name === 'teacher'");
  const identityGatePosition = appSource.indexOf('if (!state.currentStudent)');
  assert.ok(entryPosition > 0 && entryPosition < identityGatePosition);
  assert.ok(teacherPosition > 0 && teacherPosition < identityGatePosition);
  assert.match(appSource, /route\.name === 'studentEntry'\) renderIdentityGate\(\)/);
});

test('teacher return actions navigate to the public site entry', () => {
  const teacherPage = source('../teacher-page.js');
  assert.match(teacherPage, /id="teacher-home"[\s\S]*返回網站入口/);
  assert.match(teacherPage, /id="teacher-sign-out"[\s\S]*登出並返回網站入口/);
  assert.match(teacherPage, /#teacher-home[\s\S]*navigate\('#entry'\)/);
  assert.match(teacherPage, /signOutTeacher[\s\S]*navigate\('#entry'\)/);
});

test('entry flow changes do not modify Auth, progress, Dashboard, or Rules modules', () => {
  const appSource = source('../app.js');
  assert.doesNotMatch(source('../site-entry.js'), /firebase|studentProgress|signIn|signOut/);
  assert.match(appSource, /renderSiteEntry/);
});
