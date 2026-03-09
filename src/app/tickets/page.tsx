"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { TicketCard } from "@/components/shared/TicketCard";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { getUserTickets, TicketEntity } from "@/lib/db";

export default function MyTickets() {
    const { isLoggedIn, currentUser } = useAuth();
    const router = useRouter();
    const [myTickets, setMyTickets] = useState<TicketEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            try {
                const tickets = await getUserTickets(currentUser.id);
                setMyTickets(tickets);
            } catch (error) {
                console.error("Failed to load tickets", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isLoggedIn && currentUser) {
            fetchTickets();
        } else if (!isLoggedIn) {
            setIsLoading(false);
            router.push("/login?redirect=/tickets");
        }
    }, [isLoggedIn, currentUser, router]);


    const validTickets = myTickets.filter(t => t.status === "valid");
    const pastTickets = myTickets.filter(t => t.status === "used");

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <Ticket size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        My Tickets
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage your digital passes and upcoming events.
                    </p>
                </div>
            </div>

            <div className="space-y-12">
                {validTickets.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Upcoming Events
                            <span className="bg-orange-100 text-orange-600 text-xs px-2.5 py-0.5 rounded-full">
                                {validTickets.length}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {validTickets.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} />
                            ))}
                        </div>
                    </section>
                )}

                {pastTickets.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-6 opacity-60">
                            Past Events
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastTickets.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} />
                            ))}
                        </div>
                    </section>
                )}

                {myTickets.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                        <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets yet</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            Looks like you haven't bought any tickets. Head over to Discover to find amazing events!
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition"
                        >
                            Discover Events
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
