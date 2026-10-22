import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createTeacherDashboardController,
  emptyTeacherProgressSummary,
  subscribeTeacherClassProgress,
  summarizeTeacherProgress
} from '../teacher-progress-dashboard.js';
import { formatLastUpdated, teacherLiveStatusMarkup, teacherPageMarkup } from '../teacher-page.js';

const classrooms = [
  { id: '701', validSeatNumbers: [1, 2, 3] },
  { id: '702', validSeatNumbers: [1, 2] }
];
const record = (classId, seatNo, extra = {}) => ({ academicYear: '115', classId, seatNo, studentKey: `115-${classId}-${seatNo}`, ...extra });

function fakeLive() {
  const listeners = [];
  return {
    listeners,
    subscribeProgress(_client, classroom, _year, handlers) {
      const listener = { classId: classroom.id, handlers, stopped: false };
      listeners.push(listener);
      return () => { listener.stopped = true; };
    },
    push(index, records, fromCache = false) {
      const { classId, handlers } = listeners[index];
      handlers.onSummary(summarizeTeacherProgress(classrooms.find(({ id }) => id === classId), records, '115'), { fromCache });
    }
  };
}

test('the live listener uses the same class query, keeps only progress fields and reports cached data', () => {
  const calls = [];
  const client = {
    db: {},
    collection: (_db, name) => ({ name }),
    where: (...parts) => ({ parts }),
    query: (reference, ...constraints) => ({ reference, constraints }),
    onSnapshot: (query, options, next, error) => { calls.push({ query, options, error }); next({ metadata: { fromCache: true }, docs: [{ data: () => ({ ...record('701', 2, { level1Complete: true }), studentName: '不得保留' }) }] }); return () => {}; }
  };
  const results = [];
  const stop = subscribeTeacherClassProgress(client, classrooms[0], '115', { onSummary: (summary, meta) => results.push({ summary, meta }), onError: () => {} });
  assert.equal(typeof stop, 'function');
  assert.equal(calls[0].query.reference.name, 'studentProgress');
  assert.deepEqual(calls[0].query.constraints.map(({ parts }) => parts), [['academicYear', '==', '115'], ['classId', '==', '701']]);
  assert.deepEqual(calls[0].options, { includeMetadataChanges: true });
  assert.deepEqual(results[0].summary.completedSeats.level1Complete, [2]);
  assert.deepEqual(results[0].meta, { fromCache: true });
  assert.equal(subscribeTeacherClassProgress({}, classrooms[0], '115', { onSummary() {}, onError() {} }), null);
});

test('with live updates the class fills itself in, and each change updates counts and the last-updated time', async () => {
  const live = fakeLive();
  let clock = 1000;
  let loads = 0;
  const controller = createTeacherDashboardController({ client: {}, academicYear: '115', classrooms, subscribeProgress: live.subscribeProgress, loadProgress: async () => { loads += 1; return emptyTeacherProgressSummary(classrooms[0], '115'); }, now: () => clock });
  await controller.start();
  assert.equal(controller.getState().live, 'connecting');
  assert.equal(controller.getState().status, 'loading');
  live.push(0, [record('701', 1, { level1Complete: true })]);
  assert.equal(controller.getState().live, 'live');
  assert.equal(controller.getState().status, 'success');
  assert.equal(controller.getState().lastUpdated, 1000);
  clock = 5000;
  live.push(0, [record('701', 1, { level1Complete: true }), record('701', 3, { level1Complete: true })]);
  assert.deepEqual(controller.getState().summary.completedSeats.level1Complete, [1, 3]);
  assert.deepEqual(controller.getState().summary.pendingSeats.level1Complete, [2]);
  assert.equal(controller.getState().lastUpdated, 5000);
  assert.equal(loads, 0, 'no extra one-time reads while listening');
});

test('cached data (no connection) shows as offline and keeps the last real update time', async () => {
  const live = fakeLive();
  let clock = 1000;
  const controller = createTeacherDashboardController({ client: {}, academicYear: '115', classrooms, subscribeProgress: live.subscribeProgress, now: () => clock });
  await controller.start();
  live.push(0, []);
  clock = 9000;
  live.push(0, [], true);
  assert.equal(controller.getState().live, 'offline');
  assert.equal(controller.getState().lastUpdated, 1000);
});

