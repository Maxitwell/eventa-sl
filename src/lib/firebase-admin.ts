import * as admin from 'firebase-admin';

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return { projectId, clientEmail, privateKey, storageBucket };
}

function ensureAdminInitialized() {
  if (admin.apps.length) return;

  const { projectId, clientEmail, privateKey, storageBucket } = getAdminConfig();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin is not configured. Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

export function getAdminDb() {
  ensureAdminInitialized();
  return admin.firestore();
}

export function getAdminAuth() {
  ensureAdminInitialized();
  return admin.auth();
}

export function getAdminStorage() {
  ensureAdminInitialized();
  return admin.storage();
}
