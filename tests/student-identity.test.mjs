import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CLASSROOMS, classroomOptions, formatSeatNumber, isValidStudentIdentity, seatOptions } from '../classroom-config.js';
import { CLASSROOM_UNLOCK_STORAGE_KEY, attemptClassroomUnlock, createLockedClassroomUnlocks, loadClassroomUnlocks, resetClassroomUnlocks } from '../classroom-unlocks.js';
import { clearCurrentStudent, createStudentIdentity, CURRENT_STUDENT_STORAGE_KEY, loadCurrentStudent, saveCurrentStudent } from '../student-session.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('official config generates all 15 class options from 701 through 715', () => {
  assert.equal(CLASSROOMS.length, 15);
  assert.deepEqual(classroomOptions().map(({ value }) => value), Array.from({ length: 15 }, (_, index) => String(701 + index)));
});

test('each current classroom provides valid seats 01 through 30', () => {
  CLASSROOMS.forEach(({ id }) => {
    assert.deepEqual(seatOptions(id), Array.from({ length: 30 }, (_, index) => index + 1));
  });
  assert.deepEqual(seatOptions('999'), []);
});

test('seat labels use two digits without changing numeric seat values', () => {
  assert.deepEqual([formatSeatNumber(1), formatSeatNumber(2), formatSeatNumber(9), formatSeatNumber(10), formatSeatNumber(30)], ['01', '02', '09', '10', '30']);
  assert.deepEqual(seatOptions('701').map(formatSeatNumber), Array.from({ length: 30 }, (_, index) => String(index + 1).padStart(2, '0')));
});

test('validSeatNumbers can express gaps and omitted seats never become options', () => {
  const classrooms = [{ id: '701', validSeatNumbers: [1, 2, 4, 5] }];
  assert.deepEqual(seatOptions('701', classrooms), [1, 2, 4, 5]);
  assert.equal(isValidStudentIdentity('701', 3, classrooms), false);
});

test('adding class 716 requires only a config entry', () => {
  const classrooms = [...CLASSROOMS, { id: '716', validSeatNumbers: [1, 2, 3] }];
  assert.equal(classroomOptions(classrooms).at(-1).value, '716');
  assert.deepEqual(seatOptions('716', classrooms), [1, 2, 3]);
});

test('adding seat 31 requires only validSeatNumbers config data', () => {
  const classrooms = [{ id: '701', validSeatNumbers: [...seatOptions('701'), 31] }];
  assert.equal(seatOptions('701', classrooms).at(-1), 31);
  assert.equal(isValidStudentIdentity('701', 31, classrooms), true);
});

test('studentKey includes both class and seat', () => {
  assert.notEqual(createStudentIdentity('701', 12).studentKey, createStudentIdentity('702', 12).studentKey);
  assert.equal(createStudentIdentity('701', 1).studentKey, '701-1');
  assert.equal(createStudentIdentity('701', '01').studentKey, '701-1');
  assert.deepEqual(createStudentIdentity('701', 1), createStudentIdentity('701', '01'));
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
