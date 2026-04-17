import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

/**
 * GET /api/dashboard/data?type=orders|attendees&eventId=xxx
 *
 * Organizer-scoped data fetch using Admin SDK.
 * Requires a valid Firebase ID token in Authorization header.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    let uid: string;
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        uid = decoded.uid;
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'orders';
    const eventId = searchParams.get('eventId');

    const db = getAdminDb();

    // Verify the requester is actually an organizer with at least one event
    const ownedEventsSnap = await db
        .collection('events')
        .where('organizerId', '==', uid)
        .get();

    const ownedEventIds = ownedEventsSnap.docs.map((d) => d.id);

    if (type === 'orders') {
        if (ownedEventIds.length === 0) {
            return NextResponse.json({ orders: [] });
        }

        // Firestore 'in' supports up to 30 values; chunk if needed
        const chunkSize = 30;
        const allOrders: Record<string, unknown>[] = [];
        for (let i = 0; i < ownedEventIds.length; i += chunkSize) {
            const chunk = ownedEventIds.slice(i, i + chunkSize);
            const snap = await db
                .collection('orders')
                .where('eventId', 'in', chunk)
                .get();
            snap.docs.forEach((d) => allOrders.push({ id: d.id, ...d.data() }));
        }

        return NextResponse.json({ orders: allOrders });
    }

    if (type === 'attendees') {
        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required for attendees query' }, { status: 400 });
        }
        if (!ownedEventIds.includes(eventId)) {
            return NextResponse.json({ error: 'Forbidden — you do not own this event' }, { status: 403 });
        }

        const ticketsSnap = await db
            .collection('tickets')
            .where('eventId', '==', eventId)
            .get();

        const attendees = ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return NextResponse.json({ attendees });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
}
