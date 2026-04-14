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

async function checkSpecificEvent() {
    console.log("Checking event 5a1xoELOd5CPXtD9HQ2t...");
    const eventId = '5a1xoELOd5CPXtD9HQ2t';
    const eventRef = db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    
    if (!doc.exists) {
        console.log("Event does not exist.");
        return;
    }
    
    console.log(`Title: ${doc.data().title}`);
    console.log(`doorPin: ${doc.data().doorPin}`);
    console.log(`location: ${doc.data().location}`);
    console.log(`createdAt: ${doc.data().createdAt}`);
    console.log(`Keys: ${Object.keys(doc.data())}`);
}

checkSpecificEvent().catch(console.error);
