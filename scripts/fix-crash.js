import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let privateKeyVal = process.env.FIREBASE_PRIVATE_KEY;
if (privateKeyVal) {
    if (!privateKeyVal.includes('-----BEGIN PRIVATE KEY-----\n')) {
        privateKeyVal = privateKeyVal.replace(/\\n/g, '\n');
    }
}

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKeyVal,
        }),
    });
}

const db = getFirestore();

async function fixCrash() {
    console.log("Fixing malformed events...");
    const eventId = 'wvysPZ16paV7iYpiCbBf';
    const eventRef = db.collection('events').doc(eventId);
    
    await eventRef.update({
        location: "Freetown, Sierra Leone",
        createdAt: new Date().toISOString()
    });
    
    console.log(`Successfully fixed malformed event ${eventId}!`);
}

fixCrash().catch(console.error);
