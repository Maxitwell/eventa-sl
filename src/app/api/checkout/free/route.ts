import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTicketEmail } from '@/lib/delivery';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import crypto from 'crypto';

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

        // Fix 8: use crypto.randomUUID — unpredictable, no collision risk
        const orderId = `free-${crypto.randomUUID()}`;

        // Fix 10: guard against undefined email producing userId "guest_undefined"
        const resolvedUserId = userId || (guestInfo?.email ? `guest_${guestInfo.email}` : `guest_anon_${crypto.randomUUID()}`);

        await adminDb.runTransaction(async (t) => {
            const eventDoc = await t.get(eventRef);
            if (!eventDoc.exists) throw new Error('Event not found');

            const ed = eventDoc.data() as { totalCapacity?: number; ticketsSold?: number; tierSoldCounts?: Record<string, number> };
            const capacity = ed?.totalCapacity ?? 0;
            const sold = ed?.ticketsSold ?? 0;

            if (capacity > 0 && sold + totalRequested > capacity) {
                throw new Error('Event is at capacity');
            }

            const newTierSoldCounts: Record<string, number> = { ...(ed.tierSoldCounts ?? {}) };
            for (const ticket of tickets) {
                newTierSoldCounts[ticket.ticketName] = (newTierSoldCounts[ticket.ticketName] ?? 0) + ticket.quantity;
            }

            t.update(eventRef, { ticketsSold: sold + totalRequested, tierSoldCounts: newTierSoldCounts });
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

                // Fix 12: ticket JWTs now carry a 5-year expiry
                const signed = jwt.sign(
                    { ticketId: newTicketRef.id, eventId, orderId },
                    jwtSecret,
                    { expiresIn: '5y' }
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
                    userId: resolvedUserId,
                    guestName: guestInfo?.name || null,
                    guestEmail: guestInfo?.email || emailTarget || null,
                    guestPhone: guestInfo?.phone || null,
                    qrCode,
                    purchaseDate: now,
                });
            }
        }

        batch.set(ordersRef.doc(orderId), {
            depositId: orderId,
            status: 'paid',
            amount: 0,
            currency: 'SLE',
            eventId,
            userId: resolvedUserId,
            guestEmail: guestInfo?.email || emailTarget || null,
            guestName: guestInfo?.name || emailName || null,
            guestPhone: guestInfo?.phone || null,
            lines: tickets.map((t) => ({ ticketName: t.ticketName, quantity: t.quantity, unitPrice: 0 })),
            createdAt: now,
            updatedAt: now,
            ticketIds,
            isFree: true,
        });

        await batch.commit();

        // Resolve the email to send the ticket to — covers both guest and logged-in users
        let emailTarget = guestInfo?.email || null;
        let emailName = guestInfo?.name || 'Guest';
        if (!emailTarget && userId) {
            try {
                const { getAuth } = await import('firebase-admin/auth');
                const userRecord = await getAuth().getUser(userId);
                emailTarget = userRecord.email || null;
                emailName = userRecord.displayName || emailTarget || 'Guest';
            } catch (err) {
                console.warn('[Free Checkout] Could not fetch user email from Auth:', err);
            }
        }
        const eventName = tickets[0].eventName;

        if (emailTarget && ticketIds.length > 0) {
            const firstTicket = tickets[0];
            const sendPromises = ticketIds.map((tid) =>
                sendTicketEmail(emailTarget, emailName, eventName, qrCodesByTicketId[tid], {
                    orderId,
                    ticketId: tid,
                    eventDate: firstTicket.eventDate || (eventData.date as string) || '',
                    eventTime: firstTicket.eventTime || (eventData.time as string) || '',
                    location: firstTicket.eventLocation || (eventData.location as string) || '',
                    ticketType: firstTicket.ticketName,
                })
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
