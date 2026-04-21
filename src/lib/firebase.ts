import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isConfigValid = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const app = !getApps().length && isConfigValid ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);
const db = app ? getFirestore(app) : (null as any);
const storage = app ? getStorage(app) : (null as any);
const auth = app ? getAuth(app) : (null as any);

// Attempt anonymous sign-in to satisfy "auth != null" security rules
if (typeof window !== "undefined" && auth) {
  signInAnonymously(auth).catch(err => console.log("Auth wait:", err.message));
}

export const waitForAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        resolve(user);
        unsubscribe();
      }
    });
    // Timeout after 3 seconds if no auth
    setTimeout(() => {
      resolve(null);
      unsubscribe();
    }, 3000);
  });
};

export { app, db, storage, auth };
