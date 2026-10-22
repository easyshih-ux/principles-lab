import { LEGACY_DEFAULT_ACADEMIC_YEAR, buildStudentKey } from './academic-year.js?v=v2-d3-1';
import { STUDENT_PROGRESS_COLLECTION, STUDENT_PROGRESS_CHECKPOINTS, FREE_REVIEW_PRINCIPLE_CHECKPOINTS } from './student-progress-cloud.js';

// 10/22: free practice in three parts, so the teacher can follow progress during a lesson.
export const FREE_REVIEW_SEGMENTS = Object.freeze([
  Object.freeze({ key: 'freeReviewSegment1', label: '01–03', names: '反覆・漸層・對稱', checkpoints: FREE_REVIEW_PRINCIPLE_CHECKPOINTS.slice(0, 3) }),
  Object.freeze({ key: 'freeReviewSegment2', label: '04–06', names: '均衡・對比・律動', checkpoints: FREE_REVIEW_PRINCIPLE_CHECKPOINTS.slice(3, 6) }),
  Object.freeze({ key: 'freeReviewSegment3', label: '07–10', names: '比例・統一・調和・單純', checkpoints: FREE_REVIEW_PRINCIPLE_CHECKPOINTS.slice(6, 10) })
]);

export const TEACHER_PROGRESS_ITEMS = Object.freeze([
  Object.freeze({ key: 'freeReviewComplete', label: '自由練習' }),
  Object.freeze({ key: 'level1Complete', label: '第一關' }),
  Object.freeze({ key: 'level2Complete', label: '第二關' }),
  Object.freeze({ key: 'level3Complete', label: '第三關' })
]);

export function activeTeacherClassrooms(classrooms = []) {
  return classrooms.filter((classroom) => classroom.active !== false);
}

export function emptyTeacherProgressSummary(classroom, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  return {
    academicYear,
    classId: classroom.id,
    validCount: classroom.validSeatNumbers.length,
    counts: Object.fromEntries(STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, 0])),
    completedSeats: Object.fromEntries(STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, []])),
    // 10/22: seats still to finish each step, so the teacher sees who needs help first.
    pendingSeats: Object.fromEntries(STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, [...classroom.validSeatNumbers].map(Number).sort((a, b) => a - b)])),
    segments: FREE_REVIEW_SEGMENTS.map(({ key, label, names }) => ({ key, label, names, completedSeats: [], pendingSeats: [...classroom.validSeatNumbers].map(Number).sort((a, b) => a - b) }))
  };
}

export function summarizeTeacherProgress(classroom, records = [], academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  const summary = emptyTeacherProgressSummary(classroom, academicYear);
  const validSeats = new Set(classroom.validSeatNumbers.map(Number));
  const completedStudents = Object.fromEntries(
    STUDENT_PROGRESS_CHECKPOINTS.map((key) => [key, new Map()])
  );
  const segmentStudents = {};

  for (const record of records) {
    const recordAcademicYear = String(record?.academicYear ?? '');
    const classId = String(record?.classId ?? '');
    const seatNo = Number(record?.seatNo);
    const studentKey = String(record?.studentKey ?? '');
    if (recordAcademicYear !== academicYear || classId !== classroom.id || !validSeats.has(seatNo)
      || studentKey !== buildStudentKey(recordAcademicYear, classId, seatNo)) continue;
    // A student counts as done with free practice when the old mark is there, or every principle is.
    const allPrinciples = FREE_REVIEW_PRINCIPLE_CHECKPOINTS.every((key) => record[key] === true);
    for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) {
      const done = record[checkpoint] === true || (checkpoint === 'freeReviewComplete' && allPrinciples);
      if (done && !completedStudents[checkpoint].has(studentKey)) {
        completedStudents[checkpoint].set(studentKey, seatNo);
      }
    }
    for (const segment of FREE_REVIEW_SEGMENTS) {
      if (record.freeReviewComplete === true || segment.checkpoints.every((key) => record[key] === true)) {
        (segmentStudents[segment.key] ??= new Map()).set(studentKey, seatNo);
      }
    }
  }
  for (const checkpoint of STUDENT_PROGRESS_CHECKPOINTS) {
    summary.completedSeats[checkpoint] = [...completedStudents[checkpoint].values()]
      .sort((left, right) => left - right);
    summary.counts[checkpoint] = summary.completedSeats[checkpoint].length;
    const done = new Set(summary.completedSeats[checkpoint]);
    summary.pendingSeats[checkpoint] = [...validSeats].filter((seatNo) => !done.has(seatNo)).sort((left, right) => left - right);
  }
  summary.segments = summary.segments.map((segment) => {
    const completedSeats = [...(segmentStudents[segment.key]?.values() ?? [])].sort((left, right) => left - right);
    const done = new Set(completedSeats);
    return { ...segment, completedSeats, pendingSeats: [...validSeats].filter((seatNo) => !done.has(seatNo)).sort((left, right) => left - right) };
  });
  return summary;
}

function teacherClassQuery(client, classroom, academicYear) {
  const progress = client.collection(client.db, STUDENT_PROGRESS_COLLECTION);
  const yearConstraint = client.where('academicYear', '==', academicYear);
  const classConstraint = client.where('classId', '==', classroom.id);
  return client.query(progress, yearConstraint, classConstraint);
}

