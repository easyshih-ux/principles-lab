import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { classroomOptions, DEMO_CLASSROOMS, seatOptions } from '../classroom-config.js';
import { CLASSROOM_UNLOCK_STORAGE_KEY, attemptClassroomUnlock, createLockedClassroomUnlocks, loadClassroomUnlocks, resetClassroomUnlocks } from '../classroom-unlocks.js';
import { clearCurrentStudent, createStudentIdentity, CURRENT_STUDENT_STORAGE_KEY, loadCurrentStudent, saveCurrentStudent } from '../student-session.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('DEMO classroom config generates the available class options', () => {
  assert.deepEqual(DEMO_CLASSROOMS, [{ id: '701', seats: 28 }, { id: '702', seats: 27 }, { id: '703', seats: 29 }]);
  assert.deepEqual(classroomOptions().map(({ value }) => value), ['701', '702', '703']);
});

test('each classroom generates only its configured seat range', () => {
  assert.deepEqual([seatOptions('701').at(0), seatOptions('701').at(-1), seatOptions('701').length], [1, 28, 28]);
  assert.deepEqual([seatOptions('702').at(0), seatOptions('702').at(-1), seatOptions('702').length], [1, 27, 27]);
  assert.deepEqual([seatOptions('703').at(0), seatOptions('703').at(-1), seatOptions('703').length], [1, 29, 29]);
  assert.deepEqual(seatOptions('999'), []);
});

test('studentKey includes both class and seat', () => {
  assert.notEqual(createStudentIdentity('701', 12).studentKey, createStudentIdentity('702', 12).studentKey);
});

test('drafting an identity does not create a session before confirmation', () => {
  const storage = new MemoryStorage();
  createStudentIdentity('701', 12);
  assert.equal(storage.getItem(CURRENT_STUDENT_STORAGE_KEY), null);
});

test('confirmation saves classId seatNo and studentKey and reload restores them', () => {
  const storage = new MemoryStorage();
  const saved = saveCurrentStudent({ classId: '701', seatNo: '12' }, storage);
  assert.deepEqual(saved, { classId: '701', seatNo: 12, studentKey: '701-12' });
  assert.deepEqual(loadCurrentStudent(storage), saved);
});

test('ending use clears current student and classroom unlocks for the next student', () => {
  const storage = new MemoryStorage();
  saveCurrentStudent({ classId: '701', seatNo: 12 }, storage);
  attemptClassroomUnlock('recognize', 'LOOK', createLockedClassroomUnlocks(), storage);
  assert.notEqual(storage.getItem(CLASSROOM_UNLOCK_STORAGE_KEY), null);
  clearCurrentStudent(storage);
  resetClassroomUnlocks(storage);
  assert.equal(loadCurrentStudent(storage), null);
  assert.deepEqual(loadClassroomUnlocks(storage), createLockedClassroomUnlocks());
  assert.equal(saveCurrentStudent({ classId: '702', seatNo: 8 }, storage).studentKey, '702-8');
  assert.deepEqual(loadClassroomUnlocks(storage), createLockedClassroomUnlocks());
});

test('app identity gate creates storage only from explicit confirmation and resets unlocks on end', () => {
  const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSource, /#identity-confirm[\s\S]*saveCurrentStudent/);
  assert.doesNotMatch(appSource, /#identity-next[\s\S]{0,240}saveCurrentStudent/);
  assert.match(appSource, /#student-end-confirm[\s\S]*clearCurrentStudent[\s\S]*resetClassroomUnlocks/);
});
