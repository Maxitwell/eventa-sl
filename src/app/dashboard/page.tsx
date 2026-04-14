"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { Plus, BarChart, Users, Settings, LogOut, Ticket, Heart, MapPin, Calendar, ScanLine, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getOrganizerEvents, updateEventStatus, EventEntity } from "@/lib/db";

export default function Dashboard() {
    const { currentUser, logout, isLoggedIn, isLoading: isAuthLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");
    const [events, setEvents] = useState<EventEntity[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);

    // Temporary helper for seeding Events list to Firebase in DEV
    const handleSeedDatabase = async () => {
        try {
            const { seedEventsToFirestore } = await import('@/lib/seed');
            const success = await seedEventsToFirestore();
            if (success) {
                showToast("Database seeded successfully!", "success");
            } else {
                showToast("Failed to seed database.", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Error importing seed script", "error");
        }
    };

    // Protect route using useEffect to avoid Next.js Router render collisions
    useEffect(() => {
        if (!isAuthLoading && !isLoggedIn) {
            router.push("/login");
        }
    }, [isLoggedIn, isAuthLoading, router]);

    useEffect(() => {
        if (!currentUser) return;

        const fetchEvents = async () => {
            setIsLoadingEvents(true);
            try {
                const orgEvents = await getOrganizerEvents(currentUser.id);
                // Sort by newest created
                orgEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setEvents(orgEvents);
            } catch (error) {
                console.error("Failed to load dashboard events:", error);
                showToast("Failed to load your events", "error");
            } finally {
                setIsLoadingEvents(false);
            }
        };

        fetchEvents();
    }, [currentUser]);

    if (isAuthLoading || !isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        showToast("Logged out successfully");
        router.push("/");
    };


    const handleToggleStatus = async (eventId: string | undefined, currentStatus: string | undefined) => {
        if (!eventId) return;
        try {
            const newStatus = currentStatus === "published" ? "paused" : "published";
            await updateEventStatus(eventId, newStatus as any);
            setEvents(events.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
            showToast(`Event marked as ${newStatus}`, "success");
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("Failed to update status", "error");
        }
    };

    // Analytics Calculations
    const totalTicketsSold = events.reduce((sum, e) => sum + (e.ticketsSold || 0), 0);
    const totalRevenue = events.reduce((sum, e) => sum + ((e.price || 0) * (e.ticketsSold || 0)), 0);
    const totalCapacity = events.reduce((sum, e) => sum + (e.totalCapacity || 100), 0);

    const tabs = [
        { id: "overview", name: "Overview", icon: BarChart },
        { id: "events", name: "My Events", icon: Ticket },
        { id: "attendees", name: "Attendees", icon: Users },
        { id: "settings", name: "Settings", icon: Settings },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full mb-4 flex items-center justify-center text-white text-2xl font-bold">
                        {currentUser?.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{currentUser?.name}</h2>
                    <p className="text-sm text-gray-500 truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                        Verified Organizer
                    </span>
                </div>

                <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm shrink-0",
                                    isActive
                                        ? "bg-orange-50 text-orange-600 font-bold"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon size={18} />
                                {tab.name}
                            </button>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="w-full md:mt-6 flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all text-sm mt-4 hidden md:flex"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 capitalize block">
                        {activeTab}
                    </h1>
                    <Link
                        href="/events/create"
                        className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2 text-sm"
                    >
                        <Plus size={18} /> Create Event
                    </Link>
                </div>

                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-orange-200 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
                                    <Ticket size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total Tickets Sold</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalTicketsSold.toLocaleString()}</p>
                                </div>
                                <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-orange-500/10 to-transparent rounded-tl-[100px]" />
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-green-200 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-2">
                                    <BarChart size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900">Le {totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-green-500/10 to-transparent rounded-tl-[100px]" />
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-purple-200 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Total Capacity Info</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalCapacity.toLocaleString()}</p>
                                </div>
                                <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-tl-[100px]" />
                            </div>
                        </div>

                        {/* Active Events List */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                Your Events
                                {isLoadingEvents && <span className="text-sm font-normal text-gray-400">Loading...</span>}
                            </h3>

                            {!isLoadingEvents && events.length === 0 && (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center text-gray-400 mb-4">
                                        <Ticket size={24} />
                                    </div>
                                    <h4 className="text-gray-900 font-bold mb-1">No events yet</h4>
                                    <p className="text-gray-500 text-sm mb-6 max-w-sm">You haven't created any events. Start hosting to see your analytics here!</p>
                                    <Link href="/events/create" className="text-orange-600 font-bold hover:text-orange-700">Create your first event</Link>
                                </div>
                            )}

                            <div className="space-y-4">
                                {events.map(event => (
                                    <div key={event.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center hover:border-orange-200 transition">
                                        <div className="w-full md:w-48 h-32 bg-gray-100 rounded-xl relative overflow-hidden shrink-0">
                                            {event.image ? (
                                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center">
                                                    <Ticket className="text-gray-400" size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "text-xs font-bold px-2 py-0.5 rounded border uppercase",
                                                        event.status === 'published' ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                    )}>
                                                        {event.status || 'draft'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleStatus(event.id, event.status)}
                                                        className="text-xs font-medium text-gray-500 hover:text-orange-600 underline"
                                                    >
                                                        {event.status === 'published' ? "Pause Sales" : "Republish"}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {event.doorPin && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-white font-mono text-sm tracking-widest" title="Gatekeeper PIN">
                                                            <Lock size={14} className="text-orange-500" />
                                                            {event.doorPin}
                                                        </div>
                                                    )}
                                                    <Link
                                                        href={`/scanner/${event.id}`}
                                                        target="_blank"
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                                                    >
                                                        <ScanLine size={16} /> Check In User
                                                    </Link>
                                                    <Link
                                                        href={`/events/${event.id}/edit`}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                                                    >
                                                        <Settings size={16} /> Edit
                                                    </Link>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-bold text-gray-900 mb-2 truncate">{event.title}</h4>

                                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                                                <span className="flex items-center gap-1"><Calendar size={14} className="text-orange-500" /> {event.date}</span>
                                                <span className="flex items-center gap-1"><MapPin size={14} className="text-orange-500" /> {event.location}</span>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm font-medium pt-3 border-t border-gray-50">
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Ticket size={16} className="text-gray-400" />
                                                    {event.ticketsSold || 0} / {event.totalCapacity || 100} Sold
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <BarChart size={16} className="text-green-500" />
                                                    Le {((event.price || 0) * (event.ticketsSold || 0)).toLocaleString()} Rev.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {process.env.NODE_ENV === 'development' && activeTab === 'overview' && (
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSeedDatabase}
                            className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition block text-center border border-red-200"
                        >
                            [DEV] Seed Firestore
                        </button>
                    </div>
                )}

                {activeTab !== "overview" && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 text-gray-400">
                            <span className="text-sm font-medium">WIP</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Coming Soon</h3>
                        <p className="text-gray-500 max-w-sm">
                            The {activeTab} section is currently under development and will be available in the next release.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
