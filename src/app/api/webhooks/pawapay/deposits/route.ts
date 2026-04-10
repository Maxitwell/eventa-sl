import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTicketEmail } from '@/lib/delivery';

export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const body = await request.json();
        
        // PawaPay deposit webhook payload structure usually includes depositId and status
        // e.g. { depositId: "123-abc", status: "COMPLETED", ... }
        const { depositId, status } = body;

        if (!depositId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
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

        // Send out an automated email receipt to everyone who purchased!
        if (status === "COMPLETED") {
            const deliveryPromises = querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                if (data.guestEmail) {
                    await sendTicketEmail(
                        data.guestEmail,
                        data.guestName || "there",
                        data.eventName || "Your Event",
                        data.qrCode // The securely signed base64 payload
                    );
                }
            });
            await Promise.allSettled(deliveryPromises);
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
