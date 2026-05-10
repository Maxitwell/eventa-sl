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
    const tickets = await db.collection('tickets').orderBy('purchaseDate', 'desc').limit(5).get();
    tickets.forEach(doc => {
        const d = doc.data();
        console.log(`Ticket ${doc.id}: guestEmail: "${d.guestEmail}", userId: "${d.userId}", status: ${d.status}`);
    });
}

run().catch(console.error);