// Only progress fields are kept; nothing else a document might hold reaches the teacher page.
function progressRecords(docs) {
  return docs.map((item) => {
    const data = item.data();
    return {
      academicYear: data.academicYear,
      classId: data.classId,
      seatNo: data.seatNo,
      studentKey: data.studentKey,
      freeReviewComplete: data.freeReviewComplete,
      level1Complete: data.level1Complete,
      level2Complete: data.level2Complete,
      level3Complete: data.level3Complete,
      ...Object.fromEntries(FREE_REVIEW_PRINCIPLE_CHECKPOINTS.map((key) => [key, data[key]]))
    };
  });
}

export async function loadTeacherClassProgress(client, classroom, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  const snapshot = await client.getDocs(teacherClassQuery(client, classroom, academicYear));
  return summarizeTeacherProgress(classroom, progressRecords(snapshot.docs), academicYear);
}

// 10/22 live progress: Firestore sends the class again whenever a student's marks change.
// Same query and the same security rule as loadTeacherClassProgress (teachers may list studentProgress).
// Returns a stop function, or null when the Firebase client cannot listen.
export function subscribeTeacherClassProgress(client, classroom, academicYear, { onSummary, onError }) {
  if (typeof client?.onSnapshot !== 'function') return null;
  return client.onSnapshot(
    teacherClassQuery(client, classroom, academicYear),
    { includeMetadataChanges: true },
    (snapshot) => onSummary(
      summarizeTeacherProgress(classroom, progressRecords(snapshot.docs), academicYear),
      { fromCache: Boolean(snapshot.metadata?.fromCache) }
    ),
    onError
  );
}

export function createTeacherDashboardController({
  client,
  academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR,
  classrooms = [],
  loadProgress = loadTeacherClassProgress,
  subscribeProgress = subscribeTeacherClassProgress,
  now = () => Date.now(),
  onPermissionDenied = () => {},
  onChange = () => {}
}) {
  const available = activeTeacherClassrooms(classrooms);
  let generation = 0;
  let liveGeneration = 0;
  let stopLive = null;
  let disposed = false;
  const state = {
    academicYear,
    classrooms: available,
    selectedClassId: available[0]?.id ?? '',
    status: 'idle',
    summary: available[0] ? emptyTeacherProgressSummary(available[0], academicYear) : null,
    error: '',
    // live: 'off' (manual only) | 'connecting' | 'live' | 'offline'
    live: 'off',
    lastUpdated: null
  };

  const notify = () => {
    if (!disposed) onChange({ ...state });
  };

  const selectedClassroom = () => available.find(({ id }) => id === state.selectedClassId);

  function failWith(error) {
    state.status = error?.code === 'permission-denied' ? 'permission-denied' : 'error';
    state.error = state.status === 'permission-denied'
      ? '教師權限不足，無法讀取班級進度。'
      : '暫時無法取得進度，請稍後重新整理。';
    if (state.status === 'permission-denied') void onPermissionDenied();
  }

  // quiet: catching up after the screen comes back — no "loading" screen, the cards stay as they are.
  async function refresh({ quiet = false } = {}) {
    const classroom = selectedClassroom();
    if (!classroom || disposed) return;
    const requestGeneration = ++generation;
    if (!quiet) {
      state.status = 'loading';
      state.error = '';
      notify();
    }
    try {
      const summary = await loadProgress(client, classroom, state.academicYear);
      if (disposed || requestGeneration !== generation) return;
      state.summary = summary;
      state.status = 'success';
      state.error = '';
      state.lastUpdated = now();
    } catch (error) {
      if (disposed || requestGeneration !== generation) return;
      if (quiet && error?.code !== 'permission-denied') {
        if (state.live !== 'off') state.live = 'offline';
      } else failWith(error);
    }
    notify();
  }

  function stopListening() {
    liveGeneration += 1;
    stopLive?.();
    stopLive = null;
  }

  function startListening() {
    stopListening();
    const classroom = selectedClassroom();
    if (!classroom || disposed) return false;
    const myGeneration = liveGeneration;
    const stop = subscribeProgress(client, classroom, state.academicYear, {
      onSummary(summary, { fromCache }) {
        if (disposed || myGeneration !== liveGeneration) return;
        generation += 1; // a newer picture than any request still on its way
        state.summary = summary;
        state.status = 'success';
        state.error = '';
        if (fromCache) state.live = 'offline';
        else {
          state.live = 'live';
          state.lastUpdated = now();
        }
        notify();
      },
      onError(error) {
        if (disposed || myGeneration !== liveGeneration) return;
        stopLive = null;
        state.live = 'off';
        if (error?.code === 'permission-denied') failWith(error);
        notify();
      }
    });
    if (!stop) return false;
    stopLive = stop;
    return true;
  }

  // Open the selected class: live updates when possible, otherwise a one-time read.
  function start() {
    const classroom = selectedClassroom();
    if (!classroom || disposed) return Promise.resolve();
    if (startListening()) {
      if (state.live !== 'live') {
        state.live = 'connecting';
        state.status = state.lastUpdated ? state.status : 'loading';
        notify();
      }
      return Promise.resolve();
    }
    return refresh();
  }

  // The screen came back (screen on, back from another app, network back): catch up at once.
  function resume() {
    if (disposed || !selectedClassroom()) return Promise.resolve();
    if (!stopLive) startListening();
    return refresh({ quiet: true });
  }

  function selectClass(classId) {
    if (!available.some(({ id }) => id === classId)) return Promise.resolve();
    stopListening();
    state.selectedClassId = classId;
    state.summary = emptyTeacherProgressSummary(selectedClassroom(), state.academicYear);
    state.lastUpdated = null;
    state.live = 'off';
    return start();
  }

  return {
    getState: () => ({ ...state }),
    start,
    refresh,
    resume,
    selectClass,
    destroy() {
      disposed = true;
      generation += 1;
      stopListening();
    }
  };
}
