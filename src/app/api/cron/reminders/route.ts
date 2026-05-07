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

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fix 16: build all reasonable date string representations of tomorrow so that events
    // stored in any common format are matched, not silently skipped.
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const month3   = MONTH_NAMES[tomorrow.getMonth()];
    const monthFull = MONTH_FULL[tomorrow.getMonth()];
    const dayNum   = tomorrow.getDate();                          // e.g. 6
    const dayPad   = String(dayNum).padStart(2, '0');             // e.g. 06
    const isoDate  = tomorrow.toISOString().split('T')[0];        // e.g. 2026-05-07

    // All formats we recognise:
    //   ISO:         "2026-05-07"
    //   ISO datetime:"2026-05-07T..."
    //   MMM D:       "May 7"
    //   MMM DD:      "May 07"
    //   Month D:     "May 7, 2026"  /  "May 7 2026"
    //   Month DD:    "May 07, 2026" / "May 07 2026"
    const candidateFormats = new Set<string>([
        isoDate,
        `${month3} ${dayNum}`,
        `${month3} ${dayPad}`,
        `${monthFull} ${dayNum}`,
        `${monthFull} ${dayPad}`,
        `${month3} ${dayNum}, ${tomorrow.getFullYear()}`,
        `${month3} ${dayPad}, ${tomorrow.getFullYear()}`,
        `${monthFull} ${dayNum}, ${tomorrow.getFullYear()}`,
        `${monthFull} ${dayPad}, ${tomorrow.getFullYear()}`,
    ]);

    const eventsSnap = await db.collection('events').where('status', '==', 'published').get();

    const targetEvents = eventsSnap.docs.filter((d) => {
        const eventDate: string = (d.data().date ?? '').trim();
        // ISO prefix match covers "2026-05-07T20:00:00+00:00" style timestamps too
        if (eventDate.startsWith(isoDate)) return true;
        return candidateFormats.has(eventDate);
    });

    if (targetEvents.length === 0) {
        console.log(`[Cron Reminders] No events match tomorrow (${isoDate}) — nothing to send`);
        return NextResponse.json({ success: true, message: 'No events tomorrow — nothing to send', sent: 0 });
    }

    console.log(`[Cron Reminders] Found ${targetEvents.length} event(s) for ${isoDate}`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

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

            if (!recipientEmail && ticket.userId && !ticket.userId.startsWith('guest_') && !ticket.userId.startsWith('wa_')) {
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

            if (!recipientEmail || !ticket.qrCode) {
                console.warn(`[Cron Reminders] Skipping ticket ${ticketDoc.id} — no email or QR code`);
                return null;
            }

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
            else if (r.status === 'fulfilled' && !r.value) totalSkipped++;
            else totalFailed++;
        });
    }

    console.log(`[Cron Reminders] Sent: ${totalSent}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);
    return NextResponse.json({ success: true, sent: totalSent, skipped: totalSkipped, failed: totalFailed });
}
