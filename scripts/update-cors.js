const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config({ path: '.env.local' });

initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
});

async function updateCors() {
  try {
    const bucket = getStorage().bucket();
    await bucket.setCorsConfiguration([
      {
        origin: ['*'], // Allow all origins for the public images
        method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
        responseHeader: ['*'],
        maxAgeSeconds: 3600
      }
    ]);
    console.log("Successfully updated CORS for Firebase Storage bucket:", bucket.name);
  } catch (error) {
    console.error("Failed to update CORS:", error);
  }
}

updateCors();
