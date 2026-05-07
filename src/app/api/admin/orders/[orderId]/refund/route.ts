import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import crypto from 'crypto';

const ADMIN_EMAIL = 'admin@eventa.africa';
const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1';

async function verifyAdminToken(request: Request): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    const idToken = authHeader.slice('Bearer '.length);
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        return decoded.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { orderId } = await params;
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);

    // Fix 5: use a Firestore transaction to atomically check status and claim it for refund.
    // Two simultaneous admin refund clicks can no longer both pass the status guard and both
    // call PawaPay — only the first one gets through; the second sees 'refund_pending'.
    type OrderSnapshot = {
        status: string;
        amount: number;
        currency: string;
        depositId: string;
        guestEmail?: string;
        isFree?: boolean;
    };

    let order: OrderSnapshot | null = null;
    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(orderRef);
            if (!snap.exists) throw new Error('not_found');

            const data = snap.data() as OrderSnapshot;
            if (data.status === 'refunded') throw new Error('already_refunded');
            if (data.status === 'refund_pending') throw new Error('already_pending');
            if (data.status !== 'paid') throw new Error(`bad_status:${data.status}`);

            // Atomically move to refund_pending so no second request can sneak through
            tx.update(orderRef, {
                status: 'refund_pending',
                updatedAt: new Date().toISOString(),
                refundInitiatedBy: ADMIN_EMAIL,
            });
            order = data;
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown';
        if (msg === 'not_found') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (msg === 'already_refunded') return NextResponse.json({ error: 'Order has already been refunded' }, { status: 400 });
        if (msg === 'already_pending') return NextResponse.json({ error: 'Refund already in progress' }, { status: 400 });
        if (msg.startsWith('bad_status:')) {
            const s = msg.split(':')[1];
            return NextResponse.json({ error: `Cannot refund an order with status: ${s}` }, { status: 400 });
        }
        console.error('[Admin Refund] Transaction error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const o = order as unknown as OrderSnapshot;

    if (o.isFree || o.amount === 0) {
        // Free tickets — no payment to reverse, just mark refunded
        const now = new Date().toISOString();
        const batch = db.batch();
        batch.update(orderRef, { status: 'refunded', updatedAt: now });
        const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
        ticketsSnap.docs.forEach((d) => batch.update(d.ref, { status: 'refunded', refundConfirmedAt: now }));
        await batch.commit();
        return NextResponse.json({ success: true, message: 'Free ticket cancelled' });
    }

    // Initiate refund via PawaPay
    const refundId = `ref-${crypto.randomUUID()}`;
    const pawapayPayload = {
        refundId,
        depositId: o.depositId,
        amount: o.amount.toString(),
        metadata: [{ fieldName: 'orderId', fieldValue: orderId, isPII: false }],
    };

    const pawapayRes = await fetch(`${PAWAPAY_API_BASE}/refunds`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}`,
        },
        body: JSON.stringify(pawapayPayload),
    });

    if (!pawapayRes.ok) {
        const detail = await pawapayRes.json().catch(() => ({}));
        console.error('[Admin Refund] PawaPay rejected refund — reverting order to paid:', detail);
        // Revert status so admin can retry
        await orderRef.update({ status: 'paid', updatedAt: new Date().toISOString() }).catch(() => null);
        return NextResponse.json(
            { error: 'Refund request rejected by payment provider', detail },
            { status: pawapayRes.status }
        );
    }

    // PawaPay accepted — store the refundId; webhook will set final status to 'refunded'
    await orderRef.update({ refundId, updatedAt: new Date().toISOString() });

    return NextResponse.json({ success: true, refundId, message: 'Refund initiated — awaiting provider confirmation' });
}
