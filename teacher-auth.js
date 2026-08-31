import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { FirebaseUnavailableError } from './firebase-client.js';

const FIREBASE_SDK_VERSION = '12.18.0';
export const TEACHER_FIREBASE_APP_NAME = 'teacher';
let teacherClientPromise = null;

function firebaseModule(service) {
  return `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-${service}.js`;
}

export async function createTeacherFirebaseClient(appSdk, authSdk, firestoreSdk) {
  const firebaseApp = appSdk.initializeApp(firebaseConfig, TEACHER_FIREBASE_APP_NAME);
  const auth = authSdk.getAuth(firebaseApp);
  const db = firestoreSdk.getFirestore(firebaseApp);
  await authSdk.setPersistence(auth, authSdk.inMemoryPersistence);
  const googleProvider = new authSdk.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return {
    firebaseApp,
    auth,
    db,
    googleProvider,
    signInWithPopup: authSdk.signInWithPopup,
    signOut: authSdk.signOut,
    onAuthStateChanged: authSdk.onAuthStateChanged,
    collection: firestoreSdk.collection,
    query: firestoreSdk.query,
    where: firestoreSdk.where,
    getDocs: firestoreSdk.getDocs,
    limit: firestoreSdk.limit,
    getCountFromServer: firestoreSdk.getCountFromServer
  };
}

export async function getTeacherFirebaseClient() {
  if (!isFirebaseConfigured()) {
    throw new FirebaseUnavailableError('Firebase 尚未設定。', 'firebase/not-configured');
  }
  if (!teacherClientPromise) {
    teacherClientPromise = Promise.all([
      import(firebaseModule('app')),
      import(firebaseModule('auth')),
      import(firebaseModule('firestore'))
    ]).then(([appSdk, authSdk, firestoreSdk]) => createTeacherFirebaseClient(appSdk, authSdk, firestoreSdk))
      .catch((error) => {
        teacherClientPromise = null;
        throw error;
      });
  }
  return teacherClientPromise;
}

export function signInTeacherWithGoogle(client) {
  return client.signInWithPopup(client.auth, client.googleProvider);
}

export function signOutTeacher(client) {
  return client.signOut(client.auth);
}

export async function verifyTeacherAuthorization(client) {
  const progress = client.collection(client.db, 'studentProgress');
  const probe = client.query(progress, client.limit(1));
  try {
    await client.getCountFromServer(probe);
    return true;
  } catch (error) {
    if (error?.code === 'permission-denied') return false;
    throw error;
  }
}

export function teacherAuthErrorMessage(error) {
  if (error?.code === 'auth/popup-closed-by-user') return '登入視窗已關閉，尚未完成登入。';
  if (error?.code === 'auth/popup-blocked') return '瀏覽器阻擋了登入視窗，請允許彈出式視窗後再試一次。';
  if (error?.code === 'auth/unauthorized-domain') return '此網站網域尚未加入 Firebase Authentication 授權網域。';
  if (error?.code === 'auth/operation-not-allowed') return 'Firebase Google 登入尚未啟用。';
  return 'Google 登入目前無法使用，請稍後再試。';
}
