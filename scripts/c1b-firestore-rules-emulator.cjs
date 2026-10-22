const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} = require('firebase/firestore');

const projectId = 'demo-principles-lab-c1b';
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

function context(env, uid, provider, claims = {}) {
  return env.authenticatedContext(uid, {
    firebase: { sign_in_provider: provider, identities: {} },
    ...claims
  }).firestore();
}

async function decideApplication(db, targetUid, action, eventId, reviewerUid = 'owner-admin') {
  return runTransaction(db, async (transaction) => {
    const applicationRef = doc(db, 'teacherApplications', targetUid);
    const teacherRef = doc(db, 'teachers', targetUid);
    const historyRef = doc(db, 'teacherReviewHistory', eventId);
    const application = await transaction.get(applicationRef);
    await transaction.get(teacherRef);
    await transaction.get(historyRef);
    const data = application.data();
    const timestamp = serverTimestamp();
    transaction.update(applicationRef, {
      status: action, updatedAt: timestamp, reviewedAt: timestamp,
      reviewedBy: reviewerUid, lastReviewId: eventId
    });
    if (action === 'approved') {
      transaction.set(teacherRef, {
        active: true, displayName: data.displayName, email: data.email,
        approvedAt: timestamp, approvedBy: reviewerUid, updatedAt: timestamp,
        lastReviewId: eventId
      }, { merge: true });
    }
    transaction.set(historyRef, {
      targetUid, action, reviewedBy: reviewerUid, reviewedAt: timestamp,
      previousStatus: 'pending', nextStatus: action
    });
  });
}

async function revokeTeacher(db, targetUid, eventId, hasApplication, reviewerUid = 'owner-admin') {
  return runTransaction(db, async (transaction) => {
    const applicationRef = doc(db, 'teacherApplications', targetUid);
    const teacherRef = doc(db, 'teachers', targetUid);
    const historyRef = doc(db, 'teacherReviewHistory', eventId);
    if (hasApplication) await transaction.get(applicationRef);
    await transaction.get(teacherRef);
    await transaction.get(historyRef);
    const timestamp = serverTimestamp();
    transaction.update(teacherRef, {
      active: false, revokedAt: timestamp, revokedBy: reviewerUid,
      updatedAt: timestamp, lastReviewId: eventId
    });
    if (hasApplication) {
      transaction.update(applicationRef, {
        status: 'revoked', updatedAt: timestamp, reviewedAt: timestamp,
        reviewedBy: reviewerUid, lastReviewId: eventId
      });
    } else {
      transaction.set(applicationRef, {
        uid: targetUid, displayName: '', email: '', status: 'revoked',
        createdAt: timestamp, updatedAt: timestamp, reviewedAt: timestamp,
        reviewedBy: reviewerUid, lastReviewId: eventId
      });
    }
    transaction.set(historyRef, {
      targetUid, action: 'revoked', reviewedBy: reviewerUid, reviewedAt: timestamp,
      previousStatus: hasApplication ? 'approved' : 'teacher-only', nextStatus: 'revoked'
    });
  });
}

async function assertProtectedAdminRevocationBlocked(db, targetUid, eventId, hasApplication, reviewerUid) {
  await assertFails(revokeTeacher(db, targetUid, eventId, hasApplication, reviewerUid));
  const teacher = await getDoc(doc(db, 'teachers', targetUid));
  const application = await getDoc(doc(db, 'teacherApplications', targetUid));
  const history = await getDoc(doc(db, 'teacherReviewHistory', eventId));
  if (teacher.data().active !== true
    || (hasApplication ? application.data().status !== 'approved' : application.exists())
    || history.exists()) {
    throw new Error(`protected admin revocation left partial writes for ${eventId}`);
  }
}

async function checkpointCreate(db, studentKey = '115-701-12', academicYear = '115') {
  return setDoc(doc(db, 'studentProgress', studentKey), {
    academicYear,
    classId: '701',
    seatNo: 12,
    studentKey,
    level1Complete: true,
    updatedAt: serverTimestamp()
  });
}

