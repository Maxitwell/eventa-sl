import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+12184148971";

function getClient() {
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)");
    }
    return twilio(accountSid, authToken);
}

/** Send a proactive WhatsApp message to a user. `to` should be in "whatsapp:+XXXXXXXXXXX" format. */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
    const client = getClient();
    await client.messages.create({ from: fromNumber, to, body });
}

/**
 * Validate that an incoming request genuinely came from Twilio.
 * Returns true if valid, false otherwise.
 */
export function validateTwilioSignature(
    url: string,
    params: Record<string, string>,
    signature: string
): boolean {
    if (!authToken) return false;
    return twilio.validateRequest(authToken, signature, url, params);
}
