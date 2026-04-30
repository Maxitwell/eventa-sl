import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee
const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1';

export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    let uid: string;
    let organizerEmail: string | undefined;
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        uid = decoded.uid;
        organizerEmail = decoded.email;
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { eventId } = await request.json() as { eventId?: string };
    if (!eventId) {
        return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify organizer owns this event
    const eventSnap = await db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const event = eventSnap.data() as Record<string, unknown>;
    if (event.organizerId !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for existing pending/settled payout for this event
    const existingSnap = await db
        .collection('payouts')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['pending', 'processing', 'settled'])
        .get();
    if (!existingSnap.empty) {
        return NextResponse.json({ error: 'A payout for this event is already in progress or completed' }, { status: 400 });
    }

    // Calculate gross revenue from paid orders
    const ordersSnap = await db
        .collection('orders')
        .where('eventId', '==', eventId)
        .where('status', '==', 'paid')
        .get();

    const grossRevenue = ordersSnap.docs.reduce((sum, d) => {
        const data = d.data() as { amount?: number };
        return sum + (data.amount ?? 0);
    }, 0);

    if (grossRevenue <= 0) {
        return NextResponse.json({ error: 'No paid revenue to pay out for this event' }, { status: 400 });
    }

    const platformFee = Math.round(grossRevenue * PLATFORM_FEE_RATE);
    const netAmount = grossRevenue - platformFee;

    // Get payout details from event
    const payoutDetails = event.payoutDetails as {
        method?: string;
        accountNumber?: string;
        accountName?: string;
    } | undefined;

    if (!payoutDetails?.accountNumber) {
        return NextResponse.json({ error: 'No payout details set for this event. Please edit the event and add payout details.' }, { status: 400 });
    }

    const payoutId = `payout-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Format phone for PawaPay
    let formattedPhone = payoutDetails.accountNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('232')) {
        formattedPhone = '232' + formattedPhone;
    }

    const pawapayPayload = {
        payoutId,
        amount: netAmount.toString(),
        currency: 'SLE',
        country: 'SLE',
        correspondent: 'ORANGE_SLE',
        recipient: {
            type: 'MSISDN',
            address: { value: formattedPhone },
        },
        statementDescription: `Eventa Payout: ${String(event.title ?? '').slice(0, 22)}`,
        metadata: [
            { fieldName: 'eventId', fieldValue: eventId, isPII: false },
            { fieldName: 'organizerId', fieldValue: uid, isPII: false },
        ],
    };

    const pawapayRes = await fetch(`${PAWAPAY_API_BASE}/payouts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}`,
        },
        body: JSON.stringify(pawapayPayload),
    });

    if (!pawapayRes.ok) {
        const detail = await pawapayRes.json().catch(() => ({}));
        console.error('[Payout Request] PawaPay error:', detail);
        return NextResponse.json({ error: 'Payment provider rejected payout', detail }, { status: pawapayRes.status });
    }

    const now = new Date().toISOString();
    await db.collection('payouts').doc(payoutId).set({
        pawapayPayoutId: payoutId,
        eventId,
        eventName: event.title ?? '',
        organizerId: uid,
        organizerEmail: organizerEmail ?? '',
        organizerName: event.organizerName ?? '',
        grossRevenue,
        platformFee,
        amount: netAmount,
        currency: 'SLE',
        status: 'pending',
        payoutDetails,
        createdAt: now,
        updatedAt: now,
    });

    return NextResponse.json({
        success: true,
        payoutId,
        grossRevenue,
        platformFee,
        netAmount,
        message: `Payout of Le ${netAmount.toLocaleString()} initiated`,
    });
}
