import { isValidStudentIdentity } from './classroom-config.js';
import { ACTIVE_ACADEMIC_YEAR, buildStudentKey } from './academic-year.js';

export const CURRENT_STUDENT_STORAGE_KEY = 'formalPrinciplesLab.currentStudent.v2';

export function createStudentIdentity(classId, seatNo, academicYear = ACTIVE_ACADEMIC_YEAR) {
  const normalizedClassId = String(classId);
  const normalizedSeatNo = Number(seatNo);
  const normalizedAcademicYear = String(academicYear);
  if (!isValidStudentIdentity(normalizedClassId, normalizedSeatNo)) return null;
  const studentKey = buildStudentKey(normalizedAcademicYear, normalizedClassId, normalizedSeatNo);
  if (!studentKey) return null;
  return {
    academicYear: normalizedAcademicYear,
    classId: normalizedClassId,
    seatNo: normalizedSeatNo,
    studentKey
  };
}

export function loadCurrentStudent(storage) {
  if (!storage) return null;
  try {
    const saved = JSON.parse(storage.getItem(CURRENT_STUDENT_STORAGE_KEY) ?? 'null');
    if (!saved || saved.academicYear !== ACTIVE_ACADEMIC_YEAR
      || saved.studentKey !== buildStudentKey(saved.academicYear, saved.classId, saved.seatNo)) return null;
    return createStudentIdentity(saved.classId, saved.seatNo, saved.academicYear);
  } catch {
    return null;
  }
}

export function saveCurrentStudent(identity, storage) {
  const currentStudent = createStudentIdentity(identity?.classId, identity?.seatNo, ACTIVE_ACADEMIC_YEAR);
  if (!currentStudent) return null;
  try { storage?.setItem(CURRENT_STUDENT_STORAGE_KEY, JSON.stringify(currentStudent)); } catch { /* session remains usable in memory */ }
  return currentStudent;
}

export function clearCurrentStudent(storage) {
  try { storage?.removeItem(CURRENT_STUDENT_STORAGE_KEY); } catch { /* clear the in-memory session below */ }
  return null;
}
