import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildClassConfigData,
  buildClassConfigKey,
  fallbackClassConfigs,
  loadClassConfigs,
  normalizeClassConfig,
  normalizeValidSeatNumbers
} from '../class-config-service.js';
import {
  changeDraftMaximum,
  createEditClassDraft,
  createNewClassDraft,
  createTeacherClassSettingsController,
  toggleDraftSeat,
  validateClassDraft
} from '../teacher-class-settings.js';
import { teacherClassSettingsMarkup, teacherPageMarkup } from '../teacher-page.js';
import { activeTeacherClassrooms, emptyTeacherProgressSummary, summarizeTeacherProgress } from '../teacher-progress-dashboard.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const configs = [
  normalizeClassConfig({ academicYear: '115', classId: '701', active: true, validSeatNumbers: [3, 1, 2, 2] }),
  normalizeClassConfig({ academicYear: '115', classId: '702', active: false, validSeatNumbers: [1, 3] })
];

test('class config key, trim, seat normalization, active state, and stored schema are canonical', () => {
  assert.equal(buildClassConfigKey('115', ' 701 '), '115-701');
  assert.deepEqual(normalizeValidSeatNumbers(['3', 1, 2, 2]), [1, 2, 3]);
  assert.throws(() => normalizeValidSeatNumbers([1, 0, 2]));
  assert.throws(() => normalizeValidSeatNumbers([1, 2.5]));
  assert.equal(configs[0].classId, '701');
  assert.equal(configs[1].active, false);
  const data = buildClassConfigData(configs[0], 'timestamp');
  assert.deepEqual(Object.keys(data), ['academicYear', 'classId', 'active', 'validSeatNumbers', 'updatedAt']);
  assert.equal('studentCount' in data, false);
});

test('Firestore is all-or-nothing and empty or failed reads use the complete legacy fallback', async () => {
  const client = {
    db: {}, collection: () => ({}), where: (...parts) => ({ parts }), query: (_ref, ...constraints) => ({ constraints }),
    getDocs: async () => ({ docs: [{ data: () => configs[0] }] })
  };
  const loaded = await loadClassConfigs(client);
  assert.equal(loaded.source, 'firestore');
  assert.deepEqual(loaded.configs.map(({ classId }) => classId), ['701']);
  client.getDocs = async () => ({ docs: [] });
  const empty = await loadClassConfigs(client);
  assert.equal(empty.status, 'empty');
  assert.equal(empty.configs.length, 15);
  client.getDocs = async () => { throw new Error('offline'); };
  const failed = await loadClassConfigs(client);
  assert.equal(failed.status, 'error');
  assert.equal(failed.source, 'fallback');
  assert.equal(failed.configs.length, fallbackClassConfigs().length);
});

test('student identity and Dashboard use only active configs and configured valid seats', () => {
  assert.deepEqual(activeTeacherClassrooms(configs).map(({ classId }) => classId), ['701']);
  assert.equal(emptyTeacherProgressSummary(configs[0]).validCount, 3);
  const summary = summarizeTeacherProgress(configs[0], [
    { academicYear: '115', classId: '701', seatNo: 2, studentKey: '115-701-2', level1Complete: true },
    { academicYear: '115', classId: '701', seatNo: 4, studentKey: '115-701-4', level1Complete: true }
  ]);
  assert.deepEqual(summary.completedSeats.level1Complete, [2]);
  const app = source('../app.js');
  assert.match(app, /activeConfigs = classConfigState\.configs\.filter/);
  assert.match(app, /seatOptions\(identityDraft\.classId, activeConfigs\)/);
  assert.match(app, /ensureAnonymousAuth/);
  assert.match(app, /configReady[\s\S]*identity-class[\s\S]*disabled/);
});

test('new/edit drafts support empty seats and maximum growth or confirmed shrink UI', () => {
  const created = createNewClassDraft(' 716 ');
  assert.equal(created.classId, '716');
  assert.equal(created.validSeatNumbers.length, 30);
  const emptyEight = toggleDraftSeat(created, 8);
  assert.equal(emptyEight.validSeatNumbers.includes(8), false);
  const grown = changeDraftMaximum(emptyEight, 32);
  assert.equal(grown.validSeatNumbers.includes(8), false);
  assert.deepEqual(grown.validSeatNumbers.slice(-2), [31, 32]);
  const shrunk = changeDraftMaximum(grown, 28);
  assert.equal(Math.max(...shrunk.validSeatNumbers), 28);
  assert.throws(() => validateClassDraft({ ...created, classId: '701' }, configs), /相同班級/);
  assert.equal(createEditClassDraft(configs[1]).active, false);
  const page = source('../teacher-page.js');
  assert.match(page, /最大座號從[\s\S]*confirm/);
  assert.match(page, /confirm\(`確定停用/);
  assert.doesNotMatch(page, /deleteDoc|studentProgress/);
});

test('only authorized markup exposes settings and list clearly shows counts and inactive state', () => {
  const authorized = teacherPageMarkup({ user: { uid: 'teacher' }, authorization: 'authorized', settings: { mode: 'list', source: 'firestore', configs, message: '', error: '' }, teacherView: 'settings' });
  assert.match(authorized, /班級設定/);
  assert.match(authorized, /701 班[\s\S]*3 人/);
  assert.match(authorized, /702 班[\s\S]*停用/);
  assert.match(authorized, /＋ 新增班級/);
  const unauthorized = teacherPageMarkup({ user: { uid: 'nope' }, authorization: 'unauthorized' });
  assert.doesNotMatch(unauthorized, /teacher-show-settings|class-settings-add/);
  const editingDraft = toggleDraftSeat(createNewClassDraft('701'), 8);
  const editing = teacherClassSettingsMarkup({ mode: 'edit', status: 'success', draft: editingDraft, error: '' });
  assert.match(editing, /有效學生：<strong>29<\/strong> 人/);
  assert.match(editing, /08<small>空號/);
});

test('teacher settings uses teacher client, rejects duplicates, and never reports success after save failure', async () => {
  const client = {
    db: {}, collection: () => ({}), where: () => ({}), query: () => ({}),
    getDocs: async () => ({ docs: [{ data: () => configs[0] }] }),
    doc: () => ({}), serverTimestamp: () => 'timestamp',
    setDoc: async () => { throw new Error('offline'); }
  };
  const controller = createTeacherClassSettingsController({ client });
  await controller.refresh(); controller.add();
  controller.setDraft({ ...createNewClassDraft('716'), validSeatNumbers: [1, 2] });
  await controller.save();
  assert.equal(controller.getState().status, 'error');
  assert.match(controller.getState().error, /儲存失敗/);
  assert.equal(controller.getState().message, '');
});

test('rules separate reliable server validation from full service normalization', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /match \/classConfigs\/\{classConfigKey\}/);
  assert.match(rules, /allow get, list: if isAnonymousStudent\(\) \|\| isTeacher\(\)/);
  assert.match(rules, /allow create: if isTeacher\(\)/);
  assert.match(rules, /allow delete: if false/);
  assert.match(rules, /classConfigKey == request\.resource\.data\.academicYear \+ '-' \+ request\.resource\.data\.classId/);
  assert.match(rules, /validSeatNumbers is list/);
  assert.match(source('../class-config-service.js'), /new Set[\s\S]*sort/);
});
