import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTicketEmail } from '@/lib/delivery';
import { assertWebhookSecret, isWebhookReplay } from '@/lib/webhook-security';
import { sendWhatsAppMessage } from '@/lib/twilio';

export async function POST(request: Request) {
    try {
        if (!assertWebhookSecret(request.headers.get("x-webhook-secret"))) {
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        const body = await request.json();
        
        // PawaPay deposit webhook payload structure usually includes depositId and status
        // e.g. { depositId: "123-abc", status: "COMPLETED", ... }
        const { depositId, status } = body;

        if (!depositId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const isReplay = await isWebhookReplay(`deposit:${depositId}:${status}`);
        if (isReplay) {
            return NextResponse.json({ success: true, message: 'Duplicate webhook ignored' });
        }

        console.log(`[PawaPay Webhook] Deposit ${depositId} status changed to ${status}`);

        // Find the ticket or transaction associated with this depositId
        const ticketsRef = adminDb.collection('tickets');
        const querySnapshot = await ticketsRef.where("pawapayDepositId", "==", depositId).get();

        if (querySnapshot.empty) {
            console.error(`No ticket found for depositId: ${depositId}`);
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const batch = adminDb.batch();
        let eventIdToIncrement = null;
        let ticketsToIncrement = 0;

        querySnapshot.docs.forEach((docSnap) => {
            const ticketRef = ticketsRef.doc(docSnap.id);
            const ticketData = docSnap.data();
            
            if (status === "COMPLETED") {
                batch.update(ticketRef, { 
                    status: "valid", 
                    paymentConfirmedAt: new Date().toISOString() 
                });
                
                // Track how many tickets we need to add to the event's ticketsSold counter
                if (ticketData.eventId) {
                    eventIdToIncrement = ticketData.eventId;
                    ticketsToIncrement++;
                }
            } else if (status === "FAILED") {
                batch.update(ticketRef, { 
                    status: "failed_payment" 
                });
            }
        });

        // We use a batch so all tickets mark as valid at once
        await batch.commit();

        try {
            await adminDb.collection('reservations').doc(depositId).delete();
        } catch (err) {
            console.error("Failed to delete cleared reservation:", err);
        }

        const orderRef = adminDb.collection("orders").doc(depositId);
        const orderSnap = await orderRef.get();
        if (orderSnap.exists) {
            if (status === "COMPLETED") {
                await orderRef.update({
                    status: "paid",
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } else if (status === "FAILED") {
                await orderRef.update({
                    status: "failed",
                    failedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // Send confirmations to everyone who purchased
        if (status === "COMPLETED") {
            const deliveryPromises = querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();

                // Email confirmation (web checkout)
                if (data.guestEmail) {
                    await sendTicketEmail(
                        data.guestEmail,
                        data.guestName || "there",
                        data.eventName || "Your Event",
                        data.qrCode
                    );
                }

                // WhatsApp confirmation (WhatsApp checkout)
                if (data.channel === "whatsapp" && data.waFrom) {
                    const ticketId = docSnap.id.slice(-8).toUpperCase();
                    const msg =
                        `✅ *Payment Confirmed!*\n\n` +
                        `Your ticket for *${data.eventName ?? "the event"}* is ready.\n\n` +
                        `🎟️ Type: ${data.ticketType ?? "General Admission"}\n` +
                        `🆔 ID: ${ticketId}\n` +
                        `📷 QR: ${data.qrCode ?? "N/A"}\n\n` +
                        `Show this QR code at the entrance. See you there! 🎉\n\n` +
                        `Reply *menu* to start over.`;
                    await sendWhatsAppMessage(data.waFrom, msg).catch((err) =>
                        console.error("[PawaPay Webhook] WhatsApp notify failed:", err)
                    );
                }
            });
            await Promise.allSettled(deliveryPromises);
        }

        // Notify WhatsApp users when payment fails
        if (status === "FAILED") {
            const failNotifyPromises = querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                if (data.channel === "whatsapp" && data.waFrom) {
                    const msg =
                        `❌ *Payment Failed*\n\n` +
                        `Your payment for *${data.eventName ?? "the event"}* could not be processed.\n\n` +
                        `Reply *1* to try again, or *3* for support.`;
                    await sendWhatsAppMessage(data.waFrom, msg).catch((err) =>
                        console.error("[PawaPay Webhook] WhatsApp fail-notify error:", err)
                    );
                }
            });
            await Promise.allSettled(failNotifyPromises);
        }
        
        // If they checked out successfully, we must now safely increment the Event's capacity!
        if (status === "COMPLETED" && eventIdToIncrement && ticketsToIncrement > 0) {
            const eventRef = adminDb.collection('events').doc(eventIdToIncrement);
            try {
                await adminDb.runTransaction(async (t) => {
                    const eventDoc = await t.get(eventRef);
                    if (eventDoc.exists) {
                        const currentSold = eventDoc.data()?.ticketsSold || 0;
                        t.update(eventRef, { ticketsSold: currentSold + ticketsToIncrement });
                    }
                });
                console.log(`Successfully incremented event ${eventIdToIncrement} ticketsSold by ${ticketsToIncrement}`);
            } catch (err) {
                console.error("Failed to increment ticketsSold securely in webhook:", err);
            }
        }

        return NextResponse.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
        console.error('Error processing PawaPay webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
