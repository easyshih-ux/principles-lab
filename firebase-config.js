// Paste the exact Firebase Web App config values from Firebase Console here.
// Keep Analytics and measurementId out of this project.
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyDbRb_U5vdRuFTp9-XuntZiZawU_IJ8Sxg',
  authDomain: 'principles-lab.firebaseapp.com',
  projectId: 'principles-lab',
  storageBucket: 'principles-lab.firebasestorage.app',
  messagingSenderId: '614428396479',
  appId: '1:614428396479:web:8a6b52079b39b0df6bef0a'
});

const REQUIRED_FIREBASE_CONFIG_KEYS = Object.freeze([
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
]);

export function isFirebaseConfigured(config = firebaseConfig) {
  return REQUIRED_FIREBASE_CONFIG_KEYS.every((key) => typeof config?.[key] === 'string' && config[key].trim() !== '');
}
