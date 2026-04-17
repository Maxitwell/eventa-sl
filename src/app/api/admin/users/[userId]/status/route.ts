import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "admin@eventa.africa";

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
    { params }: { params: Promise<{ userId: string }> }
) {
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { disabled } = body as { disabled: boolean };

    if (typeof disabled !== "boolean") {
        return NextResponse.json({ error: "Invalid request: 'disabled' must be a boolean" }, { status: 400 });
    }

    // Prevent the super admin from blocking themselves
    if (userId === ADMIN_EMAIL) {
        return NextResponse.json({ error: "Cannot modify the super admin account" }, { status: 403 });
    }

    try {
        await getAdminAuth().updateUser(userId, { disabled });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin User Status] Failed to update:", error);
        return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }
}
