import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import { TicketCard } from "@/components/shared/TicketCard";
import type { TicketEntity } from "@/lib/db";
import type { Metadata } from "next";

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const db = getAdminDb();
    const snap = await db.collection("tickets").doc(id).get();
    const eventName = snap.exists ? (snap.data()?.eventName as string) : "Ticket";
    return { title: `${eventName} — Eventa Ticket` };
}

export default async function PublicTicketPage({ params }: Props) {
    const { id } = await params;
    const db = getAdminDb();
    const snap = await db.collection("tickets").doc(id).get();

    if (!snap.exists) notFound();

    const data = snap.data() as Record<string, unknown>;

    // Only expose tickets that are in a terminal valid state
    if (!["valid", "used"].includes(data.status as string)) notFound();

    const ticket: TicketEntity = {
        id: snap.id,
        eventId: data.eventId as string,
        userId: data.userId as string,
        eventName: data.eventName as string,
        ticketType: data.ticketType as string,
        date: (data.date as string) || "",
        time: (data.time as string) || "",
        location: (data.location as string) || "",
        purchaseDate: data.purchaseDate as string,
        qrCode: data.qrCode as string,
        status: data.status as TicketEntity["status"],
        pricePaid: (data.pricePaid as number) ?? 0,
        guestName: data.guestName as string | undefined,
        guestEmail: data.guestEmail as string | undefined,
        guestPhone: data.guestPhone as string | undefined,
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
            <div className="w-full max-w-sm">
                <p className="text-center text-sm text-gray-500 mb-6">
                    Save or screenshot your QR code to use at the entrance.
                </p>
                <TicketCard ticket={ticket} />
            </div>
        </div>
    );
}
