import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "firebase/analytics";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Detect environment
const env = process.env.NODE_ENV; // 'development' | 'production'
console.log(`Initializing Firebase for ${env} environment`);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  // measurementId omitted — let Firebase fetch the correct ID from server
};

console.log("Firebase project:", firebaseConfig.projectId);

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
// Use persistentLocalCache (replaces deprecated enableIndexedDbPersistence)
const db = typeof window !== 'undefined'
  ? initializeFirestore(app, { localCache: persistentLocalCache() })
  : initializeFirestore(app, {});
const storage = getStorage(app);

// Analytics (only if supported and not in dev)
(async () => {
  if (env === "production" && typeof window !== 'undefined' && (await analyticsSupported())) {
    getAnalytics(app);
  }
})();

export { auth, db, storage };
