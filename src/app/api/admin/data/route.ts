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
        const adminAuth = getAdminAuth();

        // Fetch Firestore collections and Firebase Auth users in parallel
        const [eventsSnap, ordersSnap, usersSnap, authList] = await Promise.all([
            db.collection("events").get(),
            db.collection("orders").get(),
            db.collection("users").get(),
            adminAuth.listUsers(1000),
        ]);

        const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Build a map of uid → Firebase Auth record for quick lookup
        const authUserMap = new Map(authList.users.map((u) => [u.uid, u]));

        // Merge Firestore user profiles with Auth metadata (disabled status, last sign-in)
        const users = usersSnap.docs.map((d) => {
            const profile = d.data();
            const authUser = authUserMap.get(d.id);
            return {
                id: d.id,
                ...profile,
                disabled: authUser?.disabled ?? false,
                lastSignIn: authUser?.metadata.lastSignInTime ?? null,
            };
        });

        return NextResponse.json({ events, orders, users });
    } catch (error) {
        console.error("[Admin Data API] Failed to fetch:", error);
        return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
    }
}
