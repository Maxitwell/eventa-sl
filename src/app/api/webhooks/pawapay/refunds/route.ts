import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const body = await request.json();
        
        // e.g. { refundId: "...", depositId: "...", status: "COMPLETED", ... }
        const { refundId, depositId, status } = body;

        if (!depositId || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[PawaPay Webhook] Refund ${refundId} for deposit ${depositId} status: ${status}`);

        const ticketsRef = adminDb.collection("tickets");
        const querySnapshot = await ticketsRef.where("pawapayDepositId", "==", depositId).get();

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const batch = adminDb.batch();

        querySnapshot.docs.forEach((docSnap) => {
            const ticketRef = ticketsRef.doc(docSnap.id);
            
            if (status === "COMPLETED") {
                batch.update(ticketRef, { 
                    status: "refunded", 
                    refundConfirmedAt: new Date().toISOString() 
                });
            }
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Refund webhook processed' });
    } catch (error) {
        console.error('Error processing PawaPay refund webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
