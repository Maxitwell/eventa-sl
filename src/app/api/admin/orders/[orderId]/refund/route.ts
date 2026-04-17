import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

const ADMIN_EMAIL = 'admin@eventa.africa';
const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.sandbox.pawapay.io/v1';

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

    // Fetch the order
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as {
        status: string;
        amount: number;
        currency: string;
        depositId: string;
        guestEmail?: string;
        guestPhone?: string;
        isFree?: boolean;
    };

    if (order.status === 'refunded') {
        return NextResponse.json({ error: 'Order has already been refunded' }, { status: 400 });
    }

    if (order.status !== 'paid') {
        return NextResponse.json({ error: `Cannot refund an order with status: ${order.status}` }, { status: 400 });
    }

    if (order.isFree || order.amount === 0) {
        // Free tickets — no payment to reverse, just mark as refunded
        const now = new Date().toISOString();
        const batch = db.batch();
        batch.update(db.collection('orders').doc(orderId), { status: 'refunded', updatedAt: now });
        const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
        ticketsSnap.docs.forEach((d) => batch.update(d.ref, { status: 'refunded', refundConfirmedAt: now }));
        await batch.commit();
        return NextResponse.json({ success: true, message: 'Free ticket cancelled' });
    }

    // Initiate refund via PawaPay
    const refundId = `ref-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const pawapayPayload = {
        refundId,
        depositId: order.depositId,
        amount: order.amount.toString(),
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
        console.error('[Admin Refund] PawaPay error:', detail);
        return NextResponse.json(
            { error: 'Refund request rejected by payment provider', detail },
            { status: pawapayRes.status }
        );
    }

    // Mark order as refund_pending — the webhook will set it to refunded when PawaPay confirms
    await db.collection('orders').doc(orderId).update({
        status: 'refund_pending',
        refundId,
        updatedAt: new Date().toISOString(),
        refundInitiatedBy: ADMIN_EMAIL,
    });

    return NextResponse.json({ success: true, refundId, message: 'Refund initiated — awaiting provider confirmation' });
}
