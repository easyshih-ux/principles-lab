import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveRoute } from '../router.js';
import {
  createTeacherFirebaseClient,
  signInTeacherWithGoogle,
  signOutTeacher,
  TEACHER_FIREBASE_APP_NAME
} from '../teacher-auth.js';
import { teacherPageMarkup } from '../teacher-page.js';

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

  const client = await createTeacherFirebaseClient(appSdk, authSdk);
  assert.equal(client.firebaseApp, teacherApp);
  assert.equal(client.auth, teacherAuth);
  assert.deepEqual(calls[0], ['initializeApp', 'principles-lab', 'teacher']);
  assert.deepEqual(calls[1], ['getAuth', 'teacher']);
  assert.deepEqual(calls[2], ['setPersistence', teacherAuth, authSdk.inMemoryPersistence]);
  assert.deepEqual(calls[3], ['providerParameters', { prompt: 'select_account' }]);
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
  assert.match(markup, /返回學生首頁/);
});

test('signed-in test view exposes UID but clearly remains unauthorized', () => {
  const markup = teacherPageMarkup({ user: { uid: 'firebase-teacher-uid', displayName: '教師', email: 'teacher@example.test' } });
  assert.match(markup, /firebase-teacher-uid/);
  assert.match(markup, /教師身分尚未授權/);
  assert.match(markup, /登出並返回學生首頁/);
});

test('teacher authentication module contains no Firestore progress access', () => {
  const authSource = source('../teacher-auth.js');
  const pageSource = source('../teacher-page.js');
  for (const value of [authSource, pageSource]) {
    assert.doesNotMatch(value, /getFirestore|studentProgress|collection\(|getDocs|getDoc|query\(/);
  }
  assert.doesNotMatch(source('../app.js'), /signOut\(.*student|signOut.*Anonymous/i);
});

test('Firestore rules remain read-deny and are not teacher-aware in C1-A', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /allow get, list, delete: if false/);
  assert.doesNotMatch(rules, /teachers|isTeacher/);
});
