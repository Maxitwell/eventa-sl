"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import {
    Plus, BarChart, Users, Settings, LogOut, Ticket,
    MapPin, Calendar, ScanLine, Lock, Download, Search,
    DollarSign, ChevronDown, Share2, Copy, Check, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getOrganizerEvents, updateEventStatus, EventEntity } from "@/lib/db";
import { auth } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgOrder {
    id: string;
    eventId: string;
    status: string;
    amount: number;
    currency: string;
    guestEmail?: string;
    guestName?: string;
    userId?: string;
    createdAt: string;
    lines?: { ticketName: string; quantity: number; unitPrice: number }[];
}

interface Attendee {
    id: string;
    eventId: string;
    eventName: string;
    ticketType: string;
    status: string;
    pricePaid: number;
    purchaseDate: string;
    guestEmail?: string;
    guestName?: string;
    guestPhone?: string;
    userId?: string;
}

interface PayoutRecord {
    id: string;
    eventId: string;
    eventName: string;
    amount: number;
    grossRevenue: number;
    platformFee: number;
    status: string;
    createdAt: string;
    currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return token;
}

async function apiFetch(path: string, method = "GET", body?: object) {
    const token = await getIdToken();
    const res = await fetch(path, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Request failed");
    }
    return res.json();
}

