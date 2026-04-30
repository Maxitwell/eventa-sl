import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateTwilioSignature } from "@/lib/twilio";

const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1';
const PAGE_SIZE = 10;

type CachedTicketTier = {
    name: string;
    price: number;
};

type CachedEvent = {
    id: string;
    title: string;
    date: string;
    location: string;
    currency: string;
    tickets: CachedTicketTier[];
};

type SessionState = {
    step: "browsing" | "ticket_selection" | "event_selected" | "payment_pending";
    // ticket_selection state
    pendingEventId?: string;
    pendingEventName?: string;
    pendingTickets?: CachedTicketTier[];
    pendingCurrency?: string;
    // event_selected / payment_pending state
    eventId?: string;
    eventName?: string;
    ticketType?: string;
    price?: number;
    currency?: string;
    depositId?: string;
    /** Full cached event list — avoids re-fetching on "buy N" or "more" */
    eventsList?: CachedEvent[];
    /** Current pagination offset (multiples of PAGE_SIZE) */
    eventsPage?: number;
    updatedAt?: string;
};

// ── Firestore session helpers ─────────────────────────────────────────────────

async function getSession(from: string): Promise<SessionState> {
    const db = getAdminDb();
    const doc = await db.collection('whatsapp_sessions').doc(sanitizeDocId(from)).get();
    if (!doc.exists) return { step: 'browsing' };
    return doc.data() as SessionState;
}

async function setSession(from: string, session: SessionState): Promise<void> {
    const db = getAdminDb();
    await db.collection('whatsapp_sessions').doc(sanitizeDocId(from)).set({
        ...session,
        updatedAt: new Date().toISOString(),
    });
}

async function resetSession(from: string): Promise<void> {
    await setSession(from, { step: 'browsing' });
}

