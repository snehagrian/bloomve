import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;

function validateFirebaseConfig() {
  const requiredKeys: Array<keyof typeof firebaseConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ];

  const hasMissingValue = requiredKeys.some((key) => !firebaseConfig[key]);

  if (hasMissingValue) {
    throw new Error("Missing Firebase web config values in .env.local.");
  }
}

export function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  validateFirebaseConfig();
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
}

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

export function getClientDb() {
  return getFirestore(getFirebaseApp());
}

export function getClientStorage() {
  return getStorage(getFirebaseApp());
}
