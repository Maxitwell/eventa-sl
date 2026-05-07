import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "admin@eventa.africa";
const VALID_STATUSES = ["published", "paused", "cancelled", "draft"] as const;

async function verifyAdminToken(request: Request): Promise<string | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const idToken = authHeader.slice("Bearer ".length);
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        return decoded.email === ADMIN_EMAIL ? decoded.uid : null;
    } catch {
        return null;
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const adminUid = await verifyAdminToken(request);
    if (!adminUid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { eventId } = await params;
    const body = await request.json();
    const { status } = body as { status: string };

    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    try {
        const db = getAdminDb();
        const now = new Date().toISOString();

        // Read previous status for the audit record
        const eventSnap = await db.collection("events").doc(eventId).get();
        const previousStatus = eventSnap.exists ? (eventSnap.data() as { status?: string }).status : null;

        await db.collection("events").doc(eventId).update({
            status,
            updatedAt: now,
            updatedBy: ADMIN_EMAIL,
        });

        // Fix 17: write an immutable audit log entry so admin actions are traceable
        await db.collection("auditLogs").add({
            action: "event_status_changed",
            adminUid,
            adminEmail: ADMIN_EMAIL,
            targetId: eventId,
            targetCollection: "events",
            previousValue: previousStatus ?? null,
            newValue: status,
            timestamp: now,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin Event Status] Failed to update:", error);
        return NextResponse.json({ error: "Failed to update event status" }, { status: 500 });
    }
}
