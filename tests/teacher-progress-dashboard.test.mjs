import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  activeTeacherClassrooms,
  createTeacherDashboardController,
  emptyTeacherProgressSummary,
  loadTeacherClassProgress,
  summarizeTeacherProgress
} from '../teacher-progress-dashboard.js';
import { teacherPageMarkup } from '../teacher-page.js';

const classrooms = [
  { id: '701', validSeatNumbers: [1, 2, 3, 5] },
  { id: '702', validSeatNumbers: [1, 2] },
  { id: '703', active: false, validSeatNumbers: [1] }
];

test('Dashboard lists only active classes and derives denominators from validSeatNumbers', () => {
  const active = activeTeacherClassrooms(classrooms);
  assert.deepEqual(active.map(({ id }) => id), ['701', '702']);
  assert.equal(emptyTeacherProgressSummary(active[0]).validCount, 4);
  assert.equal(emptyTeacherProgressSummary(active[1]).validCount, 2);
});

test('summary counts only valid seats, true checkpoints, and each studentKey once', () => {
  const summary = summarizeTeacherProgress(classrooms[0], [
    { academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', freeReviewComplete: true, level1Complete: true },
    { academicYear: '115', classId: '701', seatNo: 2, studentKey: '115-701-2', freeReviewComplete: false, level1Complete: true, level2Complete: true },
    { academicYear: '115', classId: '701', seatNo: 2, studentKey: '115-701-2', freeReviewComplete: true, level3Complete: true },
    { academicYear: '115', classId: '701', seatNo: 4, studentKey: '115-701-4', freeReviewComplete: true, level1Complete: true },
    { academicYear: '115', classId: '702', seatNo: 1, studentKey: '115-702-1', level3Complete: true },
    { academicYear: '115', classId: '701', seatNo: 5, studentKey: '115-701-5', level3Complete: true },
    { academicYear: '116', classId: '701', seatNo: 3, studentKey: '116-701-3', level1Complete: true },
    { classId: '701', seatNo: 3, studentKey: '701-3', level1Complete: true }
  ]);
  assert.equal(summary.validCount, 4);
  assert.deepEqual(summary.counts, {
    freeReviewComplete: 2,
    level1Complete: 2,
    level2Complete: 1,
    level3Complete: 2
  });
  assert.deepEqual(summary.completedSeats, {
    freeReviewComplete: [1, 2],
    level1Complete: [1, 2],
    level2Complete: [2],
    level3Complete: [2, 5]
  });
});

test('empty classroom keeps zero counts with the configured valid denominator', () => {
  const summary = summarizeTeacherProgress(classrooms[0], []);
  assert.deepEqual(Object.values(summary.counts), [0, 0, 0, 0]);
  assert.deepEqual(Object.values(summary.completedSeats), [[], [], [], []]);
  assert.equal(summary.validCount, 4);
});

test('Firestore loader queries studentProgress by academicYear and classId and retains only progress fields', async () => {
  const calls = [];
  const client = {
    db: { app: { name: 'teacher' } },
    collection: (db, name) => { calls.push(['collection', db.app.name, name]); return { name }; },
    where: (...parts) => { calls.push(['where', ...parts]); return { parts }; },
    query: (reference, ...constraints) => { calls.push(['query', reference.name, ...constraints.map(({ parts }) => parts)]); return { reference, constraints }; },
    getDocs: async () => ({
      docs: [{ data: () => ({
        academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true,
        studentName: '不得保留', answers: ['不得保留']
      }) }]
    })
  };
  const summary = await loadTeacherClassProgress(client, classrooms[0]);
  assert.equal(summary.counts.level1Complete, 1);
  assert.deepEqual(summary.completedSeats.level1Complete, [1]);
  assert.deepEqual(calls, [
    ['collection', 'teacher', 'studentProgress'],
    ['where', 'academicYear', '==', '115'],
    ['where', 'classId', '==', '701'],
    ['query', 'studentProgress', ['academicYear', '==', '115'], ['classId', '==', '701']]
  ]);
});

test('switching class and refreshing each issue a new query for the current class', async () => {
  const calls = [];
  const controller = createTeacherDashboardController({
    client: {},
    classrooms,
    loadProgress: async (_client, classroom) => {
      calls.push(classroom.id);
      return emptyTeacherProgressSummary(classroom);
    }
  });
  await controller.refresh();
  await controller.selectClass('702');
  await controller.refresh();
  assert.deepEqual(calls, ['701', '702', '702']);
  assert.equal(controller.getState().selectedClassId, '702');
});

test('refresh replaces completion counts and completed seats from the same result', async () => {
  let loadCount = 0;
  const controller = createTeacherDashboardController({
    client: {}, classrooms,
    loadProgress: async (_client, classroom) => {
      loadCount += 1;
      return summarizeTeacherProgress(classroom, loadCount === 1
        ? [{ academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true }]
        : [
            { academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true },
            { academicYear: '115', classId: '701', seatNo: 5, studentKey: '115-701-5', level1Complete: true }
          ]);
    }
  });
  await controller.refresh();
  assert.equal(controller.getState().summary.counts.level1Complete, 1);
  assert.deepEqual(controller.getState().summary.completedSeats.level1Complete, [1]);
  await controller.refresh();
  assert.equal(controller.getState().summary.counts.level1Complete, 2);
  assert.deepEqual(controller.getState().summary.completedSeats.level1Complete, [1, 5]);
  assert.equal(loadCount, 2);
});

test('controller exposes permission-denied and network error states for retry', async () => {
  const denied = createTeacherDashboardController({
    client: {}, classrooms,
    loadProgress: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); }
  });
  await denied.refresh();
  assert.equal(denied.getState().status, 'permission-denied');

  const offline = createTeacherDashboardController({
    client: {}, classrooms,
    loadProgress: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); }
  });
  await offline.refresh();
  assert.equal(offline.getState().status, 'error');
  assert.match(offline.getState().error, /重新整理/);
});

