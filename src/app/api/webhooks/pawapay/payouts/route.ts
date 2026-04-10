import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const body = await request.json();
        
        // e.g. { payoutId: "...", status: "COMPLETED", ... }
        const { payoutId, status } = body;

        if (!payoutId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[PawaPay Webhook] Payout ${payoutId} status changed to ${status}`);

        // Handle updating event organizer payout records
        // Assuming we store payouts in a "payouts" collection
        const payoutsRef = adminDb.collection("payouts");
        const querySnapshot = await payoutsRef.where("pawapayPayoutId", "==", payoutId).get();

        if (!querySnapshot.empty) {
            const batch = adminDb.batch();
            querySnapshot.docs.forEach((docSnap) => {
                const payoutDocRef = payoutsRef.doc(docSnap.id);
                batch.update(payoutDocRef, { 
                    status: status === "COMPLETED" ? "settled" : "failed",
                    updatedAt: new Date().toISOString()
                });
            });

            await batch.commit();
        }

        return NextResponse.json({ success: true, message: 'Payout webhook processed' });
    } catch (error) {
        console.error('Error processing PawaPay payout webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
