import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "admin@eventa.africa";
const VALID_STATUSES = ["published", "paused", "cancelled", "draft"] as const;

async function verifyAdminToken(request: Request): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;
    const idToken = authHeader.slice("Bearer ".length);
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        return decoded.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
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
        await db.collection("events").doc(eventId).update({
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: ADMIN_EMAIL,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin Event Status] Failed to update:", error);
        return NextResponse.json({ error: "Failed to update event status" }, { status: 500 });
    }
}
