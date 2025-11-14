'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Initialize Firebase only if it hasn't been initialized yet
if (!getApps().length) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
        console.warn('Automatic Firebase initialization failed, falling back to config object.');
    }
    firebaseApp = initializeApp(firebaseConfig);
  }
} else {
  firebaseApp = getApp();
}

auth = getAuth(firebaseApp);
firestore = getFirestore(firebaseApp);

// Enable Firestore offline persistence
enableIndexedDbPersistence(firestore)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistencia de Firestore falló: múltiples pestañas abiertas. Los datos no se guardarán offline.');
    } else if (err.code == 'unimplemented') {
      console.warn('Persistencia de Firestore no es soportada en este navegador. Los datos no se guardarán offline.');
    }
  });


export { firebaseApp, auth, firestore };

// Export hooks and providers
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';