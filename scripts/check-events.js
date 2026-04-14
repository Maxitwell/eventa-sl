import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLatestEvent() {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"), limit(5));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        console.log(`Event: ${doc.data().title}`);
        console.log(`doorPin: ${doc.data().doorPin}`);
        console.log(`createdAt: ${doc.data().createdAt}`);
        console.log('---');
    });
}

checkLatestEvent().catch(console.error);
