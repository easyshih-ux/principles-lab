export const TEACHER_APPLICATIONS_COLLECTION = 'teacherApplications';
export const TEACHERS_COLLECTION = 'teachers';
export const TEACHER_REVIEW_HISTORY_COLLECTION = 'teacherReviewHistory';
export const ADMIN_PROTECTION_PROBES_COLLECTION = 'adminProtectionProbes';

const APPLICATION_STATUSES = new Set(['pending', 'approved', 'rejected', 'revoked']);
const REVIEW_ACTIONS = new Set(['approved', 'rejected', 'revoked']);

function applicationRef(client, uid) {
  return client.doc(client.db, TEACHER_APPLICATIONS_COLLECTION, uid);
}

function teacherRef(client, uid) {
  return client.doc(client.db, TEACHERS_COLLECTION, uid);
}

function reviewRef(client, eventId) {
  return client.doc(client.db, TEACHER_REVIEW_HISTORY_COLLECTION, eventId);
}

function adminProtectionProbeRef(client, uid) {
  return client.doc(client.db, ADMIN_PROTECTION_PROBES_COLLECTION, uid);
}

function timestampValue(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return value instanceof Date ? value : null;
}

export function normalizeTeacherApplication(data, fallbackUid = '') {
  if (!data) return null;
  const uid = String(data.uid ?? fallbackUid).trim();
  const status = String(data.status ?? '');
  if (!uid || !APPLICATION_STATUSES.has(status)) return null;
  return {
    uid,
    displayName: String(data.displayName ?? ''),
    email: String(data.email ?? ''),
    status,
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
    reviewedAt: timestampValue(data.reviewedAt),
    reviewedBy: String(data.reviewedBy ?? ''),
    lastReviewId: String(data.lastReviewId ?? '')
  };
}

export function teacherApplicationData(user, timestamp) {
  const uid = String(user?.uid ?? '').trim();
  const displayName = String(user?.displayName ?? '').trim();
  const email = String(user?.email ?? '').trim();
  if (!uid || !displayName || !email) throw new TypeError('Google 帳號缺少申請所需的姓名或 Email。');
  return { uid, displayName, email, status: 'pending', createdAt: timestamp, updatedAt: timestamp };
}

export async function loadTeacherApplication(client, uid) {
  if (!uid) return null;
  const snapshot = await client.getDoc(applicationRef(client, uid));
  return snapshot.exists() ? normalizeTeacherApplication(snapshot.data(), uid) : null;
}

export async function submitTeacherApplication(client, user) {
  const reference = applicationRef(client, user?.uid);
  let created = false;
  await client.runTransaction(client.db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists()) return;
    transaction.set(reference, teacherApplicationData(user, client.serverTimestamp()));
    created = true;
  });
  return { created, application: await loadTeacherApplication(client, user?.uid) };
}

export async function verifyAdminAuthorization(client) {
  const applications = client.collection(client.db, TEACHER_APPLICATIONS_COLLECTION);
  const probe = client.query(applications, client.limit(1));
  try {
    await client.getCountFromServer(probe);
    return true;
  } catch (error) {
    if (error?.code === 'permission-denied') return false;
    throw error;
  }
}

export async function isProtectedAdminTarget(client, uid) {
  const targetUid = String(uid ?? '').trim();
  if (!targetUid) return false;
  try {
    const snapshot = await client.getDoc(adminProtectionProbeRef(client, targetUid));
    if (snapshot.exists()) throw new TypeError('管理員保護查詢狀態不正確。');
    return true;
  } catch (error) {
    if (error?.code === 'permission-denied') return false;
    throw error;
  }
}

function snapshotRows(snapshot) {
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
}

