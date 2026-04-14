const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  })
});

async function testCreate() {
  try {
    const db = getFirestore();
    const docRef = await db.collection('events').add({
      title: "Test Event",
      date: "Oct 10",
      status: "draft"
    });
    console.log("Successfully created event with ID:", docRef.id);
  } catch (error) {
    console.error("Failed to create event in Firestore:", error);
  }
}

testCreate();
