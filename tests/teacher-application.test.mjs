import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isProtectedAdminTarget,
  loadTeacherReviewData,
  reviewTeacherAccess,
  submitTeacherApplication,
  teacherApplicationData,
  verifyAdminAuthorization
} from '../teacher-application-service.js';
import { teacherPageMarkup } from '../teacher-page.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

function fakeClient(seed = {}) {
  const rows = new Map(Object.entries(seed));
  const now = new Date('2026-10-13T08:00:00.000Z');
  const key = (ref) => `${ref.collection}/${ref.id}`;
  const snapshot = (ref) => ({
    id: ref.id,
    exists: () => rows.has(key(ref)),
    data: () => rows.get(key(ref))
  });
  const client = {
    auth: { currentUser: { uid: 'owner-uid' } }, db: {}, rows, transactionRuns: 0,
    doc: (_db, collection, id) => ({ collection, id }),
    collection: (_db, collection) => ({ collection }),
    query: (collectionRef, constraint) => ({ collectionRef, constraint }),
    limit: (value) => ({ value }),
    serverTimestamp: () => now,
    getDoc: async (ref) => {
      if (ref.collection === 'adminProtectionProbes') {
        const caller = rows.get(`admins/${client.auth.currentUser.uid}`);
        const target = rows.get(`admins/${ref.id}`);
        if (caller?.active === true && target?.active === true) {
          return { id: ref.id, exists: () => false, data: () => undefined };
        }
        throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      }
      return snapshot(ref);
    },
    getDocs: async (ref) => ({
      docs: [...rows.entries()]
        .filter(([path]) => path.startsWith(`${ref.collection}/`))
        .map(([path, data]) => ({ id: path.slice(path.indexOf('/') + 1), data: () => data }))
    }),
    getCountFromServer: async () => ({ data: () => ({ count: 0 }) }),
    runTransaction: async (_db, callback) => {
      client.transactionRuns += 1;
      return callback({
        get: async (ref) => snapshot(ref),
        set(ref, data, options) { rows.set(key(ref), options?.merge ? { ...(rows.get(key(ref)) ?? {}), ...data } : { ...data }); },
        update(ref, data) { if (!rows.has(key(ref))) throw new Error('missing'); rows.set(key(ref), { ...rows.get(key(ref)), ...data }); }
      });
    }
  };
  return client;
}

test('application payload is tied to the signed-in Google identity and starts pending', () => {
  const stamp = new Date();
  assert.deepEqual(teacherApplicationData({ uid: 'u1', displayName: '王老師', email: 'teacher@example.test' }, stamp), {
    uid: 'u1', displayName: '王老師', email: 'teacher@example.test', status: 'pending', createdAt: stamp, updatedAt: stamp
  });
  assert.throws(() => teacherApplicationData({ uid: 'u1', displayName: '', email: '' }, stamp), /缺少/);
});

test('submitting uses the uid document once and returns an existing application on duplicate clicks', async () => {
  const client = fakeClient();
  const user = { uid: 'applicant', displayName: '申請教師', email: 'applicant@example.test' };
  const first = await submitTeacherApplication(client, user);
  const second = await submitTeacherApplication(client, user);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.application.status, 'pending');
  assert.equal(client.rows.size, 1);
});

test('admin probe distinguishes permission denial from temporary Firebase failures', async () => {
  const client = fakeClient();
  assert.equal(await verifyAdminAuthorization(client), true);
  client.getCountFromServer = async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); };
  assert.equal(await verifyAdminAuthorization(client), false);
  client.getCountFromServer = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
  await assert.rejects(() => verifyAdminAuthorization(client), /offline/);
});

