import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

console.log("Firebase project:", firebaseConfig.projectId);

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Firestore persistence (only in browser)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn(
        "Multiple tabs open, persistence can only be enabled in one tab at a time."
      );
    } else if (err.code === "unimplemented") {
      console.warn("Current browser does not support persistence.");
    } else {
      console.error("Firestore persistence error:", err);
    }
  });
}

// Analytics (only if supported and not in dev)
(async () => {
  if (env === "production" && typeof window !== 'undefined' && (await analyticsSupported())) {
    getAnalytics(app);
  }
})();

export { auth, db, storage };
