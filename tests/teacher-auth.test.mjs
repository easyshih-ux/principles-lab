import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveRoute } from '../router.js';
import {
  createTeacherFirebaseClient,
  signInTeacherWithGoogle,
  signOutTeacher,
  TEACHER_FIREBASE_APP_NAME,
  verifyTeacherAuthorization
} from '../teacher-auth.js';
import { copyTeacherUid, teacherPageMarkup } from '../teacher-page.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('teacher Firebase client uses a separate named app and in-memory persistence', async () => {
  const calls = [];
  const teacherApp = { name: TEACHER_FIREBASE_APP_NAME };
  const teacherAuth = { app: teacherApp };
  class FakeGoogleAuthProvider {
    setCustomParameters(parameters) { calls.push(['providerParameters', parameters]); }
  }
  const appSdk = {
    initializeApp: (config, name) => {
      calls.push(['initializeApp', config.projectId, name]);
      return teacherApp;
    }
  };
  const authSdk = {
    getAuth: (app) => { calls.push(['getAuth', app.name]); return teacherAuth; },
    setPersistence: async (auth, persistence) => calls.push(['setPersistence', auth, persistence]),
    inMemoryPersistence: { type: 'NONE' },
    GoogleAuthProvider: FakeGoogleAuthProvider,
    signInWithPopup() {},
    signOut() {},
    onAuthStateChanged() {}
  };
  const teacherDb = { app: teacherApp };
  const firestoreSdk = {
    getFirestore: (app) => { calls.push(['getFirestore', app.name]); return teacherDb; },
    collection() {},
    query() {},
    limit() {},
    getCountFromServer() {}
  };

  const client = await createTeacherFirebaseClient(appSdk, authSdk, firestoreSdk);
  assert.equal(client.firebaseApp, teacherApp);
  assert.equal(client.auth, teacherAuth);
  assert.equal(client.db, teacherDb);
  assert.deepEqual(calls[0], ['initializeApp', 'principles-lab', 'teacher']);
  assert.deepEqual(calls[1], ['getAuth', 'teacher']);
  assert.deepEqual(calls[2], ['getFirestore', 'teacher']);
  assert.deepEqual(calls[3], ['setPersistence', teacherAuth, authSdk.inMemoryPersistence]);
  assert.deepEqual(calls[4], ['providerParameters', { prompt: 'select_account' }]);
});

test('teacher sign-in and sign-out operate only on the teacher Auth instance', async () => {
  const studentAuth = { name: 'student-default-auth', currentUser: { uid: 'anonymous-student' } };
  const teacherAuth = { name: 'teacher-auth', currentUser: null };
  const calls = [];
  const client = {
    auth: teacherAuth,
    googleProvider: { name: 'google' },
    signInWithPopup: async (auth, provider) => {
      calls.push(['signIn', auth, provider]);
      return { user: { uid: 'teacher-uid' } };
    },
    signOut: async (auth) => calls.push(['signOut', auth])
  };
  const credential = await signInTeacherWithGoogle(client);
  await signOutTeacher(client);
  assert.equal(credential.user.uid, 'teacher-uid');
  assert.deepEqual(calls, [
    ['signIn', teacherAuth, client.googleProvider],
    ['signOut', teacherAuth]
  ]);
  assert.equal(studentAuth.currentUser.uid, 'anonymous-student');
});

test('#teacher resolves before student identity and renders the signed-out entrance', () => {
  assert.equal(resolveRoute('#teacher', [], []).name, 'teacher');
  const markup = teacherPageMarkup({ ready: true });
  assert.match(markup, /教師進度/);
  assert.match(markup, /請使用授權的教師 Google 帳號登入/);
  assert.match(markup, /使用 Google 帳號登入/);
  assert.match(markup, /返回網站入口/);
  assert.doesNotMatch(markup, /教師 UID|teacher-copy-uid/);
});

test('signed-in unauthorized view exposes the current UID and copy control', () => {
  const markup = teacherPageMarkup({ user: { uid: 'firebase-teacher-uid', displayName: '教師', email: 'teacher@example.test' }, authorization: 'unauthorized' });
  assert.match(markup, /firebase-teacher-uid/);
  assert.match(markup, /此 Google 帳號未取得教師權限/);
  assert.match(markup, /教師 UID/);
  assert.match(markup, /id="teacher-copy-uid"[^>]*>複製 UID/);
  assert.match(markup, /登出並返回網站入口/);
});

