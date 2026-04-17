import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { assertWebhookSecret, isWebhookReplay } from '@/lib/webhook-security';
import { sendPayoutNotificationEmail } from '@/lib/delivery';

export async function POST(request: Request) {
    try {
        if (!assertWebhookSecret(request.headers.get("x-webhook-secret"))) {
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        const body = await request.json();
        const { payoutId, status, amount, currency } = body as {
            payoutId?: string;
            status?: string;
            amount?: number;
            currency?: string;
        };

        if (!payoutId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const isReplay = await isWebhookReplay(`payout:${payoutId}:${status}`);
        if (isReplay) {
            return NextResponse.json({ success: true, message: 'Duplicate webhook ignored' });
        }

        console.log(`[PawaPay Webhook] Payout ${payoutId} → ${status}`);

        const payoutsRef = adminDb.collection('payouts');
        const snap = await payoutsRef.where('pawapayPayoutId', '==', payoutId).get();

        if (snap.empty) {
            console.warn(`[PawaPay Payout Webhook] No payout record found for ${payoutId}`);
            return NextResponse.json({ success: true, message: 'Payout record not found — noted' });
        }

        const now = new Date().toISOString();
        const resolvedStatus = status === 'COMPLETED' ? 'settled' : 'failed';

        const batch = adminDb.batch();
        let payoutData: Record<string, unknown> = {};
        snap.docs.forEach((docSnap) => {
            payoutData = docSnap.data();
            batch.update(payoutsRef.doc(docSnap.id), {
                status: resolvedStatus,
                updatedAt: now,
                ...(typeof amount === 'number' ? { settledAmount: amount } : {}),
            });
        });
        await batch.commit();

        // Notify organizer by email
        const organizerEmail = payoutData.organizerEmail as string | undefined;
        const organizerName = payoutData.organizerName as string | undefined;
        const eventName = payoutData.eventName as string | undefined;
        const payoutAmount = typeof amount === 'number' ? amount : (payoutData.amount as number ?? 0);

        if (organizerEmail && eventName) {
            await sendPayoutNotificationEmail(
                organizerEmail,
                organizerName || 'Organizer',
                eventName,
                payoutAmount,
                resolvedStatus,
                currency ?? 'Le'
            );
        }

        return NextResponse.json({ success: true, message: `Payout ${resolvedStatus}` });
    } catch (error) {
        console.error('[PawaPay Payout Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
