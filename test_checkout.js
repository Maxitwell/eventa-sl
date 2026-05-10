const fetch = require('node-fetch');

async function test() {
    const payload = {
        tickets: [
            {
                eventId: 'HZkc051mT673wCeIaRNq',
                eventName: 'Tech Salone',
                ticketName: 'Free Access',
                quantity: 1,
            }
        ],
        userId: 'AJRrh3fVkGSTw2AbuLfyx5vpuJ52', // Logged in user with email
        guestInfo: { email: "", name: "" }
    };

    const res = await fetch('http://localhost:3000/api/checkout/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}

test().catch(console.error);
