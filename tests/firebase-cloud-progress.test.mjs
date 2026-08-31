import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firebaseConfig, isFirebaseConfigured } from '../firebase-config.js';
import { buildCheckpointData, STUDENT_PROGRESS_CHECKPOINTS, studentProgressDocumentId, writeStudentProgressCheckpoint } from '../student-progress-cloud.js';
import * as cloudProgress from '../student-progress-cloud.js';
import { principles, stages } from '../data.js';
import { areFreeReviewStagesComplete, createAppState, isFreeReviewComplete, markFreeReviewPrincipleComplete, markFreeReviewVisited } from '../state.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
function fakeClient({ fail = false } = {}) {
  const writes = [];
  return { auth: { currentUser: { uid: 'anonymous-test-uid' } }, db: {},
    doc: (_db, collection, documentId) => `${collection}/${documentId}`,
    setDoc: async (reference, data, options) => { if (fail) throw Object.assign(new Error('offline'), { code: 'unavailable' }); writes.push({ reference, data, options }); },
    serverTimestamp: () => 'SERVER_TIMESTAMP', writes };
}

test('checkpoint allowlist contains only the four formal completion fields', () => {
  assert.deepEqual(STUDENT_PROGRESS_CHECKPOINTS, ['freeReviewComplete', 'level1Complete', 'level2Complete', 'level3Complete']);
  assert.throws(() => buildCheckpointData({ classId: '701', seatNo: 12 }, 'arbitraryComplete', 'timestamp'));
});

test('each payload writes only one selected checkpoint as true and never creates false', () => {
  for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) {
    const data = buildCheckpointData({ classId: '701', seatNo: '01' }, checkpoint, 'timestamp');
    assert.deepEqual(data, { classId: '701', seatNo: 1, studentKey: '701-1', [checkpoint]: true, updatedAt: 'timestamp' });
    assert.doesNotMatch(JSON.stringify(data), /false/);
  }
});

test('document ids are canonical and class-specific', () => {
  assert.equal(studentProgressDocumentId({ classId: '701', seatNo: '01' }), '701-1');
  assert.notEqual(studentProgressDocumentId({ classId: '701', seatNo: 12 }), studentProgressDocumentId({ classId: '702', seatNo: 12 }));
});

test('repeated checkpoint writes merge true into the same document safely', async () => {
  const client = fakeClient();
  const identity = { classId: '701', seatNo: 12 };
  await writeStudentProgressCheckpoint(identity, 'level1Complete', { client });
  await writeStudentProgressCheckpoint(identity, 'level1Complete', { client });
  assert.equal(client.writes.length, 2);
  client.writes.forEach(({ reference, data, options }) => {
    assert.equal(reference, 'studentProgress/701-12');
    assert.equal(data.level1Complete, true);
    assert.deepEqual(options, { merge: true });
  });
});

test('cloud failure returns a result and formal completion remains non-blocking', async () => {
  const result = await writeStudentProgressCheckpoint({ classId: '701', seatNo: 12 }, 'level1Complete', { client: fakeClient({ fail: true }) });
  assert.equal(result.ok, false);
  const app = source('../app.js');
  assert.match(app, /void writeStudentProgressCheckpoint/);
  assert.match(app, /console\.warn/);
  assert.doesNotMatch(app, /await writeStudentProgressCheckpoint/);
});

test('formal course completion hooks map only to their matching checkpoint', () => {
  const recognize = source('../recognize-course.js');
  const discover = source('../discover-course.js');
  const experiment = source('../experiment-course.js');
  assert.match(recognize, /completeRecognizeCourse[\s\S]*onCheckpoint\('level1Complete'\)/);
  assert.doesNotMatch(recognize, /onCheckpoint\('level[23]Complete'\)/);
  assert.match(discover, /completeDiscoverCourse[\s\S]*onCheckpoint\('level2Complete'\)/);
  assert.doesNotMatch(discover, /onCheckpoint\('level[13]Complete'\)/);
  assert.match(experiment, /state\.experimentCourse\.completed[\s\S]*onCheckpoint\('level3Complete'\)/);
  assert.doesNotMatch(experiment, /onCheckpoint\('level[12]Complete'\)/);
});

test('free-review visited is separate and all ten principle completions are required', () => {
  const state = createAppState(stages);
  const ids = principles.map(({ id }) => id);
  markFreeReviewVisited(state, ids[0]);
  assert.equal(isFreeReviewComplete(state, ids), false);
  ids.slice(0, -1).forEach((id) => markFreeReviewPrincipleComplete(state, id));
  assert.equal(isFreeReviewComplete(state, ids), false);
  markFreeReviewPrincipleComplete(state, ids.at(-1));
  assert.equal(isFreeReviewComplete(state, ids), true);
  assert.deepEqual(state.freeReviewVisited, { [ids[0]]: true });
});

test('a free-review principle requires all three Q stages, not Q3 alone', () => {
  const state = createAppState(stages);
  const principleStages = stages.filter(({ principleId }) => principleId === 'repetition');
  state.stageState[principleStages.at(-1).id].isComplete = true;
  assert.equal(areFreeReviewStagesComplete(state, principleStages), false);
  principleStages.forEach(({ id }) => { state.stageState[id].isComplete = true; });
  assert.equal(areFreeReviewStagesComplete(state, principleStages), true);
});

test('free-review checkpoint is wired to Q3 completion, not visited selection', () => {
  const renderers = source('../renderers.js');
  assert.match(renderers, /completeFreeReviewPrinciple[\s\S]*markFreeReviewPrincipleComplete[\s\S]*onCheckpoint\('freeReviewComplete'\)/);
  const selection = renderers.slice(renderers.indexOf('function renderPrinciples()'), renderers.indexOf('function bindTaskBack'));
  assert.match(selection, /markFreeReviewVisited/);
  assert.doesNotMatch(selection, /freeReviewComplete|markFreeReviewPrincipleComplete/);
});

test('Firebase remains configured and SDK details stay outside app', () => {
  assert.equal(isFirebaseConfigured(firebaseConfig), true);
  assert.doesNotMatch(source('../app.js'), /gstatic|initializeApp|getFirestore|signInAnonymously|setDoc|serverTimestamp/);
});

test('ending local session cannot delete cloud progress', () => {
  assert.equal('deleteStudentProgress' in cloudProgress, false);
  assert.doesNotMatch(source('../student-session.js'), /studentProgress|deleteDoc|firebase/);
  assert.doesNotMatch(source('../student-progress-cloud.js'), /deleteDoc|deleteStudent/);
});

test('Firestore rules preserve progress validation while separating anonymous writes and teacher reads', () => {
  const rules = source('../firestore.rules');
  assert.match(rules, /allow get, list: if isTeacher\(\)/);
  assert.match(rules, /allow delete: if false/);
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /sign_in_provider == 'anonymous'/);
  assert.doesNotMatch(rules, /testCheckpointComplete/);
  for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) assert.match(rules, new RegExp(checkpoint));
  assert.match(rules, /keys\(\)\.hasOnly/);
  assert.match(rules, /get\('level1Complete', true\) == true/);
  assert.match(rules, /preservesCompletedCheckpoints/);
  assert.match(rules, /affectedKeys\(\)[\s\S]*hasOnly\(\['freeReviewComplete', 'level1Complete', 'level2Complete', 'level3Complete', 'updatedAt'\]\)/);
  assert.match(rules, /request\.resource\.data\.updatedAt == request\.time/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});
