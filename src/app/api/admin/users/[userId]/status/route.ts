import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "admin@eventa.africa";

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
    { params }: { params: Promise<{ userId: string }> }
) {
    const adminUid = await verifyAdminToken(request);
    if (!adminUid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { disabled } = body as { disabled: boolean };

    if (typeof disabled !== "boolean") {
        return NextResponse.json({ error: "Invalid request: 'disabled' must be a boolean" }, { status: 400 });
    }

    if (userId === ADMIN_EMAIL) {
        return NextResponse.json({ error: "Cannot modify the super admin account" }, { status: 403 });
    }

    try {
        await getAdminAuth().updateUser(userId, { disabled });

        // Fix 17: write an immutable audit log entry so user enable/disable actions are traceable
        await getAdminDb().collection("auditLogs").add({
            action: disabled ? "user_disabled" : "user_enabled",
            adminUid,
            adminEmail: ADMIN_EMAIL,
            targetId: userId,
            targetCollection: "users",
            previousValue: !disabled,
            newValue: disabled,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Admin User Status] Failed to update:", error);
        return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }
}
