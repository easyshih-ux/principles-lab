import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { firebaseConfig, isFirebaseConfigured } from '../firebase-config.js';
import { buildTestCheckpointData, isAllowedCheckpointTransition, studentProgressDocumentId, writeTestCheckpoint } from '../student-progress-cloud.js';
import * as cloudProgress from '../student-progress-cloud.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

function fakeClient() {
  const writes = [];
  return {
    auth: { currentUser: { uid: 'anonymous-test-uid' } },
    db: {},
    doc: (_db, collection, documentId) => `${collection}/${documentId}`,
    setDoc: async (reference, data, options) => { writes.push({ reference, data, options }); },
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    writes
  };
}

test('progress document id is the canonical studentKey', () => {
  assert.equal(studentProgressDocumentId({ classId: '701', seatNo: 1 }), '701-1');
  assert.equal(studentProgressDocumentId({ classId: '701', seatNo: '01' }), '701-1');
  assert.notEqual(studentProgressDocumentId({ classId: '701', seatNo: 12 }), studentProgressDocumentId({ classId: '702', seatNo: 12 }));
});

test('checkpoint payload preserves canonical identity and adds only checkpoint fields', () => {
  assert.deepEqual(buildTestCheckpointData({ classId: '701', seatNo: '01' }, 'timestamp'), {
    classId: '701', seatNo: 1, studentKey: '701-1', testCheckpointComplete: true, updatedAt: 'timestamp'
  });
});

test('checkpoint write is idempotent by using the same document path with merge', async () => {
  const client = fakeClient();
  const identity = { classId: '701', seatNo: 12 };
  const first = await writeTestCheckpoint(identity, { client });
  const second = await writeTestCheckpoint(identity, { client });
  assert.equal(first.path, 'studentProgress/701-12');
  assert.equal(second.path, first.path);
  assert.equal(client.writes.length, 2);
  assert.deepEqual(client.writes.map(({ reference, options }) => ({ reference, options })), [
    { reference: 'studentProgress/701-12', options: { merge: true } },
    { reference: 'studentProgress/701-12', options: { merge: true } }
  ]);
});

test('identity cannot change during a checkpoint transition and false only advances to true', () => {
  const previous = { classId: '701', seatNo: 12, studentKey: '701-12', testCheckpointComplete: false };
  assert.equal(isAllowedCheckpointTransition(previous, { ...previous, testCheckpointComplete: true }), true);
  assert.equal(isAllowedCheckpointTransition({ ...previous, testCheckpointComplete: true }, previous), false);
  assert.equal(isAllowedCheckpointTransition(previous, { ...previous, classId: '702', studentKey: '702-12', testCheckpointComplete: true }), false);
});

test('complete Firebase config is detected without eagerly loading SDK details in app', () => {
  assert.equal(isFirebaseConfigured(firebaseConfig), true);
  assert.doesNotThrow(() => source('../app.js'));
  assert.doesNotMatch(source('../app.js'), /gstatic|initializeApp|getFirestore|signInAnonymously/);
});

test('Firebase service and temporary dev UI stay separated', () => {
  const app = source('../app.js');
  const service = source('../student-progress-cloud.js');
  assert.match(app, /writeTestCheckpoint/);
  assert.doesNotMatch(app, /setDoc|serverTimestamp|STUDENT_PROGRESS_COLLECTION/);
  assert.match(service, /setDoc/);
});

test('ending the local student session is not a cloud delete operation', () => {
  assert.equal('deleteStudentProgress' in cloudProgress, false);
  assert.doesNotMatch(source('../student-session.js'), /studentProgress|deleteDoc|firebase/);
  assert.doesNotMatch(source('../student-progress-cloud.js'), /deleteDoc|deleteStudent/);
});

test('Firestore rules default deny reads deletes and unknown paths while constraining writes', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /allow get, list, delete: if false/);
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /keys\(\)\.hasOnly/);
  assert.match(rules, /studentKey == request\.resource\.data\.classId \+ '-' \+ string\(request\.resource\.data\.seatNo\)/);
  assert.match(rules, /allow create:[\s\S]*request\.resource\.data\.testCheckpointComplete == true[\s\S]*hasServerTimestamp\(\);/);
  assert.doesNotMatch(rules, /allow create:[\s\S]*request\.resource\.data\.testCheckpointComplete is bool[\s\S]*hasServerTimestamp\(\);/);
  assert.match(rules, /affectedKeys\(\)[\s\S]*hasOnly\(\['testCheckpointComplete', 'updatedAt'\]\)/);
  assert.match(rules, /request\.resource\.data\.testCheckpointComplete == true/);
  assert.match(rules, /request\.resource\.data\.updatedAt == request\.time/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});
