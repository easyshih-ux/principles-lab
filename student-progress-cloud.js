import { ensureAnonymousAuth, firebaseErrorMessage, getFirebaseClient } from './firebase-client.js';
import { createStudentIdentity } from './student-session.js';

export const STUDENT_PROGRESS_COLLECTION = 'studentProgress';

export function studentProgressDocumentId(identity) {
  return createStudentIdentity(identity?.classId, identity?.seatNo)?.studentKey ?? null;
}

export function buildTestCheckpointData(identity, updatedAt) {
  const student = createStudentIdentity(identity?.classId, identity?.seatNo);
  if (!student) throw new TypeError('Invalid student identity');
  return {
    classId: student.classId,
    seatNo: student.seatNo,
    studentKey: student.studentKey,
    testCheckpointComplete: true,
    updatedAt
  };
}

export function isAllowedCheckpointTransition(previous, next) {
  if (previous?.classId !== next?.classId || previous?.seatNo !== next?.seatNo || previous?.studentKey !== next?.studentKey) return false;
  return next?.testCheckpointComplete === true && previous?.testCheckpointComplete !== true;
}

export async function writeTestCheckpoint(identity, dependencies = {}) {
  try {
    const client = dependencies.client ?? await getFirebaseClient();
    const user = await ensureAnonymousAuth(client);
    const documentId = studentProgressDocumentId(identity);
    const reference = client.doc(client.db, STUDENT_PROGRESS_COLLECTION, documentId);
    const data = buildTestCheckpointData(identity, client.serverTimestamp());
    await client.setDoc(reference, data, { merge: true });
    return { ok: true, documentId, path: `${STUDENT_PROGRESS_COLLECTION}/${documentId}`, uid: user.uid };
  } catch (error) {
    return { ok: false, message: firebaseErrorMessage(error), code: error?.code ?? 'firebase/unavailable' };
  }
}
