import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_SDK_VERSION = '12.18.0';
let clientPromise = null;

export class FirebaseUnavailableError extends Error {
  constructor(message, code = 'firebase/unavailable') {
    super(message);
    this.name = 'FirebaseUnavailableError';
    this.code = code;
  }
}

function firebaseModule(service) {
  return `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-${service}.js`;
}

export function firebaseErrorMessage(error) {
  if (error?.code === 'auth/operation-not-allowed') return 'Firebase Anonymous Authentication 尚未啟用。';
  if (error?.code === 'permission-denied') return 'Firestore 拒絕寫入，請檢查 Security Rules。';
  if (error?.code === 'firebase/not-configured') return 'Firebase 尚未設定。';
  return 'Firebase 暫時無法使用，雲端測試紀錄尚未寫入。';
}

export async function getFirebaseClient() {
  if (!isFirebaseConfigured()) {
    throw new FirebaseUnavailableError('Firebase 尚未設定。', 'firebase/not-configured');
  }
  if (!clientPromise) {
    clientPromise = Promise.all([
      import(firebaseModule('app')),
      import(firebaseModule('auth')),
      import(firebaseModule('firestore'))
    ]).then(([appSdk, authSdk, firestoreSdk]) => {
      const firebaseApp = appSdk.initializeApp(firebaseConfig);
      return {
        auth: authSdk.getAuth(firebaseApp),
        db: firestoreSdk.getFirestore(firebaseApp),
        signInAnonymously: authSdk.signInAnonymously,
        doc: firestoreSdk.doc,
        collection: firestoreSdk.collection,
        query: firestoreSdk.query,
        where: firestoreSdk.where,
        getDocs: firestoreSdk.getDocs,
        getDoc: firestoreSdk.getDoc,
        setDoc: firestoreSdk.setDoc,
        serverTimestamp: firestoreSdk.serverTimestamp,
        runTransaction: firestoreSdk.runTransaction
      };
    }).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function ensureAnonymousAuth(client) {
  if (client.auth.currentUser) return client.auth.currentUser;
  const credential = await client.signInAnonymously(client.auth);
  return credential.user;
}
