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

async function checkCrash() {
    console.log("Checking events for null/undefined fields...");
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    
    let badCount = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.title) { console.log(`${doc.id} missing title`); badCount++; }
        if (!data.location) { console.log(`${doc.id} missing location`); badCount++; }
        if (!data.date) { console.log(`${doc.id} missing date`); badCount++; }
        if (!data.createdAt) { console.log(`${doc.id} missing createdAt`); badCount++; }
    });
    
    if (badCount === 0) console.log("All events are structurally sound!");
    else console.log(`Found ${badCount} problematic fields.`);
}

checkCrash().catch(console.error);
