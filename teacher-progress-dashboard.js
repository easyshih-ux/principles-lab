import { CLASSROOMS } from './classroom-config.js';
import { ACTIVE_ACADEMIC_YEAR, buildStudentKey } from './academic-year.js';
import { STUDENT_PROGRESS_COLLECTION, STUDENT_PROGRESS_CHECKPOINTS } from './student-progress-cloud.js';

export const TEACHER_PROGRESS_ITEMS = Object.freeze([
  Object.freeze({ key: 'freeReviewComplete', label: '自由練習' }),
  Object.freeze({ key: 'level1Complete', label: '第一關' }),
  Object.freeze({ key: 'level2Complete', label: '第二關' }),
  Object.freeze({ key: 'level3Complete', label: '第三關' })
]);

export function activeTeacherClassrooms(classrooms = CLASSROOMS) {
  return classrooms.filter((classroom) => classroom.active !== false);
}

export function emptyTeacherProgressSummary(classroom, academicYear = ACTIVE_ACADEMIC_YEAR) {
  return {
    academicYear,
    classId: classroom.id,
    validCount: classroom.validSeatNumbers.length,
    counts: Object.fromEntries(STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, 0])),
    completedSeats: Object.fromEntries(STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, []]))
  };
}

export function summarizeTeacherProgress(classroom, records = [], academicYear = ACTIVE_ACADEMIC_YEAR) {
  const summary = emptyTeacherProgressSummary(classroom, academicYear);
  const validSeats = new Set(classroom.validSeatNumbers.map(Number));
  const completedStudents = Object.fromEntries(
    STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, new Map()])
  );

  for (const record of records) {
    const recordAcademicYear = String(record?.academicYear ?? '');
    const classId = String(record?.classId ?? '');
    const seatNo = Number(record?.seatNo);
    const studentKey = String(record?.studentKey ?? '');
    if (recordAcademicYear !== academicYear || classId !== classroom.id || !validSeats.has(seatNo)
      || studentKey !== buildStudentKey(recordAcademicYear, classId, seatNo)) continue;
    for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) {
      if (record[checkpoint] === true && !completedStudents[checkpoint].has(studentKey)) {
        completedStudents[checkpoint].set(studentKey, seatNo);
      }
    }
  }
  for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) {
    summary.completedSeats[checkpoint] = [...completedStudents[checkpoint].values()]
      .sort((left, right) => left - right);
    summary.counts[checkpoint] = summary.completedSeats[checkpoint].length;
  }
  return summary;
}

export async function loadTeacherClassProgress(client, classroom, academicYear = ACTIVE_ACADEMIC_YEAR) {
  const progress = client.collection(client.db, STUDENT_PROGRESS_COLLECTION);
  const yearConstraint = client.where('academicYear', '==', academicYear);
  const classConstraint = client.where('classId', '==', classroom.id);
  const classQuery = client.query(progress, yearConstraint, classConstraint);
  const snapshot = await client.getDocs(classQuery);
  const records = snapshot.docs.map((item) => {
    const data = item.data();
    return {
      academicYear: data.academicYear,
      classId: data.classId,
      seatNo: data.seatNo,
      studentKey: data.studentKey,
      freeReviewComplete: data.freeReviewComplete,
      level1Complete: data.level1Complete,
      level2Complete: data.level2Complete,
      level3Complete: data.level3Complete
    };
  });
  return summarizeTeacherProgress(classroom, records, academicYear);
}

export function createTeacherDashboardController({
  client,
  classrooms = activeTeacherClassrooms(),
  loadProgress = loadTeacherClassProgress,
  onChange = () => {}
}) {
  const available = activeTeacherClassrooms(classrooms);
  let generation = 0;
  let disposed = false;
  const state = {
    academicYear: ACTIVE_ACADEMIC_YEAR,
    classrooms: available,
    selectedClassId: available[0]?.id ?? '',
    status: 'idle',
    summary: available[0] ? emptyTeacherProgressSummary(available[0]) : null,
    error: ''
  };

  const notify = () => {
    if (!disposed) onChange({ ...state });
  };

  async function refresh() {
    const classroom = available.find(({ id }) => id === state.selectedClassId);
    if (!classroom || disposed) return;
    const requestGeneration = ++generation;
    state.status = 'loading';
    state.error = '';
    notify();
    try {
      const summary = await loadProgress(client, classroom, state.academicYear);
      if (disposed || requestGeneration !== generation) return;
      state.summary = summary;
      state.status = 'success';
    } catch (error) {
      if (disposed || requestGeneration !== generation) return;
      state.status = error?.code === 'permission-denied' ? 'permission-denied' : 'error';
      state.error = state.status === 'permission-denied'
        ? '教師權限不足，無法讀取班級進度。'
        : '暫時無法取得進度，請稍後重新整理。';
    }
    notify();
  }

  function selectClass(classId) {
    if (!available.some(({ id }) => id === classId)) return Promise.resolve();
    state.selectedClassId = classId;
    const classroom = available.find(({ id }) => id === classId);
    state.summary = emptyTeacherProgressSummary(classroom);
    return refresh();
  }

  return {
    getState: () => ({ ...state }),
    refresh,
    selectClass,
    destroy() {
      disposed = true;
      generation += 1;
    }
  };
}