test('authorized teacher view does not expose the unauthorized UID block', () => {
  const markup = teacherPageMarkup({ user: { uid: 'authorized-teacher-uid' }, authorization: 'authorized' });
  assert.doesNotMatch(markup, /authorized-teacher-uid|教師 UID|teacher-copy-uid/);
});

test('copyTeacherUid copies the current teacher UID and isolates clipboard failures', async () => {
  const writes = [];
  assert.equal(await copyTeacherUid('current-teacher-uid', { writeText: async (value) => writes.push(value) }), true);
  assert.deepEqual(writes, ['current-teacher-uid']);
  assert.equal(await copyTeacherUid('current-teacher-uid', { writeText: async () => { throw new Error('blocked'); } }), false);
  assert.equal(await copyTeacherUid('current-teacher-uid', null), false);
});

test('teacher authorization probe uses the teacher Firestore count query and returns no documents', async () => {
  const calls = [];
  const client = {
    db: { app: { name: 'teacher' } },
    collection: (db, name) => { calls.push(['collection', db.app.name, name]); return { name }; },
    limit: (value) => { calls.push(['limit', value]); return { value }; },
    query: (collectionRef, constraint) => { calls.push(['query', collectionRef.name, constraint.value]); return { collectionRef, constraint }; },
    getCountFromServer: async (probe) => { calls.push(['count', probe.collectionRef.name, probe.constraint.value]); return { data: () => ({ count: 1 }) }; }
  };
  assert.equal(await verifyTeacherAuthorization(client), true);
  assert.deepEqual(calls, [
    ['collection', 'teacher', 'studentProgress'],
    ['limit', 1],
    ['query', 'studentProgress', 1],
    ['count', 'studentProgress', 1]
  ]);
  const authSource = source('../teacher-auth.js');
  const authorizationProbeSource = authSource.slice(
    authSource.indexOf('export async function verifyTeacherAuthorization'),
    authSource.indexOf('export function teacherAuthErrorMessage')
  );
  assert.doesNotMatch(authorizationProbeSource, /getDocs|getDoc\(/);
  assert.doesNotMatch(source('../teacher-page.js'), /collection\(|getDocs\(|studentProgress/);
});

test('permission-denied authorization probe maps to unauthorized and other failures remain errors', async () => {
  const client = {
    db: {},
    collection: () => ({}),
    limit: () => ({}),
    query: () => ({}),
    getCountFromServer: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); }
  };
  assert.equal(await verifyTeacherAuthorization(client), false);
  client.getCountFromServer = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
  await assert.rejects(() => verifyTeacherAuthorization(client), /offline/);
});

test('authorized teacher markup waits for Dashboard state after reporting authorization', () => {
  const markup = teacherPageMarkup({ user: { uid: 'teacher-uid' }, authorization: 'authorized' });
  assert.match(markup, /教師身分已授權/);
  assert.doesNotMatch(markup, /教師 UID|teacher-copy-uid/);
  assert.doesNotMatch(markup, /學生名單|排名|百分比/);
  assert.doesNotMatch(source('../app.js'), /signOut\(.*student|signOut.*Anonymous/i);
});

test('Firestore rules authorize only active teacher documents while teachers stays client-deny', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /function isTeacher\(\)[\s\S]*request\.auth != null[\s\S]*get\([\s\S]*\/databases\/\$\(database\)\/documents\/teachers\/\$\(request\.auth\.uid\)[\s\S]*\)\.data\.active == true/);
  assert.match(rules, /match \/teachers\/\{uid\}[\s\S]*allow read, write: if false/);
  assert.match(rules, /match \/studentProgress\/\{studentKey\}[\s\S]*allow get, list: if isTeacher\(\)/);
  assert.match(rules, /allow delete: if false/);
  assert.doesNotMatch(rules, /teacherUid|teacher@example|google\.com.*isTeacher/);
});

test('student writes require the official anonymous sign-in provider claim', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /request\.auth\.token\.firebase\.sign_in_provider == 'anonymous'/);
  assert.match(rules, /allow create: if isAnonymousStudent\(\)/);
  assert.match(rules, /allow update: if isAnonymousStudent\(\)/);
  assert.doesNotMatch(rules, /allow (create|update): if isAuthenticated\(\)/);
});