(async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: { rules } });
  try {
    await env.withSecurityRulesDisabled(async (bypass) => {
      const db = bypass.firestore();
      await setDoc(doc(db, 'teachers', 'teacher-active'), { active: true });
      await setDoc(doc(db, 'teachers', 'teacher-disabled'), { active: false });
      await setDoc(doc(db, 'teachers', 'legacy-teacher'), { active: true });
      await setDoc(doc(db, 'teachers', 'owner-admin'), { active: true });
      await setDoc(doc(db, 'teachers', 'admin-b'), { active: true });
      await setDoc(doc(db, 'teachers', 'former-admin'), { active: true });
      await setDoc(doc(db, 'admins', 'owner-admin'), { active: true });
      await setDoc(doc(db, 'admins', 'admin-b'), { active: true });
      await setDoc(doc(db, 'admins', 'former-admin'), { active: false });
      await setDoc(doc(db, 'studentProgress', '115-701-1'), {
        academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true, updatedAt: new Date()
      });
    });

    const anonymous = context(env, 'anonymous-student', 'anonymous');
    const teacher = context(env, 'teacher-active', 'google.com');
    const unauthorized = context(env, 'google-unauthorized', 'google.com');
    const disabled = context(env, 'teacher-disabled', 'google.com');
    const admin = context(env, 'owner-admin', 'google.com', { name: '系統擁有者', email: 'owner@example.test' });
    const adminB = context(env, 'admin-b', 'google.com', { name: '第二管理員', email: 'admin-b@example.test' });
    const applicant = context(env, 'applicant', 'google.com', { name: '申請教師', email: 'applicant@example.test' });
    const applicantB = context(env, 'applicant-b', 'google.com', { name: '第二申請教師', email: 'applicant-b@example.test' });
    const rejectedApplicant = context(env, 'rejected-applicant', 'google.com', { name: '拒絕教師', email: 'rejected@example.test' });
    const forgedEmail = context(env, 'forged-email', 'google.com', { name: '真實姓名', email: 'real@example.test' });
    const forgedName = context(env, 'forged-name', 'google.com', { name: '真實姓名', email: 'name@example.test' });
    const forgedStatus = context(env, 'forged-status', 'google.com', { name: '狀態教師', email: 'status@example.test' });
    const unauthenticated = env.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonymous, 'studentProgress', '115-701-1')));
    await assertFails(getDocs(query(collection(anonymous, 'studentProgress'))));
    await assertSucceeds(getDoc(doc(teacher, 'studentProgress', '115-701-1')));
    await assertSucceeds(getDocs(query(collection(teacher, 'studentProgress'))));
    await assertFails(getDoc(doc(unauthorized, 'studentProgress', '115-701-1')));
    await assertFails(getDocs(query(collection(unauthorized, 'studentProgress'))));
    await assertFails(getDoc(doc(disabled, 'studentProgress', '115-701-1')));
    await assertFails(getDocs(query(collection(disabled, 'studentProgress'))));

    for (const db of [anonymous, teacher, unauthorized, disabled, unauthenticated]) {
      await assertFails(getDoc(doc(db, 'teachers', 'teacher-active')));
      await assertFails(getDocs(query(collection(db, 'teachers'))));
      await assertFails(setDoc(doc(db, 'teachers', 'created-by-client'), { active: true }));
      await assertFails(updateDoc(doc(db, 'teachers', 'teacher-active'), { active: false }));
      await assertFails(deleteDoc(doc(db, 'teachers', 'teacher-active')));
    }

    await assertSucceeds(checkpointCreate(anonymous));
    await assertSucceeds(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      level2Complete: true,
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      unexpectedField: true,
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      classId: '702',
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      level2Complete: false,
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      level1Complete: deleteField(),
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-12'), {
      level3Complete: true,
      updatedAt: new Date()
    }));
    await assertFails(checkpointCreate(anonymous, '115-701-13', '116'));
    await assertFails(checkpointCreate(teacher, '115-701-13'));
    await assertFails(updateDoc(doc(teacher, 'studentProgress', '115-701-1'), {
      level2Complete: true,
      updatedAt: serverTimestamp()
    }));
    await assertFails(checkpointCreate(unauthenticated, '115-701-14'));
    await assertFails(getDoc(doc(unauthenticated, 'studentProgress', '115-701-1')));
    await assertFails(getDocs(query(collection(unauthenticated, 'studentProgress'))));
    await assertFails(deleteDoc(doc(teacher, 'studentProgress', '115-701-1')));

    // 10/22: one free-practice mark per principle, written the way the site writes (setDoc + merge).
    const principleMarks = ['repetition', 'gradation', 'symmetry', 'balance', 'contrast', 'rhythm', 'proportion', 'unity', 'harmony', 'simplicity'].map((id) => `freeReview_${id}`);
    const mark = (db, studentKey, seatNo, fields) => setDoc(doc(db, 'studentProgress', studentKey), {
      academicYear: '115', classId: '701', seatNo, studentKey, ...fields, updatedAt: serverTimestamp()
    }, { merge: true });
    // A new student whose first mark is a principle.
    await assertSucceeds(mark(anonymous, '115-701-20', 20, { freeReview_repetition: true }));
    // More principles, then the four old marks, keep working on the same document.
    for (const key of principleMarks.slice(1)) await assertSucceeds(mark(anonymous, '115-701-20', 20, { [key]: true }));
    for (const key of ['freeReviewComplete', 'level1Complete', 'level2Complete', 'level3Complete']) await assertSucceeds(mark(anonymous, '115-701-20', 20, { [key]: true }));
    // A student who already had old marks can add principle marks.
    await assertSucceeds(mark(anonymous, '115-701-12', 12, { freeReview_gradation: true }));
    // The four old marks still work on a brand-new document.
    for (const [seat, key] of [[21, 'freeReviewComplete'], [22, 'level1Complete'], [23, 'level2Complete'], [24, 'level3Complete']]) {
      await assertSucceeds(mark(anonymous, `115-701-${seat}`, seat, { [key]: true }));
    }
    // Refused: false marks, unknown principle names, removing a mark, other fields, teacher or signed-out writes.
    await assertFails(mark(anonymous, '115-701-25', 25, { freeReview_balance: false }));
    await assertFails(mark(anonymous, '115-701-25', 25, { freeReview_painting: true }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-20'), { freeReview_unity: deleteField(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(anonymous, 'studentProgress', '115-701-20'), { freeReview_unity: false, updatedAt: serverTimestamp() }));
    await assertFails(mark(anonymous, '115-701-25', 25, { freeReview_contrast: true, attempts: 3 }));
    await assertFails(mark(anonymous, '115-701-25', 25, { freeReview_contrast: 'yes' }));
    await assertFails(setDoc(doc(anonymous, 'studentProgress', '115-701-26'), { academicYear: '115', classId: '701', seatNo: 26, studentKey: '115-701-26', freeReview_rhythm: true, updatedAt: new Date() }));
    await assertFails(mark(teacher, '115-701-27', 27, { freeReview_rhythm: true }));
    await assertFails(mark(unauthenticated, '115-701-27', 27, { freeReview_rhythm: true }));
    await assertFails(mark(anonymous, '115-701-27', 99, { freeReview_rhythm: true }));
    // Teachers can read the new marks; students still cannot read progress.
    const withMarks = await getDoc(doc(teacher, 'studentProgress', '115-701-20'));
    if (!principleMarks.every((key) => withMarks.data()[key] === true)) throw new Error('teacher could not read all principle marks');
    await assertFails(getDoc(doc(anonymous, 'studentProgress', '115-701-20')));

    const classConfig = {
      academicYear: '115', classId: '716', active: true,
      validSeatNumbers: [1, 2, 3, 4], updatedAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(teacher, 'classConfigs', '115-716'), classConfig));
    await assertSucceeds(updateDoc(doc(teacher, 'classConfigs', '115-716'), {
      active: false, validSeatNumbers: [1, 2, 4], updatedAt: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(anonymous, 'classConfigs', '115-716')));
    await assertSucceeds(getDocs(query(collection(anonymous, 'classConfigs'))));
    await assertSucceeds(getDoc(doc(teacher, 'classConfigs', '115-716')));
    await assertFails(setDoc(doc(anonymous, 'classConfigs', '115-717'), { ...classConfig, classId: '717' }));
    await assertFails(setDoc(doc(unauthorized, 'classConfigs', '115-717'), { ...classConfig, classId: '717' }));
    await assertFails(setDoc(doc(teacher, 'classConfigs', '115-999'), classConfig));
    await assertFails(setDoc(doc(teacher, 'classConfigs', '115-717'), { ...classConfig, classId: '717', academicYear: '116' }));
    await assertFails(setDoc(doc(teacher, 'classConfigs', '115-717'), { ...classConfig, classId: '717', studentCount: 4 }));
    await assertFails(deleteDoc(doc(teacher, 'classConfigs', '115-716')));
    await assertFails(getDoc(doc(unauthorized, 'classConfigs', '115-716')));

    const academicYear = {
      academicYear: '115', status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(teacher, 'academicYears', '115'), academicYear));
    await assertSucceeds(updateDoc(doc(teacher, 'academicYears', '115'), { status: 'archived', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(teacher, 'academicYears', '115'), { status: 'active', updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(teacher, 'academicYears', '115')));
    await assertSucceeds(getDocs(query(collection(teacher, 'academicYears'))));
    await assertFails(getDoc(doc(anonymous, 'academicYears', '115')));
    await assertFails(setDoc(doc(anonymous, 'academicYears', '116'), { ...academicYear, academicYear: '116', status: 'archived' }));
    await assertFails(setDoc(doc(unauthorized, 'academicYears', '116'), { ...academicYear, academicYear: '116', status: 'archived' }));
    await assertFails(setDoc(doc(teacher, 'academicYears', '116'), { ...academicYear, academicYear: '117', status: 'archived' }));
    await assertFails(setDoc(doc(teacher, 'academicYears', 'bad'), { ...academicYear, academicYear: 'bad', status: 'archived' }));
    await assertFails(setDoc(doc(teacher, 'academicYears', '116'), { ...academicYear, academicYear: '116', status: 'draft' }));
    await assertFails(setDoc(doc(teacher, 'academicYears', '116'), { ...academicYear, academicYear: '116', status: 'archived', extra: true }));
    await assertFails(deleteDoc(doc(teacher, 'academicYears', '115')));

    const settings = { activeAcademicYear: '115', updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(teacher, 'appSettings', 'academicYear'), settings));
    await assertSucceeds(getDoc(doc(anonymous, 'appSettings', 'academicYear')));
    await assertSucceeds(getDoc(doc(teacher, 'appSettings', 'academicYear')));
    await assertFails(setDoc(doc(anonymous, 'appSettings', 'academicYear'), settings));
    await assertFails(setDoc(doc(unauthorized, 'appSettings', 'academicYear'), settings));
    await assertFails(setDoc(doc(teacher, 'appSettings', 'academicYear'), { ...settings, extra: true }));
    await assertFails(setDoc(doc(teacher, 'appSettings', 'academicYear'), { activeAcademicYear: 'bad', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(teacher, 'appSettings', 'academicYear'), { activeAcademicYear: '116', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(teacher, 'appSettings', 'academicYear')));
    await assertFails(setDoc(doc(teacher, 'unknownCollection', 'blocked'), { active: true }));

    const pendingApplication = {
      uid: 'applicant', displayName: '申請教師', email: 'applicant@example.test',
      status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    await assertSucceeds(setDoc(doc(applicant, 'teacherApplications', 'applicant'), pendingApplication));
    await assertSucceeds(getDoc(doc(applicant, 'teacherApplications', 'applicant')));
    await assertFails(getDocs(query(collection(applicant, 'teacherApplications'))));
    await assertFails(getDoc(doc(applicant, 'teacherApplications', 'rejected-applicant')));
    await assertFails(setDoc(doc(applicant, 'teacherApplications', 'other-user'), { ...pendingApplication, uid: 'other-user' }));
    await assertFails(setDoc(doc(forgedEmail, 'teacherApplications', 'forged-email'), { ...pendingApplication, uid: 'forged-email', displayName: '真實姓名', email: 'forged@example.test' }));
    await assertFails(setDoc(doc(forgedName, 'teacherApplications', 'forged-name'), { ...pendingApplication, uid: 'forged-name', displayName: '偽造姓名', email: 'name@example.test' }));
    await assertFails(setDoc(doc(forgedStatus, 'teacherApplications', 'forged-status'), { ...pendingApplication, uid: 'forged-status', displayName: '狀態教師', email: 'status@example.test', status: 'approved' }));
    await assertFails(setDoc(doc(anonymous, 'teacherApplications', 'anonymous-student'), { ...pendingApplication, uid: 'anonymous-student' }));
    await assertFails(setDoc(doc(unauthenticated, 'teacherApplications', 'no-auth'), { ...pendingApplication, uid: 'no-auth' }));
    await assertFails(updateDoc(doc(applicant, 'teacherApplications', 'applicant'), { status: 'approved' }));
    await assertFails(setDoc(doc(applicant, 'teachers', 'applicant'), { active: true }));
    await assertFails(setDoc(doc(teacher, 'teachers', 'teacher-created'), { active: true }));
    await assertFails(getDocs(query(collection(teacher, 'teacherApplications'))));
    await assertFails(setDoc(doc(teacher, 'admins', 'teacher-active'), { active: true }));
    await assertFails(getDoc(doc(admin, 'admins', 'owner-admin')));
    await assertFails(getDoc(doc(adminB, 'admins', 'admin-b')));
    await assertFails(setDoc(doc(admin, 'admins', 'second-admin'), { active: true }));
    await assertSucceeds(getDocs(query(collection(admin, 'teacherApplications'))));
    await assertSucceeds(getDocs(query(collection(admin, 'teachers'))));
    await assertSucceeds(getDocs(query(collection(adminB, 'teacherApplications'))));
    await assertSucceeds(getDocs(query(collection(adminB, 'teachers'))));
    await assertSucceeds(getDoc(doc(admin, 'studentProgress', '115-701-1')));
    await assertSucceeds(getDoc(doc(adminB, 'studentProgress', '115-701-1')));

    const adminAProbe = await assertSucceeds(getDoc(doc(admin, 'adminProtectionProbes', 'owner-admin')));
    const adminBProbe = await assertSucceeds(getDoc(doc(admin, 'adminProtectionProbes', 'admin-b')));
    if (adminAProbe.exists() || adminBProbe.exists()) throw new Error('admin protection probes must not expose documents');
    await assertFails(getDoc(doc(admin, 'adminProtectionProbes', 'teacher-active')));
    await assertFails(getDoc(doc(admin, 'adminProtectionProbes', 'former-admin')));
    await assertFails(getDoc(doc(teacher, 'adminProtectionProbes', 'owner-admin')));
    await assertFails(getDocs(query(collection(admin, 'adminProtectionProbes'))));
    await assertFails(setDoc(doc(admin, 'adminProtectionProbes', 'owner-admin'), { active: true }));

    await assertProtectedAdminRevocationBlocked(admin, 'owner-admin', 'legacy-a-self-revoke-001', false, 'owner-admin');
    await assertProtectedAdminRevocationBlocked(admin, 'admin-b', 'legacy-a-cross-revoke-001', false, 'owner-admin');
    await assertProtectedAdminRevocationBlocked(adminB, 'owner-admin', 'legacy-b-cross-revoke-001', false, 'admin-b');
    await assertProtectedAdminRevocationBlocked(adminB, 'admin-b', 'legacy-b-self-revoke-001', false, 'admin-b');

    await env.withSecurityRulesDisabled(async (bypass) => {
      const db = bypass.firestore();
      await setDoc(doc(db, 'teacherApplications', 'owner-admin'), {
        uid: 'owner-admin', displayName: '系統擁有者', email: 'owner@example.test',
        status: 'approved', createdAt: new Date(), updatedAt: new Date(), reviewedAt: new Date(),
        reviewedBy: 'owner-admin', lastReviewId: 'owner-existing-approval'
      });
      await setDoc(doc(db, 'teacherApplications', 'admin-b'), {
        uid: 'admin-b', displayName: '第二管理員', email: 'admin-b@example.test',
        status: 'approved', createdAt: new Date(), updatedAt: new Date(), reviewedAt: new Date(),
        reviewedBy: 'owner-admin', lastReviewId: 'admin-b-existing-approval'
      });
    });
    await assertProtectedAdminRevocationBlocked(admin, 'owner-admin', 'a-self-revoke-001', true, 'owner-admin');
    await assertProtectedAdminRevocationBlocked(admin, 'admin-b', 'a-cross-revoke-001', true, 'owner-admin');
    await assertProtectedAdminRevocationBlocked(adminB, 'owner-admin', 'b-cross-revoke-001', true, 'admin-b');
    await assertProtectedAdminRevocationBlocked(adminB, 'admin-b', 'b-self-revoke-001', true, 'admin-b');

    await assertFails(updateDoc(doc(admin, 'teacherApplications', 'applicant'), {
      status: 'approved', updatedAt: serverTimestamp(), reviewedAt: serverTimestamp(),
      reviewedBy: 'owner-admin', lastReviewId: 'partial-approval-001'
    }));
    await assertFails(setDoc(doc(admin, 'teacherReviewHistory', 'orphan-review-001'), {
      targetUid: 'applicant', action: 'approved', reviewedBy: 'owner-admin', reviewedAt: serverTimestamp(),
      previousStatus: 'pending', nextStatus: 'approved'
    }));
    await assertFails(decideApplication(teacher, 'applicant', 'approved', 'teacher-illegal-review-001', 'teacher-active'));
    await assertFails(decideApplication(applicant, 'applicant', 'approved', 'self-illegal-review-001', 'applicant'));
    await assertSucceeds(decideApplication(admin, 'applicant', 'approved', 'approved-review-001'));
    await assertSucceeds(getDoc(doc(applicant, 'studentProgress', '115-701-1')));
    await assertFails(decideApplication(admin, 'applicant', 'approved', 'duplicate-review-001'));
    await assertSucceeds(getDoc(doc(admin, 'teacherReviewHistory', 'approved-review-001')));
    await assertFails(getDoc(doc(teacher, 'teacherReviewHistory', 'approved-review-001')));

    await assertSucceeds(setDoc(doc(applicantB, 'teacherApplications', 'applicant-b'), {
      uid: 'applicant-b', displayName: '第二申請教師', email: 'applicant-b@example.test',
      status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }));
    await assertSucceeds(decideApplication(adminB, 'applicant-b', 'approved', 'admin-b-approved-review-001', 'admin-b'));
    await assertSucceeds(getDoc(doc(applicantB, 'studentProgress', '115-701-1')));

    await env.withSecurityRulesDisabled(async (bypass) => {
      const db = bypass.firestore();
      const applicantAdmin = await getDoc(doc(db, 'admins', 'applicant'));
      const applicantBAdmin = await getDoc(doc(db, 'admins', 'applicant-b'));
      if (applicantAdmin.exists() || applicantBAdmin.exists()) throw new Error('teacher approval created an admin document');
    });

    await assertSucceeds(setDoc(doc(rejectedApplicant, 'teacherApplications', 'rejected-applicant'), {
      uid: 'rejected-applicant', displayName: '拒絕教師', email: 'rejected@example.test',
      status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }));
    await assertSucceeds(decideApplication(admin, 'rejected-applicant', 'rejected', 'rejected-review-001'));
    await assertFails(getDoc(doc(rejectedApplicant, 'studentProgress', '115-701-1')));

    await assertSucceeds(revokeTeacher(admin, 'applicant', 'revoked-review-001', true));
    await assertFails(getDoc(doc(applicant, 'studentProgress', '115-701-1')));
    await assertSucceeds(revokeTeacher(adminB, 'applicant-b', 'admin-b-revoked-review-001', true, 'admin-b'));
    await assertFails(getDoc(doc(applicantB, 'studentProgress', '115-701-1')));
    await assertSucceeds(revokeTeacher(admin, 'legacy-teacher', 'legacy-revoked-001', false));
    const legacyApplication = await getDoc(doc(admin, 'teacherApplications', 'legacy-teacher'));
    if (!legacyApplication.exists() || legacyApplication.data().status !== 'revoked') throw new Error('legacy revocation did not preserve revoked status');
    await assertSucceeds(revokeTeacher(admin, 'former-admin', 'inactive-admin-revoked-001', false));

    const partialTarget = context(env, 'partial-target', 'google.com', { name: '部分失敗', email: 'partial@example.test' });
    await assertSucceeds(setDoc(doc(partialTarget, 'teacherApplications', 'partial-target'), {
      uid: 'partial-target', displayName: '部分失敗', email: 'partial@example.test',
      status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }));
    await assertFails(runTransaction(admin, async (transaction) => {
      const appRef = doc(admin, 'teacherApplications', 'partial-target');
      const teacherRef = doc(admin, 'teachers', 'partial-target');
      await transaction.get(appRef); await transaction.get(teacherRef);
      transaction.update(appRef, {
        status: 'approved', updatedAt: serverTimestamp(), reviewedAt: serverTimestamp(),
        reviewedBy: 'owner-admin', lastReviewId: 'missing-history-001'
      });
      transaction.set(teacherRef, {
        active: true, displayName: '部分失敗', email: 'partial@example.test',
        approvedAt: serverTimestamp(), approvedBy: 'owner-admin', updatedAt: serverTimestamp(),
        lastReviewId: 'missing-history-001'
      });
    }));
    const partialApplication = await getDoc(doc(admin, 'teacherApplications', 'partial-target'));
    const partialTeacher = await getDoc(doc(admin, 'teachers', 'partial-target'));
    if (partialApplication.data().status !== 'pending' || partialTeacher.exists()) throw new Error('failed transaction left partial writes');

    console.log('Firestore Rules Emulator: all C1-B, D3, Gate 2, Gate 4B-2 and 10/22 free-practice principle allow/deny cases passed');
  } finally {
    await env.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
