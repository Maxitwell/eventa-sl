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

async function run() {
    try {
        const user = await admin.auth().getUser('AJRrh3fVkGSTw2AbuLfyx5vpuJ52');
        console.log("Auth User:", user);
    } catch(err) {
        console.error(err);
    }
}

run().catch(console.error);
