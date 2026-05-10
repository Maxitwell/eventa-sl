require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}
const db = admin.firestore();

async function run() {
    const events = await db.collection('events').where('price', '==', 0).limit(1).get();
    events.forEach(doc => {
        console.log(`Event ID: ${doc.id}`);
        console.log(`Title: ${doc.data().title}`);
    });
}

run().catch(console.error);
