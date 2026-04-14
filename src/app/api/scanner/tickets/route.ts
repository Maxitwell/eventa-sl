import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyScannerSession } from "@/lib/scanner-auth";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);
    const claims = verifyScannerSession(token);

    const eventId = new URL(request.url).searchParams.get("eventId");
    if (!eventId || eventId !== claims.eventId) {
      return NextResponse.json({ error: "Invalid event scope" }, { status: 403 });
    }

    const snapshot = await getAdminDb()
      .collection("tickets")
      .where("eventId", "==", eventId)
      .get();

    const tickets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Scanner tickets error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
