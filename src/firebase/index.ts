'use client';

// This file is the single source of truth for all Firebase-related exports.
// It initializes Firebase and re-exports all the necessary hooks and providers.
// This ensures a consistent and clean way to access Firebase functionality
// throughout the application, e.g., `import { useUser } from '@/firebase'`.

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Re-export hooks and providers for easy access from a single point.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

// Define the shape of the object that `initializeFirebase` will return.
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

/**
 * Initializes the Firebase application and its services.
 * It ensures that Firebase is initialized only once (singleton pattern).
 * @returns An object containing the initialized Firebase App, Auth, and Firestore instances.
 */
export function initializeFirebase(): FirebaseServices {
  // Check if a Firebase app has already been initialized. If not, initialize it.
  // This prevents re-initialization errors on hot reloads or during client-side navigation.
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}
