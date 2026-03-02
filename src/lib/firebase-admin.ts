/**
 * Firebase Admin SDK — server-side only (API routes).
 * Uses Application Default Credentials via FIREBASE_SERVICE_ACCOUNT env var.
 *
 * SETUP: Set FIREBASE_SERVICE_ACCOUNT to the JSON string of your service account key
 * (Firebase Console > Project Settings > Service Accounts > Generate New Private Key)
 * Then minify + paste the JSON as the env var value (no newlines).
 */
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
    if (adminApp) return adminApp;
    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT env var is not set. " +
            "Set it to your Firebase service account JSON (minified, no line breaks)."
        );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
}

export function getAdminDb(): Firestore {
    if (adminDb) return adminDb;
    adminDb = getFirestore(getAdminApp());
    return adminDb;
}
