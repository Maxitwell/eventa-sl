require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function run() {
    try {
        const content = await client.content.v1.contents.create({
            friendlyName: 'eventa_event_preview_wa_' + Date.now(),
            language: 'en',
            variables: {
                '1': 'image_url',
                '2': 'event_details'
            },
            types: {
                'whatsapp/card': {
                    body: '{{2}}',
                    headerMedia: ['{{1}}'],
                    actions: [
                        {
                            type: 'QUICK_REPLY',
                            id: 'buy_ticket',
                            title: 'Buy Tickets'
                        },
                        {
                            type: 'QUICK_REPLY',
                            id: 'main_menu',
                            title: 'Back to Menu'
                        }
                    ]
                }
            }
        });

        console.log("Created new WhatsApp Card Template!");
        console.log("SID:", content.sid);
    } catch (e) {
        console.error("Failed:", e);
    }
}
run();