/** Firestore doc IDs cannot contain '/' — strip the prefix Twilio adds */
function sanitizeDocId(from: string): string {
    return from.replace(/[:/]/g, '_');
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const text = await req.text();
        const params = new URLSearchParams(text);

        // Validate the request came from Twilio (skip in dev if no credentials set)
        if (process.env.TWILIO_AUTH_TOKEN) {
            const signature = req.headers.get("x-twilio-signature") ?? "";
            // x-forwarded-host is the real public domain on Vercel/proxied environments
            const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
            const baseUrl = (process.env.APP_URL ?? `https://${host}`).replace(/\/$/, "");
            const url = `${baseUrl}/api/whatsapp`;
            const paramMap: Record<string, string> = {};
            params.forEach((v, k) => { paramMap[k] = v; });
            const valid = validateTwilioSignature(url, paramMap, signature);
            if (!valid) {
                console.error("[WhatsApp] Sig fail — url used:", url, "host header:", host, "APP_URL:", process.env.APP_URL);
                return new NextResponse("Forbidden", { status: 403 });
            }
        }

        const from = params.get("From"); // e.g. "whatsapp:+23276123456"
        const body = params.get("Body")?.trim() ?? "";
        const lowerBody = body.toLowerCase();

        if (!from) {
            return new NextResponse("Missing From parameter", { status: 400 });
        }

        const WELCOME_MSG =
            "Welcome to *Eventa SL* 🎟️\n\n" +
            "Reply *1* to browse upcoming events.\n" +
            "Reply *2* to view your active tickets.\n" +
            "Reply *3* for Support.";

        let responseMessage = WELCOME_MSG;

        // ── Reset triggers ────────────────────────────────────────────────────
        if (["hi", "hello", "hey", "menu"].includes(lowerBody)) {
            await resetSession(from);
            return twimlResponse(WELCOME_MSG);
        }

        const session = await getSession(from);

        // ── Step: browsing ────────────────────────────────────────────────────
        if (session.step === "browsing") {
            if (lowerBody === "1" || lowerBody === "more") {
                try {
                    let allEvents: CachedEvent[] = session.eventsList ?? [];
                    let page = session.eventsPage ?? 0;

                    // On "1" always re-fetch and reset to page 0
                    if (lowerBody === "1" || allEvents.length === 0) {
                        const db = getAdminDb();
                        const snap = await db.collection('events')
                            .where('status', '==', 'published')
                            .get();
                        allEvents = snap.docs
                            .map(d => ({ id: d.id, ...d.data() as any }))
                            .sort((a: any, b: any) => (a.date ?? '').localeCompare(b.date ?? ''))
                            .map((e: any) => ({
                                id: e.id,
                                title: e.title,
                                date: e.date,
                                location: e.location,
                                currency: e.currency || 'NLe',
                                tickets: Array.isArray(e.tickets) && e.tickets.length > 0
                                    ? e.tickets.map((t: any) => ({ name: t.name, price: t.price }))
                                    : [{ name: 'General Admission', price: e.price ?? 0 }],
                            }));
                        console.log(`[WhatsApp] Fetched ${snap.docs.length} published events, showing page 0 (${allEvents.slice(0, PAGE_SIZE).length} items)`);
                        page = 0;
                    } else {
                        // "more" — advance to next page
                        page = page + 1;
                    }

                    const pageEvents = allEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                    const hasMore = allEvents.length > (page + 1) * PAGE_SIZE;

                    await setSession(from, { ...session, step: 'browsing', eventsList: allEvents, eventsPage: page });

                    if (pageEvents.length > 0) {
                        const start = page * PAGE_SIZE;
                        responseMessage = "✨ *Upcoming Events* ✨\n\n";
                        pageEvents.forEach((ev, i) => {
                            const prices = ev.tickets.map(t => t.price);
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            const priceStr = minPrice === maxPrice
                                ? `${ev.currency} ${minPrice}`
                                : `${ev.currency} ${minPrice} – ${maxPrice}`;
                            responseMessage +=
                                `${start + i + 1}. *${ev.title}*\n` +
                                `📅 ${ev.date}\n` +
                                `📍 ${ev.location}\n` +
                                `💰 ${priceStr}\n\n`;
                        });
                        responseMessage += `Reply *buy [number]* to get tickets (e.g. _buy 1_).`;
                        if (hasMore) responseMessage += `\nReply *more* to see more events.`;
                    } else {
                        responseMessage = "No upcoming events right now. Check back later!";
                    }
                } catch (err) {
                    console.error("[WhatsApp] Failed to load events:", err);
                    responseMessage = "Oops, couldn't load events. Please try again.";
                }

            } else if (lowerBody === "2") {
                // Show real tickets for this WA number if any
                try {
                    const db = getAdminDb();
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;
                    const snap = await db.collection('tickets')
                        .where('userId', '==', waUserId)
                        .where('status', '==', 'valid')
                        .limit(5)
                        .get();

                    if (snap.empty) {
                        responseMessage = "You don't have any active tickets yet.\n\nReply *1* to browse events.";
                    } else {
                        responseMessage = "🎟️ *Your Active Tickets*\n\n";
                        snap.docs.forEach((d) => {
                            const t = d.data();
                            responseMessage +=
                                `*${t.eventName ?? 'Event'}*\n` +
                                `Type: ${t.ticketType ?? 'GA'}\n` +
                                `ID: ${d.id.slice(-8).toUpperCase()}\n` +
                                `QR: ${t.qrCode ?? 'N/A'}\n\n`;
                        });
                        responseMessage += "Show the QR code at the entrance.";
                    }
                } catch {
                    responseMessage = "Couldn't fetch your tickets. Please try again.";
                }

            } else if (lowerBody.startsWith("buy ")) {
                const eventNum = parseInt(lowerBody.split(" ")[1]);
                const cachedList = session.eventsList ?? [];

                if (!cachedList.length) {
                    responseMessage = "Please reply *1* first to see the event list, then use *buy [number]*.";
                } else if (!cachedList[eventNum - 1]) {
                    responseMessage = `Invalid number. Choose between 1 and ${cachedList.length}.`;
                } else {
                    const ev = cachedList[eventNum - 1];
                    if (ev.tickets.length === 1) {
                        // Only one tier — go straight to payment
                        await setSession(from, {
                            ...session,
                            step: 'event_selected',
                            eventId: ev.id,
                            eventName: ev.title,
                            ticketType: ev.tickets[0].name,
                            price: ev.tickets[0].price,
                            currency: ev.currency,
                        });
                        responseMessage =
                            `Great choice! Checkout for *${ev.title}*.\n\n` +
                            `🎟️ Ticket: ${ev.tickets[0].name}\n` +
                            `💰 Price: ${ev.currency} ${ev.tickets[0].price}\n\n` +
                            `Please reply with your *Mobile Money number* (e.g. _076123456_) to receive the payment prompt.`;
                    } else {
                        // Multiple tiers — ask user to pick one
                        await setSession(from, {
                            ...session,
                            step: 'ticket_selection',
                            pendingEventId: ev.id,
                            pendingEventName: ev.title,
                            pendingTickets: ev.tickets,
                            pendingCurrency: ev.currency,
                        });
                        responseMessage = `🎟️ *${ev.title}*\n\nChoose your ticket type:\n\n`;
                        ev.tickets.forEach((t, i) => {
                            responseMessage += `${i + 1}. ${t.name} — ${ev.currency} ${t.price}\n`;
                        });
                        responseMessage += `\nReply with the number (e.g. _1_) to select.\nReply *back* to go back.`;
                    }
                }

            } else if (lowerBody === "3") {
                responseMessage = "📞 *Support*\n\nContact us:\n• WhatsApp: +232 76 000 000\n• Email: support@eventa.sl\n\nReply *menu* to go back.";
            } else {
                responseMessage = WELCOME_MSG;
            }

        // ── Step: ticket_selection — user picks a tier ───────────────────────
        } else if (session.step === "ticket_selection") {
            if (lowerBody === "back" || lowerBody === "cancel") {
                await resetSession(from);
                responseMessage = "Cancelled. Reply *1* to browse events.";
            } else {
                const tierNum = parseInt(lowerBody);
                const tiers = session.pendingTickets ?? [];
                if (!tierNum || !tiers[tierNum - 1]) {
                    responseMessage = `Please reply with a number between 1 and ${tiers.length}, or *back* to go back.`;
                } else {
                    const chosen = tiers[tierNum - 1];
                    await setSession(from, {
                        ...session,
                        step: 'event_selected',
                        eventId: session.pendingEventId,
                        eventName: session.pendingEventName,
                        ticketType: chosen.name,
                        price: chosen.price,
                        currency: session.pendingCurrency,
                    });
                    responseMessage =
                        `Great choice! Checkout for *${session.pendingEventName}*.\n\n` +
                        `🎟️ Ticket: ${chosen.name}\n` +
                        `💰 Price: ${session.pendingCurrency} ${chosen.price}\n\n` +
                        `Please reply with your *Mobile Money number* (e.g. _076123456_) to receive the payment prompt.`;
                }
            }

        // ── Step: event_selected — awaiting MoMo number ───────────────────────
        } else if (session.step === "event_selected") {
            if (lowerBody === "cancel" || lowerBody === "back") {
                await resetSession(from);
                responseMessage = "Checkout cancelled. Reply *1* to browse events.";
            } else {
                const digitsOnly = body.replace(/\D/g, '');
                if (digitsOnly.length >= 6) {
                    // Format phone with Sierra Leone country code
                    let phone = digitsOnly;
                    if (!phone.startsWith('232')) phone = '232' + phone.replace(/^0+/, '');

                    const depositId = `wa-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;
                    const db = getAdminDb();

                    // Create a pending ticket so the deposit webhook can activate it
                    const ticketRef = db.collection('tickets').doc();
                    const now = new Date().toISOString();
                    const qrValue = `WA-${ticketRef.id.slice(-8).toUpperCase()}`;
                    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrValue)}&size=300`;

                    await ticketRef.set({
                        eventId: session.eventId,
                        eventName: session.eventName,
                        userId: waUserId,
                        ticketType: session.ticketType ?? 'General Admission',
                        status: 'payment_pending',
                        pawapayDepositId: depositId,
                        qrCode: qrCodeUrl,
                        purchaseDate: now,
                        guestPhone: phone,
                        channel: 'whatsapp',
                        waFrom: from,
                    });

                    // Create a pending order
                    await db.collection('orders').doc(depositId).set({
                        eventId: session.eventId,
                        eventName: session.eventName,
                        userId: waUserId,
                        amount: session.price ?? 0,
                        currency: session.currency ?? 'SLE',
                        status: 'pending',
                        channel: 'whatsapp',
                        waFrom: from,
                        createdAt: now,
                        updatedAt: now,
                    });

                    // Initiate PawaPay deposit
                    let pawapayOk = false;
                    try {
                        const pawapayPayload = {
                            depositId,
                            amount: String(session.price ?? 0),
                            currency: 'SLE',
                            country: 'SLE',
                            correspondent: 'ORANGE_SLE',
                            payer: { type: 'MSISDN', address: { value: phone } },
                            statementDescription: `Eventa: ${String(session.eventName ?? '').slice(0, 22)}`,
                            customerTimestamp: new Date().toISOString(),
                            metadata: [
                                { fieldName: 'channel', fieldValue: 'whatsapp', isPII: false },
                                { fieldName: 'waFrom', fieldValue: from, isPII: true },
                            ],
                        };

                        const ppRes = await fetch(`${PAWAPAY_API_BASE}/deposits`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}`,
                            },
                            body: JSON.stringify(pawapayPayload),
                        });

                        pawapayOk = ppRes.ok;
                        if (!ppRes.ok) {
                            const detail = await ppRes.json().catch(() => ({}));
                            console.error('[WhatsApp PawaPay] deposit error:', detail);
                        }
                    } catch (err) {
                        console.error('[WhatsApp PawaPay] fetch error:', err);
                    }

                    if (pawapayOk) {
                        await setSession(from, {
                            ...session,
                            step: 'payment_pending',
                            depositId,
                        });
                        responseMessage =
                            `💳 *Payment prompt sent!*\n\n` +
                            `A USSD push was sent to *${body.trim()}*.\n\n` +
                            `Please enter your MoMo PIN to approve the payment.\n\n` +
                            `Once approved, reply *status* to confirm your ticket.\n` +
                            `Reply *cancel* to abort.`;
                    } else {
                        // Clean up pending docs on PawaPay failure
                        await ticketRef.delete().catch(() => null);
                        await db.collection('orders').doc(depositId).delete().catch(() => null);
                        responseMessage =
                            `Sorry, we couldn't send the payment prompt. ` +
                            `Please check your number and try again, or reply *3* for support.`;
                    }
                } else {
                    responseMessage = "Please enter a valid Mobile Money number (digits only).";
                }
            }

        // ── Step: payment_pending — awaiting approval ─────────────────────────
        } else if (session.step === "payment_pending") {
            if (lowerBody === "cancel") {
                // Attempt to cancel the PawaPay deposit
                if (session.depositId) {
                    try {
                        await fetch(`${PAWAPAY_API_BASE}/deposits/cancel/${session.depositId}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}` },
                        });
                    } catch { /* ignore */ }

                    const db = getAdminDb();
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;
                    const snap = await db.collection('tickets')
                        .where('pawapayDepositId', '==', session.depositId)
                        .where('userId', '==', waUserId)
                        .get();
                    const batch = db.batch();
                    snap.docs.forEach((d) => batch.update(d.ref, { status: 'cancelled' }));
                    await batch.commit();
                    await db.collection('orders').doc(session.depositId).update({ status: 'cancelled', updatedAt: new Date().toISOString() }).catch(() => null);
                }
                await resetSession(from);
                responseMessage = "Checkout cancelled. Reply *1* to browse events.";

            } else if (["status", "check", "done", "confirm", "confirmed"].includes(lowerBody)) {
                if (!session.depositId) {
                    await resetSession(from);
                    responseMessage = "Session expired. Reply *1* to browse events.";
                } else {
                    const db = getAdminDb();
                    const orderSnap = await db.collection('orders').doc(session.depositId).get();
                    const orderStatus = orderSnap.exists ? orderSnap.data()?.status : 'unknown';

                    if (orderStatus === 'paid') {
                        // Payment confirmed by webhook — fetch ticket details
                        const waUserId = `wa_${from.replace(/\D/g, '')}`;
                        const ticketSnap = await db.collection('tickets')
                            .where('pawapayDepositId', '==', session.depositId)
                            .where('userId', '==', waUserId)
                            .limit(1)
                            .get();

                        const ticketData = ticketSnap.docs[0]?.data();
                        await resetSession(from);

                        responseMessage =
                            `✅ *Payment Confirmed!*\n\n` +
                            `Here is your ticket for *${session.eventName}*\n\n` +
                            `🎟️ Type: ${ticketData?.ticketType ?? session.ticketType ?? 'GA'}\n` +
                            `🆔 ID: ${ticketSnap.docs[0]?.id.slice(-8).toUpperCase() ?? 'N/A'}\n` +
                            `📷 QR: ${ticketData?.qrCode ?? 'N/A'}\n\n` +
                            `Show the QR code at the entrance. See you there! 🎉\n\n` +
                            `Reply *menu* to start over.`;
                    } else if (orderStatus === 'failed') {
                        await resetSession(from);
                        responseMessage =
                            `❌ Payment failed or expired.\n\n` +
                            `Reply *1* to try again, or *3* for support.`;
                    } else {
                        // Still pending
                        responseMessage =
                            `⏳ Payment is still pending for *${session.eventName}*.\n\n` +
                            `Please approve the USSD prompt on your phone, then reply *status* again.\n` +
                            `Reply *cancel* to abort.`;
                    }
                }
            } else {
                responseMessage =
                    `⏳ Waiting for payment for *${session.eventName}*.\n\n` +
                    `• Reply *status* to check if payment went through.\n` +
                    `• Reply *cancel* to abort checkout.`;
            }
        }

        return twimlResponse(responseMessage);

    } catch (error) {
        console.error("Twilio Webhook Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function twimlResponse(message: string): NextResponse {
    const twiml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response><Message><Body>${escapeXml(message)}</Body></Message></Response>`;
    return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
    });
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
