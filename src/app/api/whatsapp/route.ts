import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateTwilioSignature, sendWhatsAppContentMessage } from "@/lib/twilio";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import crypto from "crypto";

const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1';
const PAGE_SIZE = 10;

// Twilio Content SIDs
const SID_WELCOME_MENU = 'HXb3c0ecd04381a81835fefe47ad58cb80';
const SID_EVENT_LIST = 'HX93ad5545279677b24b9e4dd1475780f7';
const SID_EVENT_CARD = 'HXefd9ac2e016ffde8a8ada932a195355f';
const SID_PAYMENT_PENDING = 'HXd857671a663ae84483b94902ea366c12';
const SID_TICKET_TIER = 'HXe49c578fa0af7ceeb96957eea295e5a8';

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
    imageUrl?: string;
    tickets: CachedTicketTier[];
};

type SessionState = {
    step: "browsing" | "event_preview" | "ticket_selection" | "event_selected" | "payment_pending";
    pendingEventId?: string;
    pendingEventName?: string;
    pendingTickets?: CachedTicketTier[];
    pendingCurrency?: string;
    eventId?: string;
    eventName?: string;
    ticketType?: string;
    price?: number;
    currency?: string;
    depositId?: string;
    eventsList?: CachedEvent[];
    eventsPage?: number;
    updatedAt?: string;
};

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

function sanitizeDocId(from: string): string {
    return from.replace(/[:/]/g, '_');
}

