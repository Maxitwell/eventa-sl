import { NextRequest, NextResponse } from "next/server";
import { getPublishedEvents, createTicket, getEventById, EventEntity } from "@/lib/db";

// In-memory session store (MVP: suitable for single-instance, serverless environments might need Redis/Firestore)
type SessionState = {
    step: "browsing" | "event_selected" | "payment_pending" | "payment_confirmed";
    eventId?: string;
    eventName?: string;
    ticketType?: string;
    price?: number;
    currency?: string;
    userId?: string;
};

const userSessions: Record<string, SessionState> = {};

export async function POST(req: NextRequest) {
    try {
        // Twilio sends payload as URL-encoded form data
        const text = await req.text();
        const params = new URLSearchParams(text);

        const from = params.get("From"); // e.g., "whatsapp:+1234567890"
        const body = params.get("Body")?.trim() || "";
        const lowerBody = body.toLowerCase();

        let responseMessage = "Welcome to Eventa SL on WhatsApp! 🎟️\n\nReply *1* to browse upcoming events.\nReply *2* to view your active tickets.\nReply *3* for Support.";

        // Ensure from is present
        if (!from) {
            return new NextResponse("Missing From parameter", { status: 400 });
        }

        // Initialize or get session
        if (!userSessions[from]) {
            userSessions[from] = { step: "browsing" };
        }
        const session = userSessions[from];

        // Handling top-level resets
        if (["hi", "hello", "hey", "menu"].includes(lowerBody)) {
            userSessions[from] = { step: "browsing" };
            // responseMessage is already set to the welcome menu
        }
        // Flow: Step 1 - Browsing logic 
        else if (session.step === "browsing") {
            if (lowerBody === "1") {
                try {
                    const events = await getPublishedEvents();
                    // Just take top 5 for the menu MVP
                    const topEvents = events.slice(0, 5);

                    if (topEvents && topEvents.length > 0) {
                        responseMessage = "✨ *Upcoming Events* ✨\n\n";
                        topEvents.forEach((event: EventEntity, index: number) => {
                            responseMessage += `${index + 1}. *${event.title}*\n📅 ${event.date}\n📍 ${event.location}\n💰 Starting at ${event.currency || 'NLe'} ${event.price}\n\n`;
                        });
                        responseMessage += "Reply with *buy [Event Number]* to get tickets! (e.g. 'buy 1')";
                    } else {
                        responseMessage = "No upcoming events found right now. Check back later!";
                    }
                } catch (error) {
                    console.error("Failed to fetch events:", error);
                    responseMessage = "Oops, we couldn't load the events right now.";
                }
            } else if (lowerBody === "2") {
                responseMessage = "You currently have 1 valid ticket.\n\n🎟️ *Salone Afrobeats '26*\nTier: VIP\nTicket ID: TKT-DEMO123\n\nShow this ID at the door!";
            } else if (lowerBody.startsWith("buy ")) {
                const eventNum = parseInt(lowerBody.split(" ")[1]);

                // For MVP: We need to fetch events again to map the number to an ID. 
                // Better approach: store the mapping in the session.
                try {
                    const events = await getPublishedEvents();
                    const topEvents = events.slice(0, 5);
                    if (topEvents && topEvents[eventNum - 1]) {
                        const selectedEvent = topEvents[eventNum - 1];

                        // Update session state
                        session.step = "event_selected";
                        session.eventId = selectedEvent.id;
                        session.eventName = selectedEvent.title;
                        // Just use the base price and default ticket type for this MVP flow
                        session.price = selectedEvent.price;
                        session.currency = selectedEvent.currency || 'NLe';
                        session.ticketType = selectedEvent.tickets && selectedEvent.tickets.length > 0
                            ? selectedEvent.tickets[0].name
                            : "General Admission";

                        responseMessage = `Great choice! Initiating checkout for *${session.eventName}*.\n\nTicket: ${session.ticketType}\nPrice: ${session.currency} ${session.price}\n\nPlease reply with your *Mobile Money Number* (e.g., 076123456) to receive the payment prompt.`;
                    } else {
                        responseMessage = "Invalid event number. Please try again (e.g., 'buy 1').";
                    }
                } catch (error) {
                    responseMessage = "Sorry, we had trouble finding that event.";
                }
            } else {
                responseMessage = "Sorry, I didn't catch that.\n\nReply *1* to browse upcoming events.\nReply *2* to view your active tickets.";
            }
        }
        // Flow: Step 2 - Wait for Mobile Money Number
        else if (session.step === "event_selected") {
            const phoneRegex = /^[0-9\s\+\-]+$/;
            if (phoneRegex.test(lowerBody) && lowerBody.length >= 6) {
                session.step = "payment_pending";
                responseMessage = `Processing... 🔄\n\nWe've sent a payment prompt to ${lowerBody} for ${session.currency} ${session.price}.\n\nOnce you have approved the payment on your phone by entering your PIN, please reply with *"confirm"* to generate your ticket.`;
            } else {
                responseMessage = `Please enter a valid Mobile Money number (digits only).`;
            }
        }
        // Flow: Step 3 - Wait for Payment Confirmation
        else if (session.step === "payment_pending") {
            if (lowerBody === "confirm" || lowerBody === "confirmed") {
                try {
                    if (!session.eventId || !session.eventName) throw new Error("Missing session details");

                    // Dummy User ID based on their phone number
                    const dummyUserId = `wa_${from.replace(/\D/g, '')}`;

                    // Generate simple QR code URL representing the ticket 
                    // In production this might be a link to your app, or a secure hash.
                    const ticketReference = `WA-${Date.now().toString().slice(-6)}`;
                    const qrCodeUrl = `https://quickchart.io/qr?text=${ticketReference}&size=300`;

                    // Call Firebase DB helper
                    const ticketId = await createTicket({
                        eventId: session.eventId,
                        userId: dummyUserId,
                        eventName: session.eventName,
                        ticketType: session.ticketType || "GA",
                        date: new Date().toLocaleDateString(), // simplified
                        time: "TBD", // simplified
                        location: "TBD", // simplified
                        purchaseDate: new Date().toISOString(),
                        qrCode: qrCodeUrl,
                        status: "valid",
                        pricePaid: session.price || 0
                    });

                    responseMessage = `✅ *Payment Successful!*\n\nHere is your ticket for *${session.eventName}*.\n\n*Ticket ID:* ${ticketId}\n*Type:* ${session.ticketType}\n\n*QR Code:* ${qrCodeUrl}\n\nPlease show this QR code or Ticket ID at the entrance.\n\nReply *menu* to start over.`;

                    // Complete checkout, reset session
                    userSessions[from] = { step: "browsing" };

                } catch (error) {
                    console.error("Error generating ticket:", error);
                    responseMessage = "Payment was confirmed, but we had an error generating your ticket. Please reply *3* for Support with your phone number.";
                    // Keep session mostly intact or reset? Let's reset for safety.
                    userSessions[from] = { step: "browsing" };
                }
            } else {
                responseMessage = `Still waiting for payment confirmation for ${session.eventName}.\n\nReply *"confirm"* once you have entered your MoMo PIN.\nReply *"cancel"* to abort.`;
                if (lowerBody === "cancel") {
                    userSessions[from] = { step: "browsing" };
                    responseMessage = "Checkout cancelled. Reply *1* to browse events.";
                }
            }
        }

        // Return a TwiML (XML) formatted response using Next.js standardized response
        // Do not use formatting indents for TwiML, keep it compact to avoid XML parsing errors
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>${escapeXml(responseMessage)}</Body></Message></Response>`;

        return new NextResponse(twiml, {
            status: 200,
            headers: {
                "Content-Type": "text/xml"
            }
        });

    } catch (error) {
        console.error("Twilio Webhook Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

// Utility to escape XML specific characters
function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
