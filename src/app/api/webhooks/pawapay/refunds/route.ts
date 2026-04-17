import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { assertWebhookSecret, isWebhookReplay } from '@/lib/webhook-security';
import { sendRefundEmail } from '@/lib/delivery';

export async function POST(request: Request) {
    try {
        if (!assertWebhookSecret(request.headers.get("x-webhook-secret"))) {
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        const body = await request.json();
        const { refundId, depositId, status, amount, currency } = body as {
            refundId?: string;
            depositId?: string;
            status?: string;
            amount?: number;
            currency?: string;
        };

        if (!depositId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const isReplay = await isWebhookReplay(`refund:${refundId ?? 'na'}:${depositId}:${status}`);
        if (isReplay) {
            return NextResponse.json({ success: true, message: 'Duplicate webhook ignored' });
        }

        console.log(`[PawaPay Webhook] Refund ${refundId} for deposit ${depositId} → ${status}`);

        if (status !== 'COMPLETED') {
            // Log failed refunds but still return 200 so PawaPay doesn't retry
            console.warn(`[PawaPay Webhook] Refund ${refundId} ended with non-COMPLETED status: ${status}`);
            return NextResponse.json({ success: true, message: `Refund status ${status} noted` });
        }

        const ticketsRef = adminDb.collection('tickets');
        const ticketsSnap = await ticketsRef.where('pawapayDepositId', '==', depositId).get();

        if (ticketsSnap.empty) {
            return NextResponse.json({ error: 'No tickets found for deposit' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const batch = adminDb.batch();

        // Collect unique event IDs to decrement ticketsSold
        const eventIdCounts = new Map<string, number>();
        const notificationTargets: { email: string; name: string; eventName: string }[] = [];

        for (const docSnap of ticketsSnap.docs) {
            const ticket = docSnap.data() as {
                eventId?: string;
                guestEmail?: string;
                guestName?: string;
                eventName?: string;
                status?: string;
            };

            batch.update(ticketsRef.doc(docSnap.id), {
                status: 'refunded',
                refundConfirmedAt: now,
            });

            if (ticket.eventId) {
                eventIdCounts.set(ticket.eventId, (eventIdCounts.get(ticket.eventId) ?? 0) + 1);
            }

            // Collect one email notification per unique guest email
            if (ticket.guestEmail && ticket.eventName) {
                const alreadyQueued = notificationTargets.some((t) => t.email === ticket.guestEmail);
                if (!alreadyQueued) {
                    notificationTargets.push({
                        email: ticket.guestEmail,
                        name: ticket.guestName || 'Guest',
                        eventName: ticket.eventName,
                    });
                }
            }
        }

        // Also update the order status
        const orderRef = adminDb.collection('orders').doc(depositId);
        batch.update(orderRef, { status: 'refunded', updatedAt: now });

        await batch.commit();

        // Decrement ticketsSold for each affected event (outside batch — uses transaction)
        for (const [eventId, count] of eventIdCounts) {
            const eventRef = adminDb.collection('events').doc(eventId);
            await adminDb.runTransaction(async (t) => {
                const eventDoc = await t.get(eventRef);
                if (!eventDoc.exists) return;
                const current = (eventDoc.data() as { ticketsSold?: number }).ticketsSold ?? 0;
                t.update(eventRef, { ticketsSold: Math.max(0, current - count) });
            });
        }

        // Send refund confirmation emails
        const refundAmount = typeof amount === 'number' ? amount : 0;
        const curr = currency ?? 'Le';
        const emailPromises = notificationTargets.map(({ email, name, eventName }) =>
            sendRefundEmail(email, name, eventName, refundAmount, curr)
        );
        await Promise.allSettled(emailPromises);

        return NextResponse.json({ success: true, message: 'Refund webhook processed' });
    } catch (error) {
        console.error('[PawaPay Refund Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
