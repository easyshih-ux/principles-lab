import { isValidStudentIdentity } from './classroom-config.js';

export const CURRENT_STUDENT_STORAGE_KEY = 'formalPrinciplesLab.currentStudent.v1';

export function createStudentIdentity(classId, seatNo) {
  const normalizedClassId = String(classId);
  const normalizedSeatNo = Number(seatNo);
  if (!isValidStudentIdentity(normalizedClassId, normalizedSeatNo)) return null;
  return {
    classId: normalizedClassId,
    seatNo: normalizedSeatNo,
    studentKey: `${normalizedClassId}-${normalizedSeatNo}`
  };
}

export function loadCurrentStudent(storage) {
  if (!storage) return null;
  try {
    const saved = JSON.parse(storage.getItem(CURRENT_STUDENT_STORAGE_KEY) ?? 'null');
    if (!saved || saved.studentKey !== `${saved.classId}-${Number(saved.seatNo)}`) return null;
    return createStudentIdentity(saved.classId, saved.seatNo);
  } catch {
    return null;
  }
}

export function saveCurrentStudent(identity, storage) {
  const currentStudent = createStudentIdentity(identity?.classId, identity?.seatNo);
  if (!currentStudent) return null;
  try { storage?.setItem(CURRENT_STUDENT_STORAGE_KEY, JSON.stringify(currentStudent)); } catch { /* session remains usable in memory */ }
  return currentStudent;
}

export function clearCurrentStudent(storage) {
  try { storage?.removeItem(CURRENT_STUDENT_STORAGE_KEY); } catch { /* clear the in-memory session below */ }
  return null;
}
