import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTicketEmail } from '@/lib/delivery';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

type FreeTicketItem = {
    quantity: number;
    eventId: string;
    eventName: string;
    ticketName: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
};

export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { tickets, userId, guestInfo } = body as {
            tickets: FreeTicketItem[];
            userId?: string;
            guestInfo?: { email?: string; name?: string; phone?: string };
        };

        if (!tickets?.length) {
            return NextResponse.json({ error: 'No tickets provided' }, { status: 400 });
        }

        // All items must belong to the same event
        const eventIds = [...new Set(tickets.map((t) => t.eventId))];
        if (eventIds.length !== 1) {
            return NextResponse.json({ error: 'All tickets must be for the same event' }, { status: 400 });
        }

        const eventId = eventIds[0];
        const eventRef = adminDb.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();
        if (!eventSnap.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const eventData = eventSnap.data() as Record<string, unknown>;

        // Confirm the event is actually free
        const eventBasePrice = Number(eventData.price) || 0;
        const allFree = tickets.every((t) => {
            const tiers = eventData.tickets as Array<{ name: string; price: number }> | undefined;
            const tier = tiers?.find((x) => x.name === t.ticketName);
            return (tier ? tier.price : eventBasePrice) === 0;
        });

        if (!allFree) {
            return NextResponse.json({ error: 'This endpoint is only for free tickets' }, { status: 400 });
        }

        const totalRequested = tickets.reduce((sum, t) => sum + t.quantity, 0);
        const now = new Date().toISOString();
        const orderId = `free-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Atomically check capacity and increment ticketsSold
        await adminDb.runTransaction(async (t) => {
            const eventDoc = await t.get(eventRef);
            if (!eventDoc.exists) throw new Error('Event not found');

            const ed = eventDoc.data() as { totalCapacity?: number; ticketsSold?: number };
            const capacity = ed?.totalCapacity ?? 0;
            const sold = ed?.ticketsSold ?? 0;

            if (capacity > 0 && sold + totalRequested > capacity) {
                throw new Error('Event is at capacity');
            }

            t.update(eventRef, { ticketsSold: sold + totalRequested });
        });

        const ticketsRef = adminDb.collection('tickets');
        const ordersRef = adminDb.collection('orders');
        const batch = adminDb.batch();
        const ticketIds: string[] = [];
        const qrCodesByTicketId: Record<string, string> = {};

        for (const line of tickets) {
            for (let i = 0; i < line.quantity; i++) {
                const newTicketRef = ticketsRef.doc();
                ticketIds.push(newTicketRef.id);

                const signed = jwt.sign(
                    { ticketId: newTicketRef.id, eventId, orderId },
                    jwtSecret
                );
                const qrCode = await QRCode.toDataURL(signed, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#111827', light: '#ffffff' },
                });
                qrCodesByTicketId[newTicketRef.id] = qrCode;

                batch.set(newTicketRef, {
                    orderId,
                    status: 'valid',
                    eventId,
                    eventName: line.eventName,
                    ticketType: line.ticketName,
                    date: line.eventDate || (eventData.date as string) || '',
                    time: line.eventTime || (eventData.time as string) || '',
                    location: line.eventLocation || (eventData.location as string) || '',
                    pricePaid: 0,
                    userId: userId || `guest_${guestInfo?.email}`,
                    guestName: guestInfo?.name || null,
                    guestEmail: guestInfo?.email || null,
                    guestPhone: guestInfo?.phone || null,
                    qrCode,
                    purchaseDate: now,
                });
            }
        }

        // Create an order record so it shows up in admin
        batch.set(ordersRef.doc(orderId), {
            depositId: orderId,
            status: 'paid',
            amount: 0,
            currency: 'SLE',
            eventId,
            userId: userId || null,
            guestEmail: guestInfo?.email || null,
            guestName: guestInfo?.name || null,
            guestPhone: guestInfo?.phone || null,
            lines: tickets.map((t) => ({ ticketName: t.ticketName, quantity: t.quantity, unitPrice: 0 })),
            createdAt: now,
            updatedAt: now,
            ticketIds,
            isFree: true,
        });

        await batch.commit();

        // Send confirmation emails
        const emailTarget = guestInfo?.email || null;
        const emailName = guestInfo?.name || 'Guest';
        const eventName = tickets[0].eventName;

        if (emailTarget && ticketIds.length > 0) {
            const sendPromises = ticketIds.map((tid) =>
                sendTicketEmail(emailTarget, emailName, eventName, qrCodesByTicketId[tid])
            );
            await Promise.allSettled(sendPromises);
        }

        return NextResponse.json({ success: true, orderId, ticketIds });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        if (message === 'Event is at capacity') {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        console.error('[Free Checkout] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
