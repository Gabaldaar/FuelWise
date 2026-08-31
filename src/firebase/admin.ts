import admin from 'firebase-admin';

// Explicitly set the project ID to avoid auto-discovery missing project ID errors in Cloud Run
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'studio-1769907004-5fad3';

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountString) {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('[Firebase Admin] Initialized successfully via service account key.');
    } else {
      admin.initializeApp({
        projectId: projectId,
      });
      console.log('[Firebase Admin] Initialized successfully via project ID:', projectId);
    }
  } catch (error: any) {
    console.error('[Firebase Admin] Initialization error:', error.message);
  }
}

export default admin;
