import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

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
        const body = await request.json();
        
        const { amount, phoneNumber, tickets, guestInfo, userId } = body as {
            amount: number;
            phoneNumber: string;
            tickets: CheckoutTicketItem[];
            guestInfo?: { email?: string; name?: string; phone?: string };
            userId?: string;
        };

        if (!amount || !phoneNumber) {
            return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
        }

        // Generate a unique deposit ID for PawaPay
        const depositId = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Determine correspondent (e.g. Orange Money vs Africell) based on phone prefix?
        // In Sierra Leone, 07x/07xx usually Orange, 077/03/etc. need careful mapping.
        // We will default to ORANGE_SLE for this example, but you'd build a mapping logic based on user selection
        // or prefix.
        const correspondent = "ORANGE_SLE"; 

        // Strip non-digits from phone number and prepend country code if missing
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (!formattedPhone.startsWith('232')) {
            formattedPhone = '232' + formattedPhone;
        }

        const pawapayPayload = {
            depositId,
            amount: amount.toString(),
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
            // returnUrl is rarely used for mobile money push, but required by API 
            returnUrl: "https://eventa.africa/tickets"
        };

        const PAWAPAY_API_URL = "https://api.sandbox.pawapay.io/v1/deposits"; 
        // Make request to PawaPay
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

        // PawaPay accepted the prompt request.
        // Now securely write the pending ticket to Firestore via Admin SDK bypassing client rules.
        const ticketsRef = adminDb.collection('tickets');
        const eventRef = adminDb.collection('events').doc(tickets[0]?.eventId); // We assume all items match the same event, but let's be flexible

        // 1. INVENTORY SOFT-LOCK VALIDATION
        // Before creating tickets, verify the event isn't sold out
        const totalTicketsRequested = tickets.reduce((acc: number, item: CheckoutTicketItem) => acc + item.quantity, 0);

        try {
            await adminDb.runTransaction(async (t) => {
                const eventDoc = await t.get(eventRef);
                if (!eventDoc.exists) throw new Error("Event not found");

                const eventData = eventDoc.data();
                const capacity = eventData?.totalCapacity ?? eventData?.capacity ?? 0;
                const ticketsSold = eventData?.ticketsSold || 0;
                
                // Allow a tiny bit of overbooking tolerance if pending, but generally reject if hard maxed out
                if (ticketsSold + totalTicketsRequested > capacity + 5) { // 5 ticket tolerance for concurrent checkouts 
                    throw new Error("Event capacity reached");
                }

                // If safe, we proceed! The transaction implicitly clears without writing, just a read-lock verification.
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Event capacity check failed';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        // 2. SECURE QR CODE GENERATION & BATCH INSERT
        const batch = adminDb.batch();

        for (const ticket of tickets) {
            for (let i = 0; i < ticket.quantity; i++) {
                const newTicketRef = ticketsRef.doc();
                
                // Sign a cryptographic payload to prevent QR spoofing
                const jwtPayload = {
                    ticketId: newTicketRef.id,
                    eventId: ticket.eventId,
                    depositId: depositId
                };
                
                const signedToken = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'fallback_secret_key');
                // Generate the literal image data directly into the DB to save remote bandwidth 
                const qrCodeDataUrl = await QRCode.toDataURL(signedToken, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#111827', light: '#ffffff' }
                });

                batch.set(newTicketRef, {
                    pawapayDepositId: depositId,
                    status: "pending_payment", 
                    eventId: ticket.eventId,
                    eventName: ticket.eventName,
                    ticketType: ticket.ticketName,
                    date: ticket.eventDate || "TBD",
                    time: ticket.eventTime || "TBD",
                    location: ticket.eventLocation || "TBD",
                    pricePaid: ticket.price,
                    userId: userId || `guest_${guestInfo?.email}`,
                    guestName: guestInfo?.name || null,
                    guestEmail: guestInfo?.email || null,
                    guestPhone: guestInfo?.phone || null,
                    qrCode: qrCodeDataUrl, 
                    purchaseDate: new Date().toISOString(),
                });
            }
        }
        
        await batch.commit();

        return NextResponse.json({ 
            success: true, 
            depositId: depositId,
            message: 'Payment prompt sent to phone' 
        });

    } catch (error) {
        console.error('Error initiating checkout:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
