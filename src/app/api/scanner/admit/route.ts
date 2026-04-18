import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyScannerSession } from "@/lib/scanner-auth";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);
    const claims = verifyScannerSession(token);

    const { eventId, ticketId } = (await request.json()) as {
      eventId?: string;
      ticketId?: string;
    };
    if (!eventId || !ticketId || eventId !== claims.eventId) {
      return NextResponse.json({ error: "Invalid request scope" }, { status: 403 });
    }

    const adminDb = getAdminDb();
    const result = await adminDb.runTransaction(async (tx) => {
      const ticketRef = adminDb.collection("tickets").doc(ticketId);
      const ticketSnap = await tx.get(ticketRef);
      if (!ticketSnap.exists) return { ok: false, message: "Ticket not found in system." };

      const ticket = ticketSnap.data() as { eventId?: string; status?: string; guestName?: string; ticketType?: string };
      const guestName = ticket.guestName || "Guest";
      const ticketType = ticket.ticketType || "Standard";
      if (ticket.eventId !== eventId) return { ok: false, message: "Ticket is for a different event!", guestName, ticketType };
      if (ticket.status === "used") return { ok: false, message: "Already Scanned!", guestName, ticketType };
      if (ticket.status !== "valid") return { ok: false, message: `Ticket is ${(ticket.status || "invalid").toUpperCase()}`, guestName, ticketType };

      tx.update(ticketRef, { status: "used", usedAt: new Date().toISOString() });
      return { ok: true, message: "Admitted", guestName, ticketType };
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Scanner admit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
