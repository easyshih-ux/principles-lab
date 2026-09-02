import { ensureAnonymousAuth, firebaseErrorMessage, getFirebaseClient } from './firebase-client.js';
import { createStudentIdentity } from './student-session.js';

export const STUDENT_PROGRESS_COLLECTION = 'studentProgress';
export const STUDENT_PROGRESS_CHECKPOINTS = Object.freeze([
  'freeReviewComplete',
  'level1Complete',
  'level2Complete',
  'level3Complete'
]);

export function studentProgressDocumentId(identity) {
  return createStudentIdentity(identity?.classId, identity?.seatNo, identity?.academicYear)?.studentKey ?? null;
}

export function buildCheckpointData(identity, checkpointName, updatedAt) {
  const student = createStudentIdentity(identity?.classId, identity?.seatNo, identity?.academicYear);
  if (!student) throw new TypeError('Invalid student identity');
  if (!STUDENT_PROGRESS_CHECKPOINTS.includes(checkpointName)) throw new TypeError('Invalid student progress checkpoint');
  return {
    academicYear: student.academicYear,
    classId: student.classId,
    seatNo: student.seatNo,
    studentKey: student.studentKey,
    [checkpointName]: true,
    updatedAt
  };
}

export async function writeStudentProgressCheckpoint(identity, checkpointName, dependencies = {}) {
  try {
    if (!STUDENT_PROGRESS_CHECKPOINTS.includes(checkpointName)) throw new TypeError('Invalid student progress checkpoint');
    const client = dependencies.client ?? await getFirebaseClient();
    const user = await ensureAnonymousAuth(client);
    const documentId = studentProgressDocumentId(identity);
    const reference = client.doc(client.db, STUDENT_PROGRESS_COLLECTION, documentId);
    const data = buildCheckpointData(identity, checkpointName, client.serverTimestamp());
    await client.setDoc(reference, data, { merge: true });
    return { ok: true, checkpointName, documentId, path: `${STUDENT_PROGRESS_COLLECTION}/${documentId}`, uid: user.uid };
  } catch (error) {
    return { ok: false, message: firebaseErrorMessage(error), code: error?.code ?? 'firebase/unavailable' };
  }
}
