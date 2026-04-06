const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');
envLocal.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2];
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        process.env[match[1].trim()] = val;
    }
});

// Setup admin using process.env
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = admin.firestore();

async function checkTickets() {
  console.log("Checking Firestore for pending tickets...");
  try {
    const ticketsRef = db.collection('tickets');
    // We get the newest tickets created
    const snapshot = await ticketsRef.where('status', '==', 'pending_payment').get();
    
    if (snapshot.empty) {
      console.log('No pending tickets found in the database.');
      process.exit(0);
    }
    
    console.log(`\n🎉 Found ${snapshot.size} pending ticket(s)! Here are the details of the latest ones:\n`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`-- Ticket ID: ${doc.id} --`);
      console.log(`Event Name: ${data.eventName}`);
      console.log(`Amount: NLe ${data.pricePaid}`);
      console.log(`Deposit ID (PawaPay ref): ${data.pawapayDepositId || 'N/A'}`);
      console.log(`Guest Email: ${data.guestEmail}`);
      console.log(`Status: ${data.status}`);
      console.log(`Timestamp: ${data.purchaseDate}`);
      console.log('--------------------------------\n');
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error querying Firebase:", err);
    process.exit(1);
  }
}

checkTickets();
