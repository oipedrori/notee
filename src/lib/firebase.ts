/**
 * Firebase client SDK initialization.
 * Lazily initializes on the client side only to prevent SSR errors.
 * DO NOT import this in Server Components or API routes — use firebase-admin.ts instead.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Prevent duplicate initialization in dev (HMR) and during SSR prerender.
// Firebase Auth & Firestore will fail gracefully if called server-side
// because "use client" components only actually execute in the browser.
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Lazy singletons — only created the first time they're accessed (in the browser)
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getClientStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp());
  return _storage;
}

export const googleProvider = new GoogleAuthProvider();
