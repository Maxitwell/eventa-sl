import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { signScannerSession } from "@/lib/scanner-auth";

export async function POST(request: Request) {
  try {
    const { eventId, pin } = (await request.json()) as { eventId?: string; pin?: string };
    if (!eventId || !pin) {
      return NextResponse.json({ error: "Missing eventId or pin" }, { status: 400 });
    }

    const eventDoc = await getAdminDb().collection("events").doc(eventId).get();
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
