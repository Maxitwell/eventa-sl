require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function run() {
    try {
        const to = 'whatsapp:+1234567890'; // We just want to see if Twilio rejects the payload formation
        // Replace with the user's actual whatsapp number from previous interactions if known, or just use a dummy to see if it fails at the API level.
        // Let's check what error Twilio gives.
        const message = await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+12184148971',
            to: 'whatsapp:+23277000000', // Dummy number, it might fail with "unverified number" if not in sandbox, but we want to see if template fails first.
            contentSid: 'HX3a67d351a8138dc9a1b81962d0baf9a9',
            contentVariables: JSON.stringify({
                '1': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
                '2': 'Test details string'
            })
        });
        console.log("Message sent:", message.sid);
    } catch (e) {
        console.error("Twilio Error:", e);
    }
}
run();
