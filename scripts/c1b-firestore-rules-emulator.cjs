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
  serverTimestamp,
  setDoc,
  updateDoc
} = require('firebase/firestore');

const projectId = 'demo-principles-lab-c1b';
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

function context(env, uid, provider) {
  return env.authenticatedContext(uid, {
    firebase: { sign_in_provider: provider, identities: {} }
  }).firestore();
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
      await setDoc(doc(db, 'studentProgress', '115-701-1'), {
        academicYear: '115', classId: '701', seatNo: 1, studentKey: '115-701-1', level1Complete: true, updatedAt: new Date()
      });
    });

    const anonymous = context(env, 'anonymous-student', 'anonymous');
    const teacher = context(env, 'teacher-active', 'google.com');
    const unauthorized = context(env, 'google-unauthorized', 'google.com');
    const disabled = context(env, 'teacher-disabled', 'google.com');
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
    await assertFails(setDoc(doc(teacher, 'unknownCollection', 'blocked'), { active: true }));

    console.log('Firestore Rules Emulator: all C1-B allow/deny cases passed');
  } finally {
    await env.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