export async function POST(req: NextRequest) {
    try {
        const text = await req.text();
        const params = new URLSearchParams(text);

        if (process.env.TWILIO_AUTH_TOKEN) {
            const signature = req.headers.get("x-twilio-signature") ?? "";
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

        const from = params.get("From");
        const bodyRaw = params.get("ButtonPayload") || params.get("Body") || "";
        const body = bodyRaw.trim();
        const lowerBody = body.toLowerCase();
        const profileName = params.get("ProfileName")?.split(" ")[0] ?? "";

        if (!from) {
            return new NextResponse("Missing From parameter", { status: 400 });
        }

        const hi = profileName ? `Hello ${profileName} 👋,` : `Hello 👋,`;
        const sig = `\n\nThanks,\n_Eventa SL_ 🎟️`;

        let responseMessage = "";
        let templateSid: string | null = null;
        let templateVars: Record<string, string> = {};

        // ── Global triggers ───────────────────────────────────────────────────
        if (["hi", "hello", "hey", "menu", "main_menu"].includes(lowerBody)) {
            await resetSession(from);
            templateSid = SID_WELCOME_MENU;
            templateVars = { '1': profileName || 'there' };
            return sendFinalResponse(from, templateSid, templateVars, responseMessage);
        }

        const session = await getSession(from);

        // ── Step: browsing ────────────────────────────────────────────────────
        if (session.step === "browsing") {
            if (lowerBody === "1" || lowerBody === "browse_events" || lowerBody === "more") {
                try {
                    let allEvents: CachedEvent[] = session.eventsList ?? [];
                    let page = session.eventsPage ?? 0;

                    if (lowerBody === "1" || lowerBody === "browse_events" || allEvents.length === 0) {
                        const db = getAdminDb();
                        const snap = await db.collection('events')
                            .where('status', '==', 'published')
                            .get();
                        allEvents = snap.docs
                            .map(d => ({ id: d.id, ...d.data() as Record<string, unknown> }))
                            .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
                                ((a.date as string) ?? '').localeCompare((b.date as string) ?? ''))
                            .map((e: Record<string, unknown>) => ({
                                id: e.id as string,
                                title: e.title as string,
                                date: e.date as string,
                                location: e.location as string,
                                currency: (e.currency as string) || 'SLE',
                                imageUrl: (e.imageUrl as string) || (e.bannerUrl as string) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
                                tickets: Array.isArray(e.tickets) && (e.tickets as unknown[]).length > 0
                                    ? (e.tickets as Array<{ name: string; price: number }>).map((t) => ({ name: t.name, price: t.price }))
                                    : [{ name: 'General Admission', price: (e.price as number) ?? 0 }],
                            }));
                        page = 0;
                    } else {
                        page = page + 1;
                    }

                    const pageEvents = allEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                    const hasMore = allEvents.length > (page + 1) * PAGE_SIZE;

                    await setSession(from, { ...session, step: 'browsing', eventsList: allEvents, eventsPage: page });

                    if (pageEvents.length > 0) {
                        templateSid = SID_EVENT_LIST;
                        for (let i = 0; i < 10; i++) {
                            const ev = pageEvents[i];
                            const varTitle = `${i * 3 + 1}`;
                            const varDesc = `${i * 3 + 2}`;
                            const varId = `${i * 3 + 3}`;
                            if (ev) {
                                const prices = ev.tickets.map(t => t.price);
                                const minPrice = Math.min(...prices);
                                const maxPrice = Math.max(...prices);
                                const priceStr = minPrice === maxPrice ? `${ev.currency} ${minPrice}` : `${ev.currency} ${minPrice} - ${maxPrice}`;
                                templateVars[varTitle] = ev.title.slice(0, 24);
                                templateVars[varDesc] = `${ev.date} • ${priceStr}`.slice(0, 72);
                                templateVars[varId] = `view_event_${ev.id}`;
                            } else {
                                templateVars[varTitle] = "More events soon!";
                                templateVars[varDesc] = "Check back later";
                                templateVars[varId] = `ignore_${i}`;
                            }
                        }
                    } else {
                        responseMessage = `${hi}\n\nNo upcoming events right now. Check back soon!${sig}`;
                    }
                } catch (err) {
                    console.error("[WhatsApp] Failed to load events:", err);
                    responseMessage = `${hi}\n\nOops, we couldn't load events right now. Please try again.${sig}`;
                }

            } else if (lowerBody.startsWith("view_event_")) {
                const targetEventId = body.replace("view_event_", ""); // case sensitive
                const ev = (session.eventsList ?? []).find(e => e.id === targetEventId);
                if (!ev) {
                    responseMessage = `${hi}\n\nSorry, that event is no longer available.${sig}`;
                } else {
                    await setSession(from, { ...session, step: 'event_preview', pendingEventId: ev.id });
                    templateSid = SID_EVENT_CARD;
                    templateVars = {
                        '1': ev.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
                        '2': ev.title.slice(0, 24),
                        '3': `${ev.date} • ${ev.location}`.slice(0, 72)
                    };
                }

            } else if (lowerBody === "ignore_0" || lowerBody.startsWith("ignore_")) {
                // Do nothing if they click a placeholder, just resend the list
                templateSid = SID_EVENT_LIST; 
                const pageEvents = (session.eventsList ?? []).slice((session.eventsPage ?? 0) * PAGE_SIZE, ((session.eventsPage ?? 0) + 1) * PAGE_SIZE);
                for (let i = 0; i < 10; i++) {
                    const ev = pageEvents[i];
                    const varTitle = `${i * 3 + 1}`;
                    const varDesc = `${i * 3 + 2}`;
                    const varId = `${i * 3 + 3}`;
                    if (ev) {
                        const prices = ev.tickets.map(t => t.price);
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        const priceStr = minPrice === maxPrice ? `${ev.currency} ${minPrice}` : `${ev.currency} ${minPrice} - ${maxPrice}`;
                        templateVars[varTitle] = ev.title.slice(0, 24);
                        templateVars[varDesc] = `${ev.date} • ${priceStr}`.slice(0, 72);
                        templateVars[varId] = `view_event_${ev.id}`;
                    } else {
                        templateVars[varTitle] = "More events soon!";
                        templateVars[varDesc] = "Check back later";
                        templateVars[varId] = `ignore_${i}`;
                    }
                }

            } else if (lowerBody === "2" || lowerBody === "view_tickets") {
                try {
                    const db = getAdminDb();
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;
                    const snap = await db.collection('tickets')
                        .where('userId', '==', waUserId)
                        .where('status', '==', 'valid')
                        .limit(5)
                        .get();

                    if (snap.empty) {
                        responseMessage = `${hi}\n\nYou don't have any active tickets yet.\n\nReply *menu* to go back.${sig}`;
                    } else {
                        responseMessage = `${hi}\n\n🎟️ *Your Active Tickets*\n\n`;
                        snap.docs.forEach((d) => {
                            const t = d.data();
                            responseMessage += `*${t.eventName ?? 'Event'}*\nType: ${t.ticketType ?? 'General Admission'}\nID: *${d.id.slice(-8).toUpperCase()}*\n\n`;
                        });
                        responseMessage += `Show your QR code at the entrance.${sig}`;
                    }
                } catch {
                    responseMessage = `${hi}\n\nCouldn't fetch your tickets right now. Please try again.${sig}`;
                }

            } else if (lowerBody === "3" || lowerBody === "support") {
                responseMessage = `${hi}\n\n📞 *Customer Support*\n\nOur team is here to help you.\n\n• WhatsApp: +232 76 000 000\n• Email: support@eventa.sl\n\nReply *menu* to go back to the main menu.${sig}`;
            } else {
                templateSid = SID_WELCOME_MENU;
                templateVars = { '1': profileName || 'there' };
            }

        // ── Step: event_preview ───────────────────────────────────────────────
        } else if (session.step === "event_preview") {
            if (lowerBody === "main_menu" || lowerBody === "back") {
                await resetSession(from);
                templateSid = SID_WELCOME_MENU;
                templateVars = { '1': profileName || 'there' };
            } else if (lowerBody === "buy_ticket") {
                const ev = (session.eventsList ?? []).find(e => e.id === session.pendingEventId);
                if (!ev) {
                    await resetSession(from);
                    templateSid = SID_WELCOME_MENU;
                    templateVars = { '1': profileName || 'there' };
                } else if (ev.tickets.length === 1) {
                    await setSession(from, {
                        ...session,
                        step: 'event_selected',
                        eventId: ev.id,
                        eventName: ev.title,
                        ticketType: ev.tickets[0].name,
                        price: ev.tickets[0].price,
                        currency: ev.currency,
                    });
                    responseMessage = `${hi}\n\nYou're booking for *${ev.title}*.\n\n🎟️ Ticket: *${ev.tickets[0].name}*\n💰 Price: *${ev.currency} ${ev.tickets[0].price}*\n\nPlease reply with your *Orange Money number* to receive the payment prompt.\n_e.g. 076123456_${sig}`;
                } else {
                    await setSession(from, {
                        ...session,
                        step: 'ticket_selection',
                        pendingEventId: ev.id,
                        pendingEventName: ev.title,
                        pendingTickets: ev.tickets,
                        pendingCurrency: ev.currency,
                    });
                    templateSid = SID_TICKET_TIER;
                    templateVars = {
                        '1': ev.title.slice(0, 24),
                        '2': ev.tickets[0]?.name.slice(0, 24) || 'Sold Out',
                        '3': ev.tickets[0] ? `${ev.currency} ${ev.tickets[0].price}` : 'N/A',
                        '4': ev.tickets[1]?.name.slice(0, 24) || 'Sold Out',
                        '5': ev.tickets[1] ? `${ev.currency} ${ev.tickets[1].price}` : 'N/A',
                        '6': ev.tickets[2]?.name.slice(0, 24) || 'Sold Out',
                        '7': ev.tickets[2] ? `${ev.currency} ${ev.tickets[2].price}` : 'N/A',
                    };
                }
            } else {
                responseMessage = "Please use the buttons above to buy a ticket or go back.";
            }

        // ── Step: ticket_selection ────────────────────────────────────────────
        } else if (session.step === "ticket_selection") {
            if (lowerBody === "browse_events" || lowerBody === "back" || lowerBody === "cancel") {
                await resetSession(from);
                templateSid = SID_WELCOME_MENU;
                templateVars = { '1': profileName || 'there' };
            } else if (lowerBody.startsWith("tier_")) {
                const tierIndex = parseInt(lowerBody.split('_')[1]) - 1;
                const tiers = session.pendingTickets ?? [];
                
                if (tierIndex >= 0 && tierIndex < tiers.length) {
                    const chosen = tiers[tierIndex];
                    await setSession(from, {
                        ...session,
                        step: 'event_selected',
                        eventId: session.pendingEventId,
                        eventName: session.pendingEventName,
                        ticketType: chosen.name,
                        price: chosen.price,
                        currency: session.pendingCurrency,
                    });
                    responseMessage = `${hi}\n\nYou're booking for *${session.pendingEventName}*.\n\n🎟️ Ticket: *${chosen.name}*\n💰 Price: *${session.pendingCurrency} ${chosen.price}*\n\nPlease reply with your *Orange Money number* to receive the payment prompt.\n_e.g. 076123456_${sig}`;
                } else {
                    responseMessage = "That ticket is currently unavailable. Please select another.";
                }
            } else {
                responseMessage = "Please use the menu above to select a ticket tier.";
            }

        // ── Step: event_selected ──────────────────────────────────────────────
        } else if (session.step === "event_selected") {
            if (lowerBody === "cancel" || lowerBody === "back" || lowerBody === "main_menu") {
                await resetSession(from);
                templateSid = SID_WELCOME_MENU;
                templateVars = { '1': profileName || 'there' };
            } else {
                const digitsOnly = body.replace(/\D/g, '');
                if (digitsOnly.length >= 6) {
                    let phone = digitsOnly;
                    if (!phone.startsWith('232')) phone = '232' + phone.replace(/^0+/, '');

                    const jwtSecret = process.env.JWT_SECRET;
                    if (!jwtSecret || jwtSecret.length < 32) {
                        responseMessage = "Service configuration error. Please try again later.";
                        return sendFinalResponse(from, null, {}, responseMessage);
                    }

                    const db = getAdminDb();
                    const eventId = session.eventId!;
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;

                    let currentPrice = session.price ?? 0;
                    let currentCurrency = session.currency ?? 'SLE';
                    try {
                        const eventSnap = await db.collection('events').doc(eventId).get();
                        if (eventSnap.exists) {
                            const eventData = eventSnap.data() as Record<string, unknown>;
                            const tiers = eventData.tickets as Array<{ name: string; price: number }> | undefined;
                            const matchedTier = tiers?.find(t => t.name.trim().toLowerCase() === (session.ticketType ?? '').trim().toLowerCase());
                            currentPrice = matchedTier ? matchedTier.price : (typeof eventData.price === 'number' ? eventData.price : currentPrice);
                            currentCurrency = (eventData.currency as string) || currentCurrency;
                        }
                    } catch (err) {
                        console.error('[WhatsApp] Failed to re-validate price:', err);
                    }

                    const depositId = `wa-${crypto.randomUUID()}`;
                    const reservationsRef = db.collection('reservations');
                    const eventRef = db.collection('events').doc(eventId);

                    try {
                        await db.runTransaction(async (tx) => {
                            const eventDoc = await tx.get(eventRef);
                            if (!eventDoc.exists) throw new Error("Event not found");

                            const ed = eventDoc.data() as { totalCapacity?: number; capacity?: number; ticketsSold?: number };
                            const capacity = ed?.totalCapacity ?? ed?.capacity ?? 0;
                            const ticketsSold = ed?.ticketsSold || 0;

                            const activeResQuery = await tx.get(reservationsRef.where('eventId', '==', eventId));
                            const nowIso = new Date().toISOString();
                            let reservedCount = 0;
                            activeResQuery.forEach(doc => {
                                const data = doc.data();
                                if (data.expiresAt > nowIso) reservedCount += data.quantity || 0;
                            });

                            if (capacity > 0 && ticketsSold + reservedCount + 1 > capacity) {
                                throw new Error("Sorry, this event is now full.");
                            }

                            const expiry = new Date();
                            expiry.setMinutes(expiry.getMinutes() + 15);
                            tx.set(reservationsRef.doc(depositId), {
                                eventId,
                                quantity: 1,
                                expiresAt: expiry.toISOString(),
                            });
                        });
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Capacity check failed.";
                        responseMessage = `${msg} Reply *menu* to start over.`;
                        return sendFinalResponse(from, null, {}, responseMessage);
                    }

                    const ticketRef = db.collection('tickets').doc();
                    const now = new Date().toISOString();
                    const jwtPayload = { ticketId: ticketRef.id, eventId, depositId };
                    const signedToken = jwt.sign(jwtPayload, jwtSecret, { expiresIn: '5y' });
                    let qrCodeDataUrl: string;
                    try {
                        qrCodeDataUrl = await QRCode.toDataURL(signedToken, {
                            width: 300, margin: 2, color: { dark: '#111827', light: '#ffffff' },
                        });
                    } catch (err) {
                        await db.collection('reservations').doc(depositId).delete().catch(() => null);
                        responseMessage = "Couldn't generate your ticket. Please try again.";
                        return sendFinalResponse(from, null, {}, responseMessage);
                    }

                    await ticketRef.set({
                        eventId, eventName: session.eventName, userId: waUserId, ticketType: session.ticketType ?? 'General Admission', status: 'payment_pending', pawapayDepositId: depositId, orderId: depositId, qrCode: qrCodeDataUrl, pricePaid: currentPrice, purchaseDate: now, guestPhone: phone, channel: 'whatsapp', waFrom: from,
                    });

                    await db.collection('orders').doc(depositId).set({
                        depositId, eventId, eventName: session.eventName, userId: waUserId, amount: currentPrice, currency: currentCurrency, status: 'pending_payment', channel: 'whatsapp', waFrom: from, ticketIds: [ticketRef.id], lines: [{ ticketName: session.ticketType ?? 'General Admission', quantity: 1, unitPrice: currentPrice }], createdAt: now, updatedAt: now,
                    });

                    let pawapayOk = false;
                    try {
                        const pawapayPayload = {
                            depositId, amount: String(currentPrice), currency: 'SLE', country: 'SLE', correspondent: 'ORANGE_SLE', payer: { type: 'MSISDN', address: { value: phone } }, statementDescription: `Eventa: ${String(session.eventName ?? '').slice(0, 22)}`, customerTimestamp: new Date().toISOString(), metadata: [{ fieldName: 'channel', fieldValue: 'whatsapp', isPII: false }, { fieldName: 'waFrom', fieldValue: from, isPII: true }],
                        };

                        const ppRes = await fetch(`${PAWAPAY_API_BASE}/deposits`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}` }, body: JSON.stringify(pawapayPayload),
                        });
                        pawapayOk = ppRes.ok;
                    } catch (err) {
                        console.error('[WhatsApp PawaPay] fetch error:', err);
                    }

                    if (pawapayOk) {
                        await setSession(from, { ...session, step: 'payment_pending', depositId });
                        templateSid = SID_PAYMENT_PENDING;
                        templateVars = { '1': session.eventName?.slice(0,24) || 'Event' };
                    } else {
                        await ticketRef.delete().catch(() => null);
                        await db.collection('orders').doc(depositId).delete().catch(() => null);
                        await db.collection('reservations').doc(depositId).delete().catch(() => null);
                        responseMessage = `${hi}\n\nSorry, we couldn't send the payment prompt. Please check your number and try again.\n\nReply *support* for help.${sig}`;
                    }
                } else {
                    responseMessage = `${hi}\n\nPlease enter a valid Orange Money number (digits only).\n_e.g. 076123456_${sig}`;
                }
            }

        // ── Step: payment_pending ─────────────────────────────────────────────
        } else if (session.step === "payment_pending") {
            if (lowerBody === "cancel_checkout" || lowerBody === "cancel") {
                if (session.depositId) {
                    try { await fetch(`${PAWAPAY_API_BASE}/deposits/cancel/${session.depositId}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}` }}); } catch { /* ignore */ }
                    const db = getAdminDb();
                    const waUserId = `wa_${from.replace(/\D/g, '')}`;
                    const snap = await db.collection('tickets').where('pawapayDepositId', '==', session.depositId).where('userId', '==', waUserId).get();
                    const batch = db.batch();
                    snap.docs.forEach((d) => batch.update(d.ref, { status: 'cancelled' }));
                    await batch.commit();
                    await db.collection('orders').doc(session.depositId).update({ status: 'cancelled', updatedAt: new Date().toISOString() }).catch(() => null);
                    await db.collection('reservations').doc(session.depositId).delete().catch(() => null);
                }
                await resetSession(from);
                templateSid = SID_WELCOME_MENU;
                templateVars = { '1': profileName || 'there' };

            } else if (lowerBody === "check_status" || lowerBody === "status") {
                if (!session.depositId) {
                    await resetSession(from);
                    templateSid = SID_WELCOME_MENU;
                    templateVars = { '1': profileName || 'there' };
                } else {
                    const db = getAdminDb();
                    const orderSnap = await db.collection('orders').doc(session.depositId).get();
                    const orderStatus = orderSnap.exists ? orderSnap.data()?.status : 'unknown';

                    if (orderStatus === 'paid') {
                        const waUserId = `wa_${from.replace(/\D/g, '')}`;
                        const ticketSnap = await db.collection('tickets').where('pawapayDepositId', '==', session.depositId).where('userId', '==', waUserId).limit(1).get();
                        const ticketData = ticketSnap.docs[0]?.data();
                        await resetSession(from);

                        responseMessage = `${hi}\n\n✅ *Payment Confirmed!*\n\nYour ticket for *${session.eventName}* is ready.\n\n🎟️ Type: *${ticketData?.ticketType ?? session.ticketType ?? 'General Admission'}*\n🆔 Ticket ID: *${ticketSnap.docs[0]?.id.slice(-8).toUpperCase() ?? 'N/A'}*\n\nShow your QR code at the entrance. See you there! 🎉\n\nReply *menu* to go back to the main menu.${sig}`;
                    } else if (orderStatus === 'failed') {
                        await resetSession(from);
                        responseMessage = `${hi}\n\n❌ *Payment failed or expired.*\n\nPlease try again.\n\nReply *menu* to start over.${sig}`;
                    } else {
                        templateSid = SID_PAYMENT_PENDING;
                        templateVars = { '1': session.eventName?.slice(0,24) || 'Event' };
                    }
                }
            } else {
                templateSid = SID_PAYMENT_PENDING;
                templateVars = { '1': session.eventName?.slice(0,24) || 'Event' };
            }
        }

        return sendFinalResponse(from, templateSid, templateVars, responseMessage);

    } catch (error) {
        console.error("Twilio Webhook Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendFinalResponse(from: string, templateSid: string | null, templateVars: Record<string, string>, textMsg: string): Promise<NextResponse> {
    if (templateSid) {
        try {
            await sendWhatsAppContentMessage(from, templateSid, templateVars);
            return emptyTwiml();
        } catch (err) {
            console.error("[WhatsApp] Failed to send template:", err);
            // Fallback
            return twimlResponse("There was an error communicating with WhatsApp. Please reply 'menu' to restart.");
        }
    } else if (textMsg) {
        return twimlResponse(textMsg);
    }
    return emptyTwiml();
}

function emptyTwiml(): NextResponse {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    return new NextResponse(twiml, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

function twimlResponse(message: string): NextResponse {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>${escapeXml(message)}</Body></Message></Response>`;
    return new NextResponse(twiml, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/[<>&'"]/g, (c) => {
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
