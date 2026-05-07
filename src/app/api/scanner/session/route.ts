import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { signScannerSession } from "@/lib/scanner-auth";
import type { NextRequest } from "next/server";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;   // 15-minute window
const LOCKOUT_MS = 60 * 60 * 1000;  // 1-hour lockout after exhausting attempts

export async function POST(request: NextRequest) {
    try {
        const { eventId, pin } = (await request.json()) as { eventId?: string; pin?: string };
        if (!eventId || !pin) {
            return NextResponse.json({ error: "Missing eventId or pin" }, { status: 400 });
        }

        // Fix 9: rate-limit PIN attempts per event + client IP to prevent brute-force.
        // A 4-6 digit numeric PIN has at most 1,000,000 combinations and was previously
        // unlimited — an attacker could enumerate it in hours.
        const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            "unknown";
        const rateLimitKey = `pin_${eventId}_${clientIp}`;
        const db = getAdminDb();
        const rateLimitRef = db.collection("pinAttempts").doc(rateLimitKey);

        type RateLimitDoc = { count: number; windowStart: number; lockedUntil?: number };
        let blocked = false;

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(rateLimitRef);
            const now = Date.now();
            const data: RateLimitDoc = snap.exists
                ? (snap.data() as RateLimitDoc)
                : { count: 0, windowStart: now };

            if (data.lockedUntil && now < data.lockedUntil) {
                blocked = true;
                return;
            }

            // Reset window if it has expired
            const inWindow = now - data.windowStart < WINDOW_MS;
            const count = inWindow ? data.count + 1 : 1;
            const windowStart = inWindow ? data.windowStart : now;

            if (count > MAX_ATTEMPTS) {
                tx.set(rateLimitRef, { count, windowStart, lockedUntil: now + LOCKOUT_MS });
                blocked = true;
            } else {
                tx.set(rateLimitRef, { count, windowStart });
            }
        });

        if (blocked) {
            return NextResponse.json(
                { error: "Too many incorrect attempts. Please wait 1 hour before trying again." },
                { status: 429 }
            );
        }

        const eventDoc = await db.collection("events").doc(eventId).get();
        if (!eventDoc.exists) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const eventData = eventDoc.data() as { doorPin?: string; title?: string };
        if (!eventData.doorPin) {
            return NextResponse.json(
                { error: "Scanner is not configured for this event yet." },
                { status: 400 }
            );
        }

        if (eventData.doorPin !== pin.toUpperCase()) {
            return NextResponse.json({ error: "Invalid Door Pin" }, { status: 401 });
        }

        // Correct PIN — clear the rate limit record for this IP+event
        await db.collection("pinAttempts").doc(rateLimitKey).delete().catch(() => null);

        const token = signScannerSession(eventId);
        return NextResponse.json({
            token,
            event: { id: eventId, title: eventData.title || "Event Gate" },
        });
    } catch (error) {
        console.error("Scanner session error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
