import admin from 'firebase-admin';

// This structure prevents re-initialization of the Firebase Admin SDK in serverless environments.
// It ensures that `admin.initializeApp` is called only once per container instance.

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin] Initialized successfully via service account key.');
    } else {
      // This is for environments like Google Cloud Run where service account is auto-discovered.
      admin.initializeApp();
      console.log('[Firebase Admin] Initialized successfully via auto-discovery.');
    }
  } catch (error: any) {
    console.error('[Firebase Admin] Initialization failed:', error.message);
    // This will cause subsequent DB operations to fail, making the error visible.
  }
}

// Export the initialized admin instance.
export default admin;
