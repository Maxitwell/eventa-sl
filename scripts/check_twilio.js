require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function run() {
    try {
        const content = await client.content.v1.contents('HX09e734c41e8fde190fb1deb80f4f0619').fetch();
        console.log(JSON.stringify(content.types, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
