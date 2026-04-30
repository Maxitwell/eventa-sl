import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { computeCheckoutPricing, type EventTicketTierLike } from '@/lib/checkout-pricing';

type CheckoutTicketItem = {
    quantity: number;
    eventId: string;
    eventName: string;
    ticketName: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
    price: number;
};

export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            console.error("JWT_SECRET is missing or too short");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const body = await request.json();

        const { phoneNumber, tickets, guestInfo, userId } = body as {
            amount?: number;
            phoneNumber: string;
            tickets: CheckoutTicketItem[];
            guestInfo?: { email?: string; name?: string; phone?: string };
            userId?: string;
        };

        if (!phoneNumber || !tickets?.length) {
            return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
        }

        const eventIds = [...new Set(tickets.map((t) => t.eventId))];
        if (eventIds.length !== 1) {
            return NextResponse.json(
                { error: 'Checkout one event at a time. Remove items from other events.' },
                { status: 400 }
            );
        }

        const eventId = eventIds[0];
        const eventRef = adminDb.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();
        if (!eventSnap.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const eventData = eventSnap.data() as Record<string, unknown>;

        let pricing;
        try {
            pricing = computeCheckoutPricing(
                eventId,
                tickets.map((t) => ({ ticketName: t.ticketName, quantity: t.quantity })),
                {
                    price: Number(eventData.price) || 0,
                    totalCapacity: eventData.totalCapacity as number | undefined,
                    capacity: eventData.capacity as number | undefined,
                    tickets: eventData.tickets as EventTicketTierLike[] | undefined,
                    date: eventData.date as string | undefined,
                    time: eventData.time as string | undefined,
                    location: eventData.location as string | undefined,
                    title: eventData.title as string | undefined,
                }
            );
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Invalid pricing';
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const serverAmount = pricing.totalAmount;
        if (serverAmount <= 0) {
            return NextResponse.json(
                { error: 'This checkout requires a paid total. Free events use a different flow.' },
                { status: 400 }
            );
        }

        const depositId = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const correspondent = "ORANGE_SLE";

        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (!formattedPhone.startsWith('232')) {
            formattedPhone = '232' + formattedPhone;
        }

        const pawapayPayload = {
            depositId,
            amount: serverAmount.toString(),
            currency: "SLE",
            country: "SLE",
            correspondent,
            payer: {
                type: "MSISDN",
                address: {
                    value: formattedPhone
                }
            },
            statementDescription: "Eventa Ticket Purchase",
            customerTimestamp: new Date().toISOString(),
            returnUrl: "https://eventa.africa/tickets"
        };

        const PAWAPAY_API_URL = `${process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1'}/deposits`;
        const pawapayResponse = await fetch(PAWAPAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PAWAPAY_API_KEY}`
            },
            body: JSON.stringify(pawapayPayload)
        });

        const pawapayData = await pawapayResponse.json();

        if (!pawapayResponse.ok) {
            console.error("PawaPay Error API Response:", pawapayData);
            return NextResponse.json({ error: 'Failed to initiate payment with provider', details: pawapayData }, { status: pawapayResponse.status });
        }

        const ticketsRef = adminDb.collection('tickets');
        const reservationsRef = adminDb.collection('reservations');
        const totalTicketsRequested = pricing.lines.reduce((acc, line) => acc + line.quantity, 0);

        try {
            await adminDb.runTransaction(async (t) => {
                const eventDoc = await t.get(eventRef);
                if (!eventDoc.exists) throw new Error("Event not found");

                const ed = eventDoc.data() as { totalCapacity?: number; capacity?: number; ticketsSold?: number };
                const capacity = ed?.totalCapacity ?? ed?.capacity ?? 0;
                const ticketsSold = ed?.ticketsSold || 0;

                const activeResQuery = await t.get(reservationsRef.where('eventId', '==', eventId));
                const nowIso = new Date().toISOString();
                let reservedCount = 0;
                activeResQuery.forEach(doc => {
                    const data = doc.data();
                    // Filter in-memory — avoids composite index requirement
                    if (data.expiresAt > nowIso) {
                        reservedCount += data.quantity || 0;
                    }
                });

                if (capacity > 0 && ticketsSold + reservedCount + totalTicketsRequested > capacity) {
                    throw new Error("Event capacity reached or tickets temporarily reserved by others. Please try again soon.");
                }

                const resRef = reservationsRef.doc(depositId);
                const expiry = new Date();
                expiry.setMinutes(expiry.getMinutes() + 15);
                t.set(resRef, {
                    eventId,
                    quantity: totalTicketsRequested,
                    expiresAt: expiry.toISOString()
                });
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Event capacity check failed';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const orderRef = adminDb.collection('orders').doc(depositId);
        const batch = adminDb.batch();
        const ticketIds: string[] = [];
        const now = new Date().toISOString();

        for (const line of pricing.lines) {
            for (let i = 0; i < line.quantity; i++) {
                const newTicketRef = ticketsRef.doc();
                ticketIds.push(newTicketRef.id);

                const jwtPayload = {
                    ticketId: newTicketRef.id,
                    eventId: pricing.eventId,
                    depositId: depositId
                };

                const signedToken = jwt.sign(jwtPayload, jwtSecret);
                const qrCodeDataUrl = await QRCode.toDataURL(signedToken, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#111827', light: '#ffffff' }
                });

                batch.set(newTicketRef, {
                    orderId: depositId,
                    pawapayDepositId: depositId,
                    status: "pending_payment",
                    eventId: pricing.eventId,
                    eventName: pricing.eventName,
                    ticketType: line.ticketName,
                    date: pricing.eventDate,
                    time: pricing.eventTime,
                    location: pricing.eventLocation,
                    pricePaid: line.unitPrice,
                    userId: userId || `guest_${guestInfo?.email}`,
                    guestName: guestInfo?.name || null,
                    guestEmail: guestInfo?.email || null,
                    guestPhone: guestInfo?.phone || null,
                    qrCode: qrCodeDataUrl,
                    purchaseDate: now,
                });
            }
        }

        batch.set(orderRef, {
            depositId,
            status: 'pending_payment',
            amount: serverAmount,
            currency: 'SLE',
            eventId,
            userId: userId || null,
            guestEmail: guestInfo?.email || null,
            guestName: guestInfo?.name || null,
            guestPhone: guestInfo?.phone || null,
            lines: pricing.lines,
            createdAt: now,
            updatedAt: now,
            ticketIds,
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            depositId: depositId,
            amount: serverAmount,
            message: 'Payment prompt sent to phone'
        });

    } catch (error) {
        console.error('Error initiating checkout:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
