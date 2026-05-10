require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// twilio/card supports dynamic media via {{1}}, and body via {{2}}
// title must be static text (no variables) — use a static title
async function run() {
    try {
        const content = await client.content.v1.contents.create({
            friendlyName: 'eventa_event_preview_v3_' + Date.now(),
            language: 'en',
            variables: {
                '1': 'image_url',
                '2': 'event_details_body'
            },
            types: {
                'twilio/card': {
                    title: 'Event Details',
                    body: '{{2}}',
                    media: ['{{1}}'],
                    actions: [
                        { type: 'QUICK_REPLY', id: 'buy_ticket',  title: 'Buy Tickets' },
                        { type: 'QUICK_REPLY', id: 'main_menu',   title: 'Back to Menu' }
                    ]
                }
            }
        });

        console.log("Created SID:", content.sid);
    } catch (e) {
        console.error("Error:", e.message || e);
    }
}
run();