export async function loadTeacherReviewData(client) {
  const [applicationSnapshot, teacherSnapshot] = await Promise.all([
    client.getDocs(client.collection(client.db, TEACHER_APPLICATIONS_COLLECTION)),
    client.getDocs(client.collection(client.db, TEACHERS_COLLECTION))
  ]);
  const applications = snapshotRows(applicationSnapshot)
    .map((item) => normalizeTeacherApplication(item, item.id))
    .filter(Boolean);
  const applicationByUid = new Map(applications.map((item) => [item.uid, item]));
  const pending = applications.filter(({ status }) => status === 'pending')
    .sort((left, right) => (left.createdAt?.getTime?.() ?? 0) - (right.createdAt?.getTime?.() ?? 0));
  const teacherRows = snapshotRows(teacherSnapshot)
    .filter((item) => item.active === true)
    .map((item) => {
      const application = applicationByUid.get(item.id);
      return {
        uid: item.id,
        displayName: String(item.displayName ?? application?.displayName ?? ''),
        email: String(item.email ?? application?.email ?? ''),
        approvedAt: timestampValue(item.approvedAt) ?? application?.reviewedAt ?? null,
        hasApplication: Boolean(application)
      };
    });
  const teachers = await Promise.all(teacherRows.map(async (item) => ({
    ...item,
    isAdmin: await isProtectedAdminTarget(client, item.uid)
  })));
  teachers.sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-Hant') || left.uid.localeCompare(right.uid));
  return { pending, teachers };
}

export function createReviewEventId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `review-${Date.now().toString(36)}-${random}`;
}

export async function reviewTeacherAccess(client, { targetUid, action, eventId = createReviewEventId() }) {
  const uid = String(targetUid ?? '').trim();
  if (!uid || !REVIEW_ACTIONS.has(action)) throw new TypeError('審核操作格式不正確。');
  const reviewerUid = String(client.auth?.currentUser?.uid ?? '').trim();
  if (!reviewerUid) throw new TypeError('管理員尚未登入。');
  if (action === 'revoked' && await isProtectedAdminTarget(client, uid)) {
    throw new TypeError('系統管理員的教師權限不能透過審核功能撤銷。');
  }

  const applicationReference = applicationRef(client, uid);
  const teacherReference = teacherRef(client, uid);
  const historyReference = reviewRef(client, eventId);
  await client.runTransaction(client.db, async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationReference);
    const teacherSnapshot = await transaction.get(teacherReference);
    const historySnapshot = await transaction.get(historyReference);
    if (historySnapshot.exists()) throw new TypeError('審核事件已存在，請重新操作。');

    const application = applicationSnapshot.exists() ? applicationSnapshot.data() : null;
    const teacher = teacherSnapshot.exists() ? teacherSnapshot.data() : null;
    const timestamp = client.serverTimestamp();

    if (action === 'approved' || action === 'rejected') {
      if (!application || application.status !== 'pending') throw new TypeError('此申請已處理或不存在。');
      transaction.update(applicationReference, {
        status: action,
        updatedAt: timestamp,
        reviewedAt: timestamp,
        reviewedBy: reviewerUid,
        lastReviewId: eventId
      });
      if (action === 'approved') {
        transaction.set(teacherReference, {
          active: true,
          displayName: application.displayName,
          email: application.email,
          approvedAt: timestamp,
          approvedBy: reviewerUid,
          updatedAt: timestamp,
          lastReviewId: eventId
        }, { merge: true });
      }
      transaction.set(historyReference, {
        targetUid: uid,
        action,
        reviewedBy: reviewerUid,
        reviewedAt: timestamp,
        previousStatus: 'pending',
        nextStatus: action
      });
      return;
    }

    if (!teacher || teacher.active !== true) throw new TypeError('此教師目前未啟用。');
    transaction.update(teacherReference, {
      active: false,
      revokedAt: timestamp,
      revokedBy: reviewerUid,
      updatedAt: timestamp,
      lastReviewId: eventId
    });
    if (application) {
      transaction.update(applicationReference, {
        status: 'revoked',
        updatedAt: timestamp,
        reviewedAt: timestamp,
        reviewedBy: reviewerUid,
        lastReviewId: eventId
      });
    } else {
      transaction.set(applicationReference, {
        uid,
        displayName: String(teacher.displayName ?? ''),
        email: String(teacher.email ?? ''),
        status: 'revoked',
        createdAt: timestamp,
        updatedAt: timestamp,
        reviewedAt: timestamp,
        reviewedBy: reviewerUid,
        lastReviewId: eventId
      });
    }
    transaction.set(historyReference, {
      targetUid: uid,
      action: 'revoked',
      reviewedBy: reviewerUid,
      reviewedAt: timestamp,
      previousStatus: application?.status ?? 'teacher-only',
      nextStatus: 'revoked'
    });
  });
  return { targetUid: uid, action, eventId };
}
