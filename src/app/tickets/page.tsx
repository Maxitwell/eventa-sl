"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { TicketCard } from "@/components/shared/TicketCard";
import { EventCard } from "@/components/shared/EventCard";
import { useRouter } from "next/navigation";
import { Ticket, Heart, Settings, PlusCircle } from "lucide-react";
import Link from "next/link";
import { getUserTickets, TicketEntity, getEventsByIds, EventEntity } from "@/lib/db";

export default function MyTickets() {
    const { isLoggedIn, currentUser } = useAuth();
    const router = useRouter();
    const [myTickets, setMyTickets] = useState<TicketEntity[]>([]);
    const [savedEventsList, setSavedEventsList] = useState<EventEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            try {
                const [tickets, saved] = await Promise.all([
                    getUserTickets(currentUser.id),
                    currentUser.savedEvents && currentUser.savedEvents.length > 0 
                        ? getEventsByIds(currentUser.savedEvents) 
                        : Promise.resolve([])
                ]);
                setMyTickets(tickets);
                setSavedEventsList(saved);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isLoggedIn && currentUser) {
            fetchData();
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
                    <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets yet</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            Looks like you haven't bought any tickets. Head over to Discover to find amazing events!
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-sm"
                        >
                            Discover Events
                        </button>
                    </div>
                )}

                {/* Saved Events Section */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        Saved Events
                        {currentUser?.savedEvents && currentUser.savedEvents.length > 0 && (
                            <span className="bg-orange-100 text-orange-600 text-xs px-2.5 py-0.5 rounded-full">
                                {currentUser.savedEvents.length}
                            </span>
                        )}
                    </h2>
                    
                    {savedEventsList.length > 0 && currentUser?.savedEvents?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedEventsList
                                .filter(event => currentUser?.savedEvents?.includes(event.id))
                                .map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center shadow-sm">
                            <Heart size={32} className="mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No saved events</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                Events you favorite will appear here so you can easily buy tickets later.
                            </p>
                            <Link href="/" className="inline-block mt-4 text-orange-600 font-bold hover:text-orange-700 text-sm">
                                Browse Events
                            </Link>
                        </div>
                    )}
                </section>

                {/* Account Settings */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
                    <Link href="/profile" className="block bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:border-orange-200 hover:shadow-md transition group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-600 transition shrink-0">
                                <Settings size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition">Profile & Security</h3>
                                <p className="text-gray-500 text-sm">Update your personal information and change your password.</p>
                            </div>
                        </div>
                    </Link>
                </section>

                {/* Host CTA */}
                <section className="mt-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10">
                        <PlusCircle size={48} className="mx-auto mb-6 text-white/90" />
                        <h2 className="text-3xl font-extrabold mb-3">Become an Organizer</h2>
                        <p className="text-white/90 max-w-lg mx-auto mb-8 text-lg">
                            Ready to host your own event? Switch to an organizer profile and start selling tickets on Eventa today.
                        </p>
                        <Link 
                            href="/events/create" 
                            className="inline-block bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                        >
                            Create Your Own Event
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
