import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "admin@eventa.africa";

async function verifyAdminToken(request: Request): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;
    const idToken = authHeader.slice("Bearer ".length);
    try {
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const db = getAdminDb();

        const [eventsSnap, ordersSnap] = await Promise.all([
            db.collection("events").get(),
            db.collection("orders").get(),
        ]);

        const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ events, orders });
    } catch (error) {
        console.error("[Admin Data API] Failed to fetch:", error);
        return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
    }
}
