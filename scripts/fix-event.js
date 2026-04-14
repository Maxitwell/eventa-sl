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

function generateDoorPin() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
        pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
}

async function fix() {
    console.log("Fixing event...");
    const eventId = '5a1xoELOd5CPXtD9HQ2t'; // The user's new event
    const eventRef = db.collection('events').doc(eventId);
    
    await eventRef.update({
        doorPin: generateDoorPin()
    });
    
    console.log(`Successfully added a door pin to event ${eventId}!`);
}

fix().catch(console.error);
