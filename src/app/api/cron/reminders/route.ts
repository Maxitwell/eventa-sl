import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendEventReminderEmail } from '@/lib/delivery';

/**
 * GET /api/cron/reminders
 *
 * Sends 24-hour reminder emails to all valid ticket holders for events happening tomorrow.
 * Should be called daily by Vercel Cron or an external scheduler.
 * Secured with a shared CRON_SECRET environment variable.
 */
export async function GET(request: Request) {
    const secret = new URL(request.url).searchParams.get('secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = new Date();

    // Build the date strings we want to match.
    // We try to match events whose 'date' field corresponds to tomorrow.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build candidate date strings in formats used across the codebase:
    //   "Dec 20"  (legacy MMM DD)
    //   "2025-12-20"  (ISO)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const legacyFormat = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()}`;
    const isoFormat = tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Fetch published events — we'll filter by date in memory
    const eventsSnap = await db.collection('events').where('status', '==', 'published').get();

    const targetEvents = eventsSnap.docs.filter((d) => {
        const eventDate: string = d.data().date ?? '';
        return eventDate === legacyFormat || eventDate === isoFormat || eventDate.startsWith(isoFormat);
    });

    if (targetEvents.length === 0) {
        return NextResponse.json({ success: true, message: 'No events tomorrow — nothing to send', sent: 0 });
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const eventDoc of targetEvents) {
        const event = eventDoc.data() as {
            title?: string;
            date?: string;
            time?: string;
            location?: string;
        };

        const ticketsSnap = await db
            .collection('tickets')
            .where('eventId', '==', eventDoc.id)
            .where('status', '==', 'valid')
            .get();

        const sendJobs = ticketsSnap.docs.map(async (ticketDoc) => {
            const ticket = ticketDoc.data() as {
                guestEmail?: string;
                guestName?: string;
                qrCode?: string;
                userId?: string;
            };

            let recipientEmail = ticket.guestEmail;
            let recipientName = ticket.guestName || 'Guest';

            // For registered users, look up their profile email
            if (!recipientEmail && ticket.userId && !ticket.userId.startsWith('guest_')) {
                try {
                    const userSnap = await db.collection('users').doc(ticket.userId).get();
                    if (userSnap.exists) {
                        const user = userSnap.data() as { email?: string; name?: string };
                        recipientEmail = user.email;
                        recipientName = user.name || recipientName;
                    }
                } catch {
                    // skip if user lookup fails
                }
            }

            if (!recipientEmail || !ticket.qrCode) return null;

            return sendEventReminderEmail(
                recipientEmail,
                recipientName,
                event.title ?? 'Your Event',
                event.date ?? '',
                event.time ?? '',
                event.location ?? '',
                ticket.qrCode
            );
        });

        const results = await Promise.allSettled(sendJobs);
        results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) totalSent++;
            else totalFailed++;
        });
    }

    console.log(`[Cron Reminders] Sent: ${totalSent}, Failed: ${totalFailed}`);
    return NextResponse.json({ success: true, sent: totalSent, failed: totalFailed });
}