test('authorized Dashboard markup shows counts without percentages or student details', () => {
  const dashboard = {
    academicYear: '115',
    classrooms: activeTeacherClassrooms(classrooms),
    selectedClassId: '701',
    status: 'success',
    summary: summarizeTeacherProgress(classrooms[0], [
      { academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', freeReviewComplete: true }
    ]),
    error: ''
  };
  const markup = teacherPageMarkup({ user: { uid: 'teacher' }, authorization: 'authorized', dashboard });
  assert.match(markup, /班級學習進度/);
  assert.match(markup, /115 學年度｜701 班學習進度/);
  assert.match(markup, /自由練習[\s\S]*<strong>1<\/strong><span>\/ 4<\/span>/);
  assert.match(markup, /更新進度/);
  assert.equal((markup.match(/查看已完成座號 ▾/g) ?? []).length, 4);
  assert.doesNotMatch(markup, /teacher-seat-chips/);
  assert.doesNotMatch(markup, /%|學生名單|排名|成績/);
});

test('expanded checkpoint shows sorted two-digit completed seats and empty state independently', () => {
  const dashboard = {
    classrooms: activeTeacherClassrooms(classrooms), selectedClassId: '701', status: 'success',
    summary: summarizeTeacherProgress(classrooms[0], [
      { academicYear: '115', classId: '701', seatNo: 5, studentKey: '115-701-5', level1Complete: true },
      { academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true },
      { academicYear: '115', classId: '701', seatNo: 2, studentKey: '115-701-2', level1Complete: false }
    ]), error: ''
  };
  const level1 = teacherPageMarkup({
    user: { uid: 'teacher' }, authorization: 'authorized', dashboard,
    expandedCheckpoints: new Set(['level1Complete'])
  });
  assert.match(level1, /data-completed-seats-toggle="level1Complete"[^>]*aria-expanded="true"/);
  assert.match(level1, /teacher-seat-chips[\s\S]*>01<[\s\S]*>05</);
  assert.match(level1, /共 2 人/);
  assert.doesNotMatch(level1, />02</);

  const level2 = teacherPageMarkup({
    user: { uid: 'teacher' }, authorization: 'authorized', dashboard,
    expandedCheckpoints: new Set(['level2Complete'])
  });
  assert.match(level2, /已完成座號[\s\S]*尚無完成紀錄/);
  assert.doesNotMatch(level2, /未完成座號/);
});

test('seat detail toggles only rerender local UI and never refresh Firestore', () => {
  const source = readFileSync(new URL('../teacher-page.js', import.meta.url), 'utf8');
  const toggleHandler = source.slice(
    source.indexOf("app.querySelectorAll('[data-completed-seats-toggle]')"),
    source.indexOf("  }\n\n  render();")
  );
  assert.match(toggleHandler, /expandedCheckpoints[\s\S]*render\(\)/);
  assert.doesNotMatch(toggleHandler, /dashboardController|refresh\(|loadTeacherClassProgress|getDocs/);
});

test('Dashboard uses compact horizontal rows with full-width details and a narrow-screen stack', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(css, /teacher-progress-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /teacher-progress-card\{[^}]*display:grid[^}]*grid-template-columns:minmax\(125px,1fr\) auto minmax\(175px,auto\)/);
  assert.match(css, /teacher-progress-card::before\{[^}]*width:7px[^}]*height:100%/);
  assert.match(css, /teacher-completed-seats\{[^}]*grid-column:1\/-1/);
  assert.match(css, /teacher-seat-chips\{[^}]*flex-wrap:wrap[^}]*min-width:0/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*teacher-progress-card\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
  assert.doesNotMatch(css, /teacher-progress-grid\{[^}]*repeat\(2/);
  assert.match(index, /styles\.css\?v=v2-d2-1/);
  assert.match(index, /app\.js\?v=v2-d2-1/);
  assert.match(app, /teacher-page\.js\?v=v2-d2-1/);
});

test('permission-denied Dashboard hides progress cards and reports insufficient permission', () => {
  const dashboard = {
    classrooms: activeTeacherClassrooms(classrooms), selectedClassId: '701',
    status: 'permission-denied', summary: emptyTeacherProgressSummary(classrooms[0]),
    error: '教師權限不足，無法讀取班級進度。'
  };
  const markup = teacherPageMarkup({ user: { uid: 'teacher' }, authorization: 'authorized', dashboard });
  assert.match(markup, /教師權限不足/);
  assert.doesNotMatch(markup, /teacher-progress-card-/);
  assert.match(markup, /更新進度/);
});

test('Dashboard markup reports loading and retriable network errors', () => {
  const base = {
    classrooms: activeTeacherClassrooms(classrooms), selectedClassId: '701',
    summary: emptyTeacherProgressSummary(classrooms[0]), error: ''
  };
  const loading = teacherPageMarkup({
    user: { uid: 'teacher' }, authorization: 'authorized',
    dashboard: { ...base, status: 'loading' }
  });
  assert.match(loading, /正在讀取班級進度/);
  assert.match(loading, /id="teacher-dashboard-refresh"[^>]*disabled/);

  const networkError = teacherPageMarkup({
    user: { uid: 'teacher' }, authorization: 'authorized',
    dashboard: { ...base, status: 'error', error: '暫時無法取得進度，請稍後重新整理。' }
  });
  assert.match(networkError, /暫時無法取得進度/);
  assert.match(networkError, /id="teacher-dashboard-refresh"/);
  assert.doesNotMatch(networkError, /id="teacher-dashboard-refresh"[^>]*disabled/);
});