test('admin review data includes pending applications and active legacy teachers', async () => {
  const client = fakeClient({
    'teacherApplications/new-teacher': { uid: 'new-teacher', displayName: '新老師', email: 'new@example.test', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
    'teachers/legacy-teacher': { active: true },
    'teachers/disabled-teacher': { active: false }
  });
  const result = await loadTeacherReviewData(client);
  assert.deepEqual(result.pending.map(({ uid }) => uid), ['new-teacher']);
  assert.deepEqual(result.teachers.map(({ uid, hasApplication, isAdmin }) => [uid, hasApplication, isAdmin]), [['legacy-teacher', false, false]]);
});

test('admin protection probe exposes only active-admin status to an active admin', async () => {
  const client = fakeClient({
    'admins/owner-uid': { active: true },
    'admins/admin-b': { active: true },
    'admins/inactive-admin': { active: false }
  });
  assert.equal(await isProtectedAdminTarget(client, 'owner-uid'), true);
  assert.equal(await isProtectedAdminTarget(client, 'admin-b'), true);
  assert.equal(await isProtectedAdminTarget(client, 'inactive-admin'), false);
  assert.equal(await isProtectedAdminTarget(client, 'missing-admin'), false);
  client.getDoc = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
  await assert.rejects(() => isProtectedAdminTarget(client, 'admin-b'), /offline/);
});

test('approval and revocation write linked application, teacher, and immutable history data', async () => {
  const client = fakeClient({
    'teacherApplications/applicant': { uid: 'applicant', displayName: '申請教師', email: 'applicant@example.test', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
  });
  await reviewTeacherAccess(client, { targetUid: 'applicant', action: 'approved', eventId: 'review-approved-001' });
  assert.equal(client.rows.get('teacherApplications/applicant').status, 'approved');
  assert.equal(client.rows.get('teachers/applicant').active, true);
  assert.equal(client.rows.get('teacherReviewHistory/review-approved-001').action, 'approved');
  assert.equal(client.rows.get('teachers/applicant').lastReviewId, 'review-approved-001');

  await reviewTeacherAccess(client, { targetUid: 'applicant', action: 'revoked', eventId: 'review-revoked-001' });
  assert.equal(client.rows.get('teacherApplications/applicant').status, 'revoked');
  assert.equal(client.rows.get('teachers/applicant').active, false);
  assert.equal(client.rows.get('teacherReviewHistory/review-revoked-001').action, 'revoked');
});

test('legacy teachers without applications receive a linked revoked record', async () => {
  const client = fakeClient({ 'teachers/legacy': { active: true } });
  await reviewTeacherAccess(client, { targetUid: 'legacy', action: 'revoked', eventId: 'review-legacy-001' });
  assert.equal(client.rows.get('teachers/legacy').active, false);
  assert.equal(client.rows.get('teacherApplications/legacy').status, 'revoked');
  assert.equal(client.rows.get('teacherApplications/legacy').lastReviewId, 'review-legacy-001');
  assert.equal(client.rows.get('teacherReviewHistory/review-legacy-001').previousStatus, 'teacher-only');
});

test('service rejects self and cross-admin revocation before starting a transaction or writing data', async () => {
  const client = fakeClient({
    'admins/owner-uid': { active: true },
    'admins/admin-b': { active: true },
    'teachers/owner-uid': { active: true, displayName: '管理員 A' },
    'teachers/admin-b': { active: true, displayName: '管理員 B' }
  });
  const before = structuredClone([...client.rows.entries()]);
  await assert.rejects(
    () => reviewTeacherAccess(client, { targetUid: 'owner-uid', action: 'revoked', eventId: 'self-revoke-001' }),
    /系統管理員的教師權限不能透過審核功能撤銷/
  );
  await assert.rejects(
    () => reviewTeacherAccess(client, { targetUid: 'admin-b', action: 'revoked', eventId: 'cross-admin-revoke-001' }),
    /系統管理員的教師權限不能透過審核功能撤銷/
  );
  assert.equal(client.transactionRuns, 0);
  assert.deepEqual([...client.rows.entries()], before);
});

test('inactive and missing admin documents do not protect ordinary teachers from revocation', async () => {
  const client = fakeClient({
    'admins/owner-uid': { active: true },
    'admins/former-admin': { active: false },
    'teachers/former-admin': { active: true },
    'teachers/ordinary-teacher': { active: true }
  });
  await reviewTeacherAccess(client, { targetUid: 'former-admin', action: 'revoked', eventId: 'former-admin-revoke-001' });
  await reviewTeacherAccess(client, { targetUid: 'ordinary-teacher', action: 'revoked', eventId: 'ordinary-revoke-001' });
  assert.equal(client.rows.get('teachers/former-admin').active, false);
  assert.equal(client.rows.get('teachers/ordinary-teacher').active, false);
});

test('teacher page exposes application states and hides owner review controls from regular teachers', () => {
  const user = { uid: 'u1', displayName: '王老師', email: 'teacher@example.test' };
  const pending = teacherPageMarkup({ user, authorization: 'unauthorized', adminAuthorization: 'unauthorized', applicationStatus: 'success', application: { status: 'pending' } });
  assert.match(pending, /已送出申請，等待管理員審核/);
  assert.doesNotMatch(pending, /教師審核|data-review-action/);
  const approved = teacherPageMarkup({ user, authorization: 'unauthorized', adminAuthorization: 'unauthorized', applicationStatus: 'success', application: { status: 'approved' } });
  assert.match(approved, /重新驗證教師權限/);
  const admin = teacherPageMarkup({ user, authorization: 'unauthorized', adminAuthorization: 'authorized', teacherView: 'reviews', review: { status: 'success', pending: [], teachers: [], message: '' } });
  assert.match(admin, /id="teacher-show-reviews"[^>]*>教師審核/);
  assert.match(admin, /目前沒有待審核申請/);
});

test('all admin rows are identified without revoke buttons while other teachers remain revocable', () => {
  const user = { uid: 'admin-a', displayName: '管理員 A', email: 'admin-a@example.test' };
  const markup = teacherPageMarkup({
    user,
    authorization: 'authorized',
    adminAuthorization: 'authorized',
    teacherView: 'reviews',
    review: {
      status: 'success', pending: [], message: '',
      teachers: [
        { uid: 'admin-a', displayName: '管理員 A', email: 'admin-a@example.test', hasApplication: false, isAdmin: true },
        { uid: 'admin-b', displayName: '管理員 B', email: 'admin-b@example.test', hasApplication: false, isAdmin: true },
        { uid: 'teacher-uid', displayName: '一般教師', email: 'teacher@example.test', hasApplication: true, isAdmin: false }
      ]
    }
  });
  assert.equal((markup.match(/系統管理員，不可撤銷/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /data-review-action="revoked" data-review-uid="admin-a"/);
  assert.doesNotMatch(markup, /data-review-action="revoked" data-review-uid="admin-b"/);
  assert.match(markup, /data-review-action="revoked" data-review-uid="teacher-uid"/);
});

test('rules contain owner-only helpers and cross-document getAfter review links', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /function isAdmin\(\) \{\s*return request\.auth != null && isActiveAdmin\(request\.auth\.uid\)/);
  assert.match(rules, /match \/admins\/\{uid\}[\s\S]*allow read, write: if false/);
  assert.match(rules, /match \/adminProtectionProbes\/\{uid\}[\s\S]*allow get: if isAdmin\(\) && isActiveAdmin\(uid\)[\s\S]*allow list, create, update, delete: if false/);
  assert.match(rules, /match \/teacherApplications\/\{uid\}[\s\S]*allow list: if isAdmin\(\)/);
  assert.match(rules, /match \/teacherReviewHistory\/\{eventId\}[\s\S]*allow create: if isAdmin\(\) && hasValidReviewHistory\(eventId\)/);
  assert.match(rules, /getAfter\([\s\S]*teacherReviewHistory/);
  assert.match(rules, /function hasValidTeacherRevocation\(uid\) \{\s*return !isActiveAdmin\(uid\)/);
  assert.match(rules, /function hasValidLegacyRevocationApplication\(uid\) \{\s*return isAdmin\(\)\s*&& !isActiveAdmin\(uid\)/);
});

test('temporary authorization errors retain an already verified teacher session', () => {
  const page = source('../teacher-page.js');
  assert.match(page, /retainedTeacherAuthorization[\s\S]*teacherResult\.status === 'rejected' \? retainedTeacherAuthorization \? 'authorized' : 'error'/);
  assert.match(page, /revalidateAfterPermissionDenied[\s\S]*catch\(\(\) => \{[\s\S]*尚未變更目前教師登入狀態/);
});