function downloadCSV(data: Record<string, unknown>[], filename: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
        headers.map((h) => {
            const v = row[h];
            return typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : String(v ?? "");
        }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        published: "bg-green-100 text-green-700 border-green-200",
        paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
        cancelled: "bg-red-100 text-red-700 border-red-200",
        draft: "bg-gray-100 text-gray-600 border-gray-200",
        paid: "bg-green-100 text-green-700 border-green-200",
        pending_payment: "bg-yellow-100 text-yellow-700 border-yellow-200",
        failed_payment: "bg-red-100 text-red-700 border-red-200",
        refunded: "bg-orange-100 text-orange-700 border-orange-200",
        valid: "bg-green-100 text-green-700 border-green-200",
        used: "bg-blue-100 text-blue-700 border-blue-200",
        pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
        settled: "bg-green-100 text-green-700 border-green-200",
        failed: "bg-red-100 text-red-700 border-red-200",
    };
    return (
        <span className={clsx("px-2 py-0.5 text-[10px] font-bold uppercase rounded border", map[status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const { currentUser, logout, isLoggedIn, isLoading: isAuthLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("overview");
    const [events, setEvents] = useState<EventEntity[]>([]);
    const [orders, setOrders] = useState<OrgOrder[]>([]);
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);

    // Attendees sub-state
    const [selectedEventId, setSelectedEventId] = useState("");
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
    const [attendeeSearch, setAttendeeSearch] = useState("");

    // Payout state
    const [payoutLoading, setPayoutLoading] = useState<string | null>(null);

    // Scanner share panel state
    const [sharingEventId, setSharingEventId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopyScannerLink = (eventId: string) => {
        const url = `https://www.eventa.africa/scanner/${eventId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleWhatsAppShare = (event: EventEntity) => {
        const url = `https://www.eventa.africa/scanner/${event.id}`;
        const text = `🎟️ *${event.title} — Door Scanner*\n\nOpen this link to scan tickets at the door:\n${url}\n\nEnter the PIN when prompted: *${event.doorPin || "see dashboard"}*`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    // Settings state
    const [settingsName, setSettingsName] = useState("");
    const [settingsPhone, setSettingsPhone] = useState("");
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // ── Auth guard ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthLoading && !isLoggedIn) router.push("/login");
    }, [isLoggedIn, isAuthLoading, router]);

    // ── Load events ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;
        setSettingsName(currentUser.name || "");
        setSettingsPhone(currentUser.phoneNumber || "");

        const fetchEvents = async () => {
            setIsLoadingEvents(true);
            try {
                const orgEvents = await getOrganizerEvents(currentUser.id);
                orgEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setEvents(orgEvents);
                if (orgEvents.length > 0) setSelectedEventId(orgEvents[0].id);
            } catch {
                showToast("Failed to load your events", "error");
            } finally {
                setIsLoadingEvents(false);
            }
        };
        fetchEvents();
    }, [currentUser, showToast]);

    // ── Load orders once events are ready ───────────────────────────────────
    useEffect(() => {
        if (!currentUser || events.length === 0) {
            setIsLoadingOrders(false);
            return;
        }
        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                const { orders: allOrders } = await apiFetch("/api/dashboard/data?type=orders");
                allOrders.sort((a: OrgOrder, b: OrgOrder) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setOrders(allOrders);
            } catch {
                // non-fatal — orders are supplementary
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchOrders();
    }, [currentUser, events]);

    // ── Load payouts ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;
        const fetchPayouts = async () => {
            try {
                const { orders: payoutDocs } = await apiFetch("/api/dashboard/data?type=payouts").catch(() => ({ orders: [] }));
                setPayouts(payoutDocs ?? []);
            } catch { /* non-fatal */ }
        };
        fetchPayouts();
    }, [currentUser]);

    // ── Load attendees when event selected ──────────────────────────────────
    useEffect(() => {
        if (!selectedEventId || activeTab !== "attendees") return;
        const fetchAttendees = async () => {
            setIsLoadingAttendees(true);
            setAttendees([]);
            try {
                const { attendees: list } = await apiFetch(`/api/dashboard/data?type=attendees&eventId=${selectedEventId}`);
                setAttendees(list ?? []);
            } catch {
                showToast("Failed to load attendee list", "error");
            } finally {
                setIsLoadingAttendees(false);
            }
        };
        fetchAttendees();
    }, [selectedEventId, activeTab, showToast]);

    // ── Derived values ───────────────────────────────────────────────────────
    const totalTicketsSold = useMemo(() => events.reduce((s, e) => s + (e.ticketsSold || 0), 0), [events]);
    const totalRevenue = useMemo(() =>
        orders.filter((o) => o.status === "paid").reduce((s, o) => s + (o.amount || 0), 0),
        [orders]
    );
    const totalCapacity = useMemo(() => events.reduce((s, e) => s + (e.totalCapacity || 0), 0), [events]);

    const eventRevenueMap = useMemo(() => {
        const m = new Map<string, number>();
        orders.filter((o) => o.status === "paid").forEach((o) => {
            m.set(o.eventId, (m.get(o.eventId) ?? 0) + (o.amount || 0));
        });
        return m;
    }, [orders]);

    const filteredAttendees = useMemo(() => {
        if (!attendeeSearch) return attendees;
        const s = attendeeSearch.toLowerCase();
        return attendees.filter((a) =>
            (a.guestEmail ?? "").toLowerCase().includes(s) ||
            (a.guestName ?? "").toLowerCase().includes(s) ||
            (a.ticketType ?? "").toLowerCase().includes(s)
        );
    }, [attendees, attendeeSearch]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogout = () => { logout(); router.push("/"); };

    const handleToggleStatus = async (eventId: string, currentStatus: string) => {
        const newStatus = currentStatus === "published" ? "paused" : "published";
        try {
            await updateEventStatus(eventId, newStatus as EventEntity["status"]);
            setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: newStatus as EventEntity["status"] } : e));
            showToast(`Event marked as ${newStatus}`, "success");
        } catch {
            showToast("Failed to update status", "error");
        }
    };

    const handleRequestPayout = async (eventId: string) => {
        setPayoutLoading(eventId);
        try {
            const result = await apiFetch("/api/payouts/request", "POST", { eventId });
            showToast(result.message ?? "Payout initiated", "success");
            // Mark event as payout pending in local list
            setPayouts((prev) => [
                ...prev,
                {
                    id: result.payoutId,
                    eventId,
                    eventName: events.find((e) => e.id === eventId)?.title ?? "",
                    amount: result.netAmount,
                    grossRevenue: result.grossRevenue,
                    platformFee: result.platformFee,
                    status: "pending",
                    createdAt: new Date().toISOString(),
                    currency: "SLE",
                },
            ]);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Payout request failed", "error");
        } finally {
            setPayoutLoading(null);
        }
    };

    const handleSaveSettings = async () => {
        if (!currentUser) return;
        setIsSavingSettings(true);
        try {
            await updateDoc(doc(firestoreDb, "users", currentUser.id), {
                name: settingsName.trim(),
                phoneNumber: settingsPhone.trim(),
            });
            showToast("Profile saved", "success");
        } catch {
            showToast("Failed to save profile", "error");
        } finally {
            setIsSavingSettings(false);
        }
    };

    // ── Dev seed helper ───────────────────────────────────────────────────────
    const handleSeedDatabase = async () => {
        try {
            const { seedEventsToFirestore } = await import("@/lib/seed");
            const ok = await seedEventsToFirestore();
            showToast(ok ? "Database seeded!" : "Seed failed.", ok ? "success" : "error");
        } catch (e) {
            console.error(e);
            showToast("Error importing seed script", "error");
        }
    };

    if (isAuthLoading || !isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: "overview", name: "Overview", icon: BarChart },
        { id: "events", name: "My Events", icon: Ticket },
        { id: "attendees", name: "Attendees", icon: Users },
        { id: "payouts", name: "Payouts", icon: DollarSign },
        { id: "settings", name: "Settings", icon: Settings },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className="w-full md:w-64 shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full mb-4 flex items-center justify-center text-white text-2xl font-bold">
                        {currentUser?.name?.charAt(0).toUpperCase()}
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
                    className="w-full mt-4 hidden md:flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all text-sm"
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </aside>

            {/* ── Main Content ──────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab.replace("-", " ")}</h1>
                    <Link
                        href="/events/create"
                        className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2 text-sm"
                    >
                        <Plus size={18} /> Create Event
                    </Link>
                </div>

                {/* ── OVERVIEW ─────────────────────────────────────────── */}
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: "Tickets Sold", value: totalTicketsSold.toLocaleString(), icon: Ticket, color: "orange" },
                                { label: "Total Revenue", value: `Le ${totalRevenue.toLocaleString()}`, icon: BarChart, color: "green" },
                                { label: "Total Capacity", value: totalCapacity.toLocaleString(), icon: Users, color: "purple" },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden hover:border-${color}-200 transition-colors`}>
                                    <div className={`w-10 h-10 rounded-full bg-${color}-50 text-${color}-500 flex items-center justify-center mb-2`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                                    </div>
                                    <div className={`absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-${color}-500/10 to-transparent rounded-tl-[100px]`} />
                                </div>
                            ))}
                        </div>

                        {/* Event cards */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                Your Events
                                {isLoadingEvents && <span className="text-sm font-normal text-gray-400">Loading...</span>}
                            </h3>
                            {!isLoadingEvents && events.length === 0 && (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center flex flex-col items-center">
                                    <Ticket size={32} className="text-gray-300 mb-4" />
                                    <h4 className="text-gray-900 font-bold mb-1">No events yet</h4>
                                    <p className="text-gray-500 text-sm mb-6 max-w-sm">Create your first event to see analytics here.</p>
                                    <Link href="/events/create" className="text-orange-600 font-bold hover:text-orange-700">Create your first event →</Link>
                                </div>
                            )}
                            <div className="space-y-4">
                                {events.map((event) => {
                                    const isFreeEvent = event.price === 0;
                                    return (
                                    <div key={event.id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center hover:border-orange-200 transition">
                                        <div className="w-full md:w-48 h-28 sm:h-32 bg-gray-100 rounded-xl relative overflow-hidden shrink-0">
                                            {event.image ? (
                                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center">
                                                    <Ticket className="text-gray-400" size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full min-w-0">
                                            {/* Status row — wraps on mobile */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <StatusPill status={event.status || "draft"} />
                                                    <button
                                                        onClick={() => handleToggleStatus(event.id, event.status)}
                                                        className="text-xs font-medium text-gray-500 hover:text-orange-600 underline"
                                                    >
                                                        {event.status === "published" ? "Pause Sales" : "Republish"}
                                                    </button>
                                                </div>
                                                {/* Action buttons — wrap on small screens */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {event.doorPin && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-white font-mono text-xs tracking-widest" title="Gatekeeper PIN">
                                                            <Lock size={12} className="text-orange-500" />
                                                            {event.doorPin}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => { setSharingEventId(sharingEventId === event.id ? null : event.id); setCopied(false); }}
                                                        className="p-1.5 sm:px-2 sm:py-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                                    >
                                                        <ScanLine size={14} /> <span className="hidden sm:inline">Share Scanner</span>
                                                    </button>
                                                    <Link href={`/events/${event.id}/edit`} className="p-1.5 sm:px-2 sm:py-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
                                                        <Settings size={14} /> <span className="hidden sm:inline">Edit</span>
                                                    </Link>
                                                </div>
                                            </div>
                                            {sharingEventId === event.id && (
                                                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><ScanLine size={12} /> Scanner Link</span>
                                                        <button onClick={() => setSharingEventId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                                    </div>
                                                    <p className="text-xs font-mono text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2 truncate">
                                                        https://www.eventa.africa/scanner/{event.id}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleCopyScannerLink(event.id)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                                                        >
                                                            {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                                                        </button>
                                                        <button
                                                            onClick={() => handleWhatsAppShare(event)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                                                        >
                                                            <Share2 size={13} /> WhatsApp
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 truncate">{event.title}</h4>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                                                <span className="flex items-center gap-1"><Calendar size={13} className="text-orange-500" /> {event.date}</span>
                                                <span className="flex items-center gap-1 min-w-0"><MapPin size={13} className="text-orange-500 shrink-0" /> <span className="truncate">{event.location}</span></span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-medium pt-3 border-t border-gray-50">
                                                <span className="flex items-center gap-1.5 text-gray-600">
                                                    <Ticket size={15} className="text-gray-400" />
                                                    {event.ticketsSold || 0} / {event.totalCapacity || 0} Sold
                                                </span>
                                                <span className={`flex items-center gap-1.5 ${isFreeEvent ? "text-gray-300" : "text-gray-600"}`}>
                                                    <BarChart size={15} className={isFreeEvent ? "text-gray-300" : "text-green-500"} />
                                                    {isFreeEvent ? "Free Event" : `Le ${(eventRevenueMap.get(event.id) || 0).toLocaleString()} Rev.`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                        {process.env.NODE_ENV === "development" && (
                            <div className="flex justify-end">
                                <button onClick={handleSeedDatabase} className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition border border-red-200">
                                    [DEV] Seed Firestore
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MY EVENTS (detailed analytics) ───────────────────── */}
                {activeTab === "events" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {isLoadingEvents ? (
                            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : events.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                                No events yet. <Link href="/events/create" className="text-orange-500 font-bold">Create one →</Link>
                            </div>
                        ) : (
                            events.map((event) => {
                                const eventRevenue = eventRevenueMap.get(event.id) ?? 0;
                                const eventOrders = orders.filter((o) => o.eventId === event.id);
                                const paidOrders = eventOrders.filter((o) => o.status === "paid");
                                return (
                                    <div key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-start sm:items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">{event.date} · {event.location}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <StatusPill status={event.status || "draft"} />
                                                <Link href={`/events/${event.id}/edit`} className="text-xs font-bold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50">
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center border-b border-gray-100">
                                            <div>
                                                <p className="text-xl font-bold text-gray-900">{event.ticketsSold || 0}</p>
                                                <p className="text-xs text-gray-400">Sold of {event.totalCapacity || 0}</p>
                                            </div>
                                            <div>
                                                <p className={`text-xl font-bold ${event.price === 0 ? "text-gray-300" : "text-green-700"}`}>
                                                    {event.price === 0 ? "—" : `Le ${eventRevenue.toLocaleString()}`}
                                                </p>
                                                <p className={`text-xs ${event.price === 0 ? "text-gray-300" : "text-gray-400"}`}>
                                                    {event.price === 0 ? "Free Event" : "Revenue"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-gray-900">{paidOrders.length}</p>
                                                <p className="text-xs text-gray-400">Paid Orders</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-gray-900">{eventOrders.filter((o) => o.status === "pending_payment").length}</p>
                                                <p className="text-xs text-gray-400">Pending</p>
                                            </div>
                                        </div>
                                        {/* Ticket tiers breakdown */}
                                        {event.tickets && event.tickets.length > 0 && (
                                            <div className="px-6 py-4">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ticket Tiers</p>
                                                <div className="space-y-2">
                                                    {event.tickets.map((tier) => (
                                                        <div key={tier.id} className="flex items-center justify-between text-sm">
                                                            <span className="font-medium text-gray-800">{tier.name}</span>
                                                            <div className="flex items-center gap-4 text-gray-500 text-xs">
                                                                <span>{tier.isPrivate ? "Private" : "Public"}</span>
                                                                <span>Le {tier.price.toLocaleString()} each</span>
                                                                <span>{tier.quantity} cap</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ── ATTENDEES ────────────────────────────────────────── */}
                {activeTab === "attendees" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Event selector */}
                            <div className="relative">
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="pl-4 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none font-medium"
                                >
                                    {events.map((e) => (
                                        <option key={e.id} value={e.id}>{e.title}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or ticket type…"
                                    value={attendeeSearch}
                                    onChange={(e) => setAttendeeSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                            <button
                                onClick={() => downloadCSV(
                                    filteredAttendees.map((a) => ({
                                        name: a.guestName || a.userId || "",
                                        email: a.guestEmail || "",
                                        phone: a.guestPhone || "",
                                        ticket_type: a.ticketType,
                                        status: a.status,
                                        price_paid: a.pricePaid,
                                        purchase_date: a.purchaseDate,
                                    })),
                                    `attendees-${selectedEventId}.csv`
                                )}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-gray-400 bg-white shrink-0"
                            >
                                <Download size={13} /> Export
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-900">
                                    Attendees ({filteredAttendees.length})
                                    {isLoadingAttendees && <span className="ml-2 text-xs font-normal text-gray-400">Loading…</span>}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Name</th>
                                            <th className="px-6 py-3 text-left">Email</th>
                                            <th className="px-6 py-3 text-left">Phone</th>
                                            <th className="px-6 py-3 text-left">Ticket Type</th>
                                            <th className="px-6 py-3 text-right">Paid</th>
                                            <th className="px-6 py-3 text-left">Status</th>
                                            <th className="px-6 py-3 text-left">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredAttendees.map((a) => (
                                            <tr key={a.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{a.guestName || "—"}</td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">{a.guestEmail || "—"}</td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">{a.guestPhone || "—"}</td>
                                                <td className="px-6 py-4 text-gray-700">{a.ticketType}</td>
                                                <td className="px-6 py-4 text-right font-medium">{a.pricePaid === 0 ? "Free" : `Le ${a.pricePaid.toLocaleString()}`}</td>
                                                <td className="px-6 py-4"><StatusPill status={a.status} /></td>
                                                <td className="px-6 py-4 text-xs text-gray-400">{new Date(a.purchaseDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {!isLoadingAttendees && filteredAttendees.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No attendees found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PAYOUTS ──────────────────────────────────────────── */}
                {activeTab === "payouts" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 text-sm text-amber-800">
                            <strong>Platform fee: 5%</strong> is deducted from gross revenue. Payouts are sent to the mobile money number set in your event's payout details.
                        </div>

                        {/* Per-event payout cards */}
                        <div className="space-y-3">
                            {events.map((event) => {
                                const eventRevenue = eventRevenueMap.get(event.id) ?? 0;
                                const existingPayout = payouts.find((p) => p.eventId === event.id);
                                const netEstimate = Math.round(eventRevenue * 0.95);
                                const isLoading = payoutLoading === event.id;
                                return (
                                    <div key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{event.title}</h4>
                                            <p className="text-xs text-gray-400 mt-0.5">{event.date}</p>
                                            <p className="text-sm text-gray-600 mt-2">
                                                Gross: <span className="font-bold">Le {eventRevenue.toLocaleString()}</span>
                                                <span className="text-gray-400 mx-2">·</span>
                                                Est. net: <span className="font-bold text-green-700">Le {netEstimate.toLocaleString()}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {existingPayout ? (
                                                <div className="text-right">
                                                    <StatusPill status={existingPayout.status} />
                                                    <p className="text-xs text-gray-400 mt-1">Le {existingPayout.amount.toLocaleString()} · {new Date(existingPayout.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            ) : eventRevenue > 0 ? (
                                                <button
                                                    onClick={() => handleRequestPayout(event.id)}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition disabled:opacity-60"
                                                >
                                                    {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <DollarSign size={15} />}
                                                    Request Payout
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">No revenue yet</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {events.length === 0 && (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                                    No events to pay out yet.
                                </div>
                            )}
                        </div>

                        {/* Payout history */}
                        {payouts.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-900">Payout History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm whitespace-nowrap">
                                        <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3 text-left">Event</th>
                                                <th className="px-6 py-3 text-right">Gross</th>
                                                <th className="px-6 py-3 text-right">Fee (5%)</th>
                                                <th className="px-6 py-3 text-right">Net</th>
                                                <th className="px-6 py-3 text-left">Status</th>
                                                <th className="px-6 py-3 text-left">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {payouts.map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">{p.eventName}</td>
                                                    <td className="px-6 py-4 text-right">Le {(p.grossRevenue || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-red-600">−Le {(p.platformFee || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-green-700">Le {p.amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4"><StatusPill status={p.status} /></td>
                                                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SETTINGS ─────────────────────────────────────────── */}
                {activeTab === "settings" && (
                    <div className="max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h3 className="font-bold text-gray-900">Profile</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={settingsName}
                                        onChange={(e) => setSettingsName(e.target.value)}
                                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={currentUser?.email || ""}
                                        disabled
                                        className="w-full px-4 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={settingsPhone}
                                        onChange={(e) => setSettingsPhone(e.target.value)}
                                        placeholder="+232 76 000 000"
                                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition disabled:opacity-60 text-sm"
                            >
                                {isSavingSettings ? "Saving…" : "Save Changes"}
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-1">Payout Details</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Payout details are set per-event when you create or edit an event. To update payout info, edit the relevant event.
                            </p>
                            <div className="space-y-2">
                                {events.filter((e) => e.payoutDetails?.accountNumber).map((e) => (
                                    <div key={e.id} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-800 truncate max-w-[220px]">{e.title}</p>
                                            <p className="text-xs text-gray-400">{e.payoutDetails?.method} · {e.payoutDetails?.accountNumber}</p>
                                        </div>
                                        <Link href={`/events/${e.id}/edit`} className="text-xs font-bold text-orange-600 hover:text-orange-700 shrink-0">
                                            Edit
                                        </Link>
                                    </div>
                                ))}
                                {events.filter((e) => e.payoutDetails?.accountNumber).length === 0 && (
                                    <p className="text-sm text-gray-400">No payout details set yet. Add them when creating or editing an event.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                            <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
                            <p className="text-xs text-red-600 mb-4">Signing out will end your current session.</p>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
