import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Singleton Pattern: Initialize Firebase App exactly once outside the React component tree
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Singleton Auth instance initialized once
export const auth = getAuth(app);

// Singleton Firestore instance targeting the configured database ID
export const db = getFirestore(
  app,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId
);

export { firebaseConfig };
export default { app, auth, db, firebaseConfig };
