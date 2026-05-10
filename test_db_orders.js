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
    console.log("Checking orders:");
    const orders = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();
    orders.forEach(doc => {
        const d = doc.data();
        console.log(`Order ${doc.id}: guestEmail: "${d.guestEmail}", userId: "${d.userId}", status: ${d.status}, isFree: ${d.isFree}`);
    });
}

run().catch(console.error);
