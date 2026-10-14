import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getAnalytics,
  isSupported as analyticsSupported,
  setAnalyticsCollectionEnabled,
  type Analytics,
} from "firebase/analytics";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  CONSENT_CHANGED_EVENT,
  analyticsAllowed,
  analyticsCookieNames,
  readConsent,
  type ConsentChoice,
} from "./consent";

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

// Analytics — production only, and only after the visitor accepts cookies
// (src/lib/consent.ts). Nothing loads before a choice is made.
let analytics: Analytics | null = null;

function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const name of analyticsCookieNames(document.cookie)) {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

async function applyAnalyticsConsent(allowed: boolean) {
  if (env !== "production" || typeof window === "undefined") return;
  if (allowed) {
    if (!analytics) {
      if (!(await analyticsSupported())) return;
      analytics = getAnalytics(app);
    }
    setAnalyticsCollectionEnabled(analytics, true);
  } else {
    if (analytics) setAnalyticsCollectionEnabled(analytics, false);
    clearAnalyticsCookies();
  }
}

if (typeof window !== "undefined") {
  void applyAnalyticsConsent(analyticsAllowed(readConsent()));
  window.addEventListener(CONSENT_CHANGED_EVENT, (e) => {
    void applyAnalyticsConsent((e as CustomEvent<ConsentChoice>).detail.analytics);
  });
}

export { auth, db, storage };
