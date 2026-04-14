import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

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

async function check() {
    console.log("Checking events...");
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.orderBy('createdAt', 'desc').limit(2).get();
    
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${doc.data().title}`);
        console.log(`doorPin: ${doc.data().doorPin}`);
        console.log(`Keys: ${Object.keys(doc.data())}`);
        console.log('---');
    });
}

check().catch(console.error);