test('switching class stops the old listener; late news from the old class is ignored', async () => {
  const live = fakeLive();
  const controller = createTeacherDashboardController({ client: {}, academicYear: '115', classrooms, subscribeProgress: live.subscribeProgress });
  await controller.start();
  await controller.selectClass('702');
  assert.equal(live.listeners[0].stopped, true);
  assert.equal(live.listeners[1].classId, '702');
  live.push(0, [record('701', 1, { level1Complete: true })]);
  assert.equal(controller.getState().selectedClassId, '702');
  assert.equal(controller.getState().summary.classId, '702');
  controller.destroy();
  assert.equal(live.listeners[1].stopped, true);
});

test('coming back to the screen catches up quietly (no loading screen) and restarts a stopped listener', async () => {
  const live = fakeLive();
  const statuses = [];
  let clock = 1000;
  const controller = createTeacherDashboardController({
    client: {}, academicYear: '115', classrooms, subscribeProgress: live.subscribeProgress, now: () => clock,
    loadProgress: async (_client, classroom) => summarizeTeacherProgress(classroom, [record('701', 2, { level2Complete: true })], '115'),
    onChange: (state) => statuses.push(state.status)
  });
  await controller.start();
  live.push(0, []);
  live.listeners[0].handlers.onError(Object.assign(new Error('gone'), { code: 'unavailable' }));
  assert.equal(controller.getState().live, 'off');
  statuses.length = 0;
  clock = 7000;
  await controller.resume();
  assert.ok(!statuses.includes('loading'));
  assert.deepEqual(controller.getState().summary.completedSeats.level2Complete, [2]);
  assert.equal(controller.getState().lastUpdated, 7000);
  assert.equal(live.listeners.length, 2, 'listening again');
});

test('a refused listener reports insufficient permission like the button does', async () => {
  const live = fakeLive();
  let denied = 0;
  const controller = createTeacherDashboardController({ client: {}, academicYear: '115', classrooms, subscribeProgress: live.subscribeProgress, onPermissionDenied: () => { denied += 1; } });
  await controller.start();
  live.listeners[0].handlers.onError(Object.assign(new Error('no'), { code: 'permission-denied' }));
  assert.equal(controller.getState().status, 'permission-denied');
  assert.equal(denied, 1);
});

test('the dashboard shows live status and last update, and keeps the 取得最新進度 button', () => {
  const base = { academicYear: '115', classrooms, selectedClassId: '701', status: 'success', summary: emptyTeacherProgressSummary(classrooms[0], '115'), error: '' };
  const time = formatLastUpdated(Date.UTC(2026, 9, 22, 7, 42, 5));
  assert.match(time, /\d{2}:\d{2}:\d{2}/);
  const liveMarkup = teacherLiveStatusMarkup({ ...base, live: 'live', lastUpdated: Date.UTC(2026, 9, 22, 7, 42, 5) });
  assert.match(liveMarkup, /● 自動更新中/);
  assert.match(liveMarkup, new RegExp(`最後更新：${time}`));
  assert.match(teacherLiveStatusMarkup({ ...base, live: 'offline', lastUpdated: 1 }), /連線中斷，正在重新連線…（下面是最後更新時的資料）/);
  assert.equal(teacherLiveStatusMarkup({ ...base, live: 'off', lastUpdated: null }), '');
  const page = teacherPageMarkup({ user: { uid: 't' }, authorization: 'authorized', dashboard: { ...base, live: 'live', lastUpdated: 1 } });
  assert.match(page, /teacher-live-status/);
  assert.match(page, /id="teacher-dashboard-refresh"[^>]*>取得最新進度</);
});

test('teacher page: live updates replace only the progress section, and the screen coming back catches up', () => {
  const source = readFileSync(new URL('../teacher-page.js', import.meta.url), 'utf8');
  assert.match(source, /section\.outerHTML = teacherDashboardMarkup\(pageState\.dashboard, expandedCheckpoints\)/);
  assert.match(source, /document\.activeElement === select/);
  assert.match(source, /if \(pageState\.teacherView === 'dashboard'\) render\(\);/);
  for (const event of ["document.addEventListener('visibilitychange', catchUpProgress)", "window.addEventListener('online', catchUpProgress)", "window.addEventListener('pageshow', catchUpProgress)", "document.removeEventListener('visibilitychange', catchUpProgress)"]) {
    assert.ok(source.includes(event), event);
  }
  assert.match(source, /dashboardController\?\.resume\(\)/);
  assert.equal((source.match(/void dashboardController\.start\(\);/g) ?? []).length, 3);
  const auth = readFileSync(new URL('../teacher-auth.js', import.meta.url), 'utf8');
  assert.match(auth, /onSnapshot: firestoreSdk\.onSnapshot/);
});
