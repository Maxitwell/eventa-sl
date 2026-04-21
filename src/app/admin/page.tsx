"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import {
    Activity, Users, LogOut, Ticket, Lock,
    DollarSign, Search, Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { EventEntity } from "@/lib/db";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "admin@eventa.africa";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminOrderData {
    id: string;
    depositId?: string;
    status: string;
    amount: number;
    currency: string;
    eventId: string;
    userId?: string;
    guestEmail?: string;
    guestName?: string;
    lines?: { ticketName: string; quantity: number; unitPrice: number }[];
    createdAt: string;
    updatedAt?: string;
    ticketIds?: string[];
}

interface AdminUserData {
    id: string;
    name: string;
    email: string;
    role: "attendee" | "organizer";
    phoneNumber?: string;
    createdAt: string;
    disabled: boolean;
    lastSignIn?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers (outside component — no component state dependency)
// ---------------------------------------------------------------------------

async function getIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return token;
}

async function adminFetch(path: string, method = "GET", body?: object) {
    const token = await getIdToken();
    const res = await fetch(path, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

function downloadCSV(data: Record<string, unknown>[], filename: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
        headers
            .map((h) => {
                const val = row[h];
                return typeof val === "string"
                    ? `"${val.replace(/"/g, '""')}"`
                    : String(val ?? "");
            })
            .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        published: "bg-green-50 text-green-700 border-green-200",
        paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
        cancelled: "bg-red-50 text-red-700 border-red-200",
        draft: "bg-gray-50 text-gray-600 border-gray-200",
        paid: "bg-green-50 text-green-700 border-green-200",
        pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
        failed_payment: "bg-red-50 text-red-700 border-red-200",
        refunded: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
        <span
            className={clsx(
                "px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border",
                styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
            )}
        >
            {status.replace(/_/g, " ")}
        </span>
    );
}

function MetricCard({
    title,
    value,
    sub,
    accent = "gray",
}: {
    title: string;
    value: string | number;
    sub?: string;
    accent?: "green" | "orange" | "blue" | "purple" | "slate" | "red" | "yellow" | "gray";
}) {
    const bg: Record<string, string> = {
        green: "bg-green-50",
        orange: "bg-orange-50",
        blue: "bg-blue-50",
        purple: "bg-purple-50",
        slate: "bg-slate-100",
        red: "bg-red-50",
        yellow: "bg-yellow-50",
        gray: "bg-gray-100",
    };
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-28 relative overflow-hidden">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest z-10">{title}</h4>
            <div className="z-10">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
            </div>
            <div className={clsx("absolute -right-4 -bottom-4 w-20 h-20 rounded-full", bg[accent])} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
    const { currentUser, logout, isLoggedIn, isLoading: isAuthLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("overview");
    const [events, setEvents] = useState<EventEntity[]>([]);
    const [orders, setOrders] = useState<AdminOrderData[]>([]);
    const [users, setUsers] = useState<AdminUserData[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Filter state
    const [eventSearch, setEventSearch] = useState("");
    const [eventStatusFilter, setEventStatusFilter] = useState("all");
    const [userSearch, setUserSearch] = useState("");
    const [orderDateRange, setOrderDateRange] = useState("all");

    const accessDeniedFired = useRef(false);

    // Auth guard
    useEffect(() => {
        if (isAuthLoading) return;
        if (!isLoggedIn) {
            router.push("/login?redirect=/admin");
        } else if (currentUser && currentUser.email !== ADMIN_EMAIL && !accessDeniedFired.current) {
            accessDeniedFired.current = true;
            showToast("Access Denied: Missing Super Admin Privilege", "error");
            router.push("/");
        }
    }, [isLoggedIn, isAuthLoading, currentUser, router, showToast]);

    // Data fetch — only runs once the admin email is confirmed
    const currentUserEmail = currentUser?.email;
    useEffect(() => {
        if (!currentUserEmail || currentUserEmail !== ADMIN_EMAIL) return;
        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const { events: allEvents, orders: allOrders, users: allUsers } =
                    await adminFetch("/api/admin/data");

                allEvents.sort(
                    (a: EventEntity, b: EventEntity) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                allOrders.sort(
                    (a: AdminOrderData, b: AdminOrderData) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setEvents(allEvents);
                setOrders(allOrders);
                setUsers(allUsers);
            } catch (error) {
                console.error("Failed to load admin data:", error);
                showToast("Failed to load platform data", "error");
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, [currentUserEmail, showToast]);

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    const handleEventStatus = async (eventId: string, newStatus: string) => {
        setActionLoadingId(eventId);
        try {
            await adminFetch(`/api/admin/events/${eventId}/status`, "PATCH", { status: newStatus });
            setEvents((prev) =>
                prev.map((e) =>
                    e.id === eventId ? { ...e, status: newStatus as EventEntity["status"] } : e
                )
            );
            showToast(`Event set to ${newStatus}`, "success");
        } catch {
            showToast("Failed to update event status", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleUserStatus = async (userId: string, disabled: boolean) => {
        setActionLoadingId(userId);
        try {
            await adminFetch(`/api/admin/users/${userId}/status`, "PATCH", { disabled });
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, disabled } : u))
            );
            showToast(`User ${disabled ? "blocked" : "unblocked"} successfully`, "success");
        } catch {
            showToast("Failed to update user status", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // ---------------------------------------------------------------------------
    // Derived / computed values
    // ---------------------------------------------------------------------------

    const paidOrders = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);
    const totalRevenue = useMemo(
        () => paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
        [paidOrders]
    );
    const refundedAmount = useMemo(
        () =>
            orders
                .filter((o) => o.status === "refunded")
                .reduce((sum, o) => sum + (o.amount || 0), 0),
        [orders]
    );
    const pendingCount = useMemo(
        () => orders.filter((o) => o.status === "pending_payment").length,
        [orders]
    );
    const totalTicketsSold = useMemo(
        () => events.reduce((sum, e) => sum + (e.ticketsSold || 0), 0),
        [events]
    );
    const totalCapacity = useMemo(
        () => events.reduce((sum, e) => sum + (e.totalCapacity || 0), 0),
        [events]
    );
    const activeEventsCount = useMemo(
        () => events.filter((e) => e.status === "published").length,
        [events]
    );
    const organizersCount = useMemo(
        () => users.filter((u) => u.role === "organizer").length,
        [users]
    );
    const blockedCount = useMemo(() => users.filter((u) => u.disabled).length, [users]);

    // Revenue per event (paid orders only)
    const eventRevenueMap = useMemo(() => {
        const map = new Map<string, number>();
        paidOrders.forEach((o) => {
            map.set(o.eventId, (map.get(o.eventId) || 0) + (o.amount || 0));
        });
        return map;
    }, [paidOrders]);

    // Date-filtered orders for Financials tab
    const filteredOrders = useMemo(() => {
        if (orderDateRange === "all") return orders;
        const cutoff = new Date();
        if (orderDateRange === "today") cutoff.setHours(0, 0, 0, 0);
        else if (orderDateRange === "week") cutoff.setDate(cutoff.getDate() - 7);
        else if (orderDateRange === "month") cutoff.setMonth(cutoff.getMonth() - 1);
        return orders.filter((o) => new Date(o.createdAt) >= cutoff);
    }, [orders, orderDateRange]);

    const filteredRevenue = useMemo(
        () =>
            filteredOrders
                .filter((o) => o.status === "paid")
                .reduce((sum, o) => sum + (o.amount || 0), 0),
        [filteredOrders]
    );

    const filteredEvents = useMemo(() => {
        let result = events;
        if (eventSearch) {
            const s = eventSearch.toLowerCase();
            result = result.filter(
                (e) =>
                    e.title.toLowerCase().includes(s) ||
                    (e.organizerId || "").toLowerCase().includes(s)
            );
        }
        if (eventStatusFilter !== "all") {
            result = result.filter((e) => e.status === eventStatusFilter);
        }
        return result;
    }, [events, eventSearch, eventStatusFilter]);

    const filteredUsers = useMemo(() => {
        if (!userSearch) return users;
        const s = userSearch.toLowerCase();
        return users.filter(
            (u) =>
                (u.name || "").toLowerCase().includes(s) ||
                (u.email || "").toLowerCase().includes(s)
        );
    }, [users, userSearch]);

    // ---------------------------------------------------------------------------
    // Loading / auth gate render
    // ---------------------------------------------------------------------------

    if (isAuthLoading || !isLoggedIn || currentUser?.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: "overview", name: "Overview", icon: Activity },
        { id: "events", name: "All Events", icon: Ticket },
        { id: "financials", name: "Financials", icon: DollarSign },
        { id: "users", name: "Users", icon: Users },
    ];

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">
                                Super Admin Console
                            </h1>
                            <p className="text-xs font-medium text-gray-500 font-mono">
                                Access: {ADMIN_EMAIL}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <Link href="/" className="text-gray-500 hover:text-gray-900">
                            Exit Admin
                        </Link>
                        <button
                            onClick={() => {
                                logout();
                                router.push("/");
                            }}
                            className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-56 shrink-0">
                    <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar bg-white p-2 rounded-2xl shadow-sm border border-gray-200">
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
                                            ? "bg-slate-900 text-white shadow-md"
                                            : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                                    )}
                                >
                                    <Icon size={18} />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    {isLoadingData ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ─── OVERVIEW ───────────────────────────────────────── */}
                            {activeTab === "overview" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MetricCard
                                            title="Total Revenue"
                                            value={`Le ${totalRevenue.toLocaleString()}`}
                                            sub="From paid orders"
                                            accent="green"
                                        />
                                        <MetricCard
                                            title="Live Events"
                                            value={activeEventsCount}
                                            sub="Selling right now"
                                            accent="orange"
                                        />
                                        <MetricCard
                                            title="Tickets Sold"
                                            value={totalTicketsSold.toLocaleString()}
                                            sub={`of ${totalCapacity.toLocaleString()} capacity`}
                                            accent="blue"
                                        />
                                        <MetricCard
                                            title="Total Orders"
                                            value={orders.length}
                                            sub={`${pendingCount} pending`}
                                            accent="purple"
                                        />
                                        <MetricCard
                                            title="Registered Users"
                                            value={users.length}
                                            sub={`${organizersCount} organizers`}
                                            accent="slate"
                                        />
                                        <MetricCard
                                            title="Refunded"
                                            value={`Le ${refundedAmount.toLocaleString()}`}
                                            sub="Total refund value"
                                            accent="red"
                                        />
                                        <MetricCard
                                            title="Paid Orders"
                                            value={paidOrders.length}
                                            sub={`${orders.length - paidOrders.length} unpaid`}
                                            accent="green"
                                        />
                                        <MetricCard
                                            title="Blocked Accounts"
                                            value={blockedCount}
                                            accent="red"
                                        />
                                    </div>

                                    {/* Events by status */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                        <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest text-gray-500">
                                            Events by Status
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                            {(["published", "paused", "draft", "cancelled"] as const).map(
                                                (s) => (
                                                    <div key={s}>
                                                        <p className="text-3xl font-bold text-gray-900">
                                                            {events.filter((e) => e.status === s).length}
                                                        </p>
                                                        <div className="mt-1">
                                                            <StatusBadge status={s} />
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent orders */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                            <h3 className="font-bold text-gray-900">Recent Orders</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Order ID</th>
                                                        <th className="px-4 py-3 text-left">Event</th>
                                                        <th className="px-4 py-3 text-left">Buyer</th>
                                                        <th className="px-4 py-3 text-right">Amount</th>
                                                        <th className="px-4 py-3 text-left">Status</th>
                                                        <th className="px-4 py-3 text-left">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {orders.slice(0, 8).map((o) => {
                                                        const ev = events.find((e) => e.id === o.eventId);
                                                        return (
                                                            <tr key={o.id} className="hover:bg-gray-50/50">
                                                                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                                    {o.id.slice(0, 14)}…
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">
                                                                    {ev?.title ?? "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                                    {o.guestEmail || o.userId || "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium">
                                                                    Le {(o.amount || 0).toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <StatusBadge status={o.status} />
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-400">
                                                                    {new Date(o.createdAt).toLocaleDateString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {orders.length === 0 && (
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="px-6 py-10 text-center text-gray-400"
                                                            >
                                                                No orders yet
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── ALL EVENTS ─────────────────────────────────────── */}
                            {activeTab === "events" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Filters */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <Search
                                                size={15}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Search by title or organizer ID…"
                                                value={eventSearch}
                                                onChange={(e) => setEventSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                            />
                                        </div>
                                        <select
                                            value={eventStatusFilter}
                                            onChange={(e) => setEventStatusFilter(e.target.value)}
                                            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="published">Published</option>
                                            <option value="paused">Paused</option>
                                            <option value="draft">Draft</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                            <h3 className="font-bold text-gray-900">
                                                Platform Events ({filteredEvents.length})
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-6 py-3">Event Name</th>
                                                        <th className="px-6 py-3">Organizer ID</th>
                                                        <th className="px-6 py-3">Date</th>
                                                        <th className="px-6 py-3">Status</th>
                                                        <th className="px-6 py-3 text-right">Sold / Cap</th>
                                                        <th className="px-6 py-3 text-right">Revenue</th>
                                                        <th className="px-6 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredEvents.map((e) => {
                                                        const isLoading = actionLoadingId === e.id;
                                                        const revenue = eventRevenueMap.get(e.id) || 0;
                                                        return (
                                                            <tr key={e.id} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">
                                                                    {e.title}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                                                                    {e.organizerId || "—"}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                                    {e.date || "—"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <StatusBadge status={e.status || "draft"} />
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    {e.ticketsSold || 0} /{" "}
                                                                    {e.totalCapacity || 0}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-medium text-green-700">
                                                                    {revenue > 0
                                                                        ? `Le ${revenue.toLocaleString()}`
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {isLoading ? (
                                                                            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                {e.status === "published" && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEventStatus(
                                                                                                e.id,
                                                                                                "paused"
                                                                                            )
                                                                                        }
                                                                                        className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2.5 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 bg-white"
                                                                                    >
                                                                                        Suspend
                                                                                    </button>
                                                                                )}
                                                                                {e.status === "paused" && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEventStatus(
                                                                                                e.id,
                                                                                                "published"
                                                                                            )
                                                                                        }
                                                                                        className="text-xs font-bold text-green-600 hover:text-green-700 px-2.5 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 bg-white"
                                                                                    >
                                                                                        Unsuspend
                                                                                    </button>
                                                                                )}
                                                                                {e.status === "draft" && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEventStatus(
                                                                                                e.id,
                                                                                                "published"
                                                                                            )
                                                                                        }
                                                                                        className="text-xs font-bold text-green-600 hover:text-green-700 px-2.5 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 bg-white"
                                                                                    >
                                                                                        Publish
                                                                                    </button>
                                                                                )}
                                                                                {e.status === "cancelled" && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEventStatus(
                                                                                                e.id,
                                                                                                "published"
                                                                                            )
                                                                                        }
                                                                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 bg-white"
                                                                                    >
                                                                                        Restore
                                                                                    </button>
                                                                                )}
                                                                                {e.status !== "cancelled" && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEventStatus(
                                                                                                e.id,
                                                                                                "cancelled"
                                                                                            )
                                                                                        }
                                                                                        className="text-xs font-bold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 bg-white"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {filteredEvents.length === 0 && (
                                                        <tr>
                                                            <td
                                                                colSpan={7}
                                                                className="px-6 py-12 text-center text-gray-400"
                                                            >
                                                                No events match the current filters
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── FINANCIALS ─────────────────────────────────────── */}
                            {activeTab === "financials" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Date range filter */}
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                ["all", "All Time"],
                                                ["today", "Today"],
                                                ["week", "This Week"],
                                                ["month", "This Month"],
                                            ] as const
                                        ).map(([val, label]) => (
                                            <button
                                                key={val}
                                                onClick={() => setOrderDateRange(val)}
                                                className={clsx(
                                                    "px-4 py-2 text-sm font-medium rounded-xl border transition-all",
                                                    orderDateRange === val
                                                        ? "bg-slate-900 text-white border-slate-900"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-slate-400"
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Summary cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MetricCard
                                            title="Revenue"
                                            value={`Le ${filteredRevenue.toLocaleString()}`}
                                            sub="Paid orders only"
                                            accent="green"
                                        />
                                        <MetricCard
                                            title="Paid Orders"
                                            value={
                                                filteredOrders.filter((o) => o.status === "paid")
                                                    .length
                                            }
                                            accent="green"
                                        />
                                        <MetricCard
                                            title="Pending"
                                            value={
                                                filteredOrders.filter(
                                                    (o) => o.status === "pending_payment"
                                                ).length
                                            }
                                            accent="yellow"
                                        />
                                        <MetricCard
                                            title="Refunded"
                                            value={
                                                filteredOrders.filter((o) => o.status === "refunded")
                                                    .length
                                            }
                                            accent="red"
                                        />
                                    </div>

                                    {/* Revenue by event */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900">Revenue by Event</h3>
                                            <button
                                                onClick={() =>
                                                    downloadCSV(
                                                        events.map((e) => ({
                                                            title: e.title,
                                                            date: e.date || "",
                                                            status: e.status,
                                                            tickets_sold: e.ticketsSold || 0,
                                                            revenue_le:
                                                                eventRevenueMap.get(e.id) || 0,
                                                        })),
                                                        "eventa-revenue-by-event.csv"
                                                    )
                                                }
                                                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 bg-white"
                                            >
                                                <Download size={13} /> Export
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left">Event</th>
                                                        <th className="px-6 py-3 text-left">Date</th>
                                                        <th className="px-6 py-3 text-left">Status</th>
                                                        <th className="px-6 py-3 text-right">
                                                            Tickets Sold
                                                        </th>
                                                        <th className="px-6 py-3 text-right">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {events
                                                        .filter(
                                                            (e) =>
                                                                (eventRevenueMap.get(e.id) || 0) > 0 ||
                                                                (e.ticketsSold || 0) > 0
                                                        )
                                                        .sort(
                                                            (a, b) =>
                                                                (eventRevenueMap.get(b.id) || 0) -
                                                                (eventRevenueMap.get(a.id) || 0)
                                                        )
                                                        .map((e) => (
                                                            <tr
                                                                key={e.id}
                                                                className="hover:bg-gray-50/50"
                                                            >
                                                                <td className="px-6 py-4 font-medium text-gray-900 max-w-[220px] truncate">
                                                                    {e.title}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                                    {e.date || "—"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <StatusBadge
                                                                        status={e.status || "draft"}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    {e.ticketsSold || 0}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-bold text-green-700">
                                                                    Le{" "}
                                                                    {(
                                                                        eventRevenueMap.get(e.id) || 0
                                                                    ).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    {events.filter(
                                                        (e) =>
                                                            (eventRevenueMap.get(e.id) || 0) > 0 ||
                                                            (e.ticketsSold || 0) > 0
                                                    ).length === 0 && (
                                                        <tr>
                                                            <td
                                                                colSpan={5}
                                                                className="px-6 py-12 text-center text-gray-400"
                                                            >
                                                                No revenue data yet
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* All orders */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900">
                                                All Orders ({filteredOrders.length})
                                            </h3>
                                            <button
                                                onClick={() =>
                                                    downloadCSV(
                                                        filteredOrders.map((o) => ({
                                                            order_id: o.id,
                                                            event:
                                                                events.find((e) => e.id === o.eventId)
                                                                    ?.title ?? o.eventId,
                                                            buyer:
                                                                o.guestEmail ||
                                                                o.guestName ||
                                                                o.userId ||
                                                                "",
                                                            amount_le: o.amount,
                                                            currency: o.currency,
                                                            status: o.status,
                                                            date: o.createdAt,
                                                        })),
                                                        "eventa-orders.csv"
                                                    )
                                                }
                                                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 bg-white"
                                            >
                                                <Download size={13} /> Export CSV
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Order ID</th>
                                                        <th className="px-4 py-3 text-left">Event</th>
                                                        <th className="px-4 py-3 text-left">Buyer</th>
                                                        <th className="px-4 py-3 text-right">Amount</th>
                                                        <th className="px-4 py-3 text-left">Status</th>
                                                        <th className="px-4 py-3 text-left">Date</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredOrders.map((o) => {
                                                        const ev = events.find((e) => e.id === o.eventId);
                                                        const isLoading = actionLoadingId === o.id;
                                                        const canRefund = o.status === "paid";
                                                        return (
                                                            <tr key={o.id} className="hover:bg-gray-50/50">
                                                                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                                    {o.id.slice(0, 16)}…
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                                                                    {ev?.title ?? "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                                    {o.guestEmail || o.guestName || o.userId || "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium">
                                                                    Le {(o.amount || 0).toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <StatusBadge status={o.status} />
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-400">
                                                                    {new Date(o.createdAt).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {isLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
                                                                    ) : canRefund ? (
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (!confirm(`Refund Le ${(o.amount || 0).toLocaleString()} for this order?`)) return;
                                                                                setActionLoadingId(o.id);
                                                                                try {
                                                                                    await adminFetch(`/api/admin/orders/${o.id}/refund`, "POST");
                                                                                    setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, status: "refund_pending" } : x));
                                                                                    showToast("Refund initiated — awaiting provider confirmation", "success");
                                                                                } catch {
                                                                                    showToast("Failed to initiate refund", "error");
                                                                                } finally {
                                                                                    setActionLoadingId(null);
                                                                                }
                                                                            }}
                                                                            className="text-xs font-bold text-orange-600 hover:text-orange-700 px-2.5 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 bg-white"
                                                                        >
                                                                            Refund
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-300">—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {filteredOrders.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                                                No orders in this period
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── USERS ──────────────────────────────────────────── */}
                            {activeTab === "users" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MetricCard
                                            title="Total Users"
                                            value={users.length}
                                            accent="slate"
                                        />
                                        <MetricCard
                                            title="Organizers"
                                            value={organizersCount}
                                            accent="blue"
                                        />
                                        <MetricCard
                                            title="Attendees"
                                            value={users.length - organizersCount}
                                            accent="purple"
                                        />
                                        <MetricCard
                                            title="Blocked"
                                            value={blockedCount}
                                            accent="red"
                                        />
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                                            <div className="relative flex-1 max-w-sm">
                                                <Search
                                                    size={15}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name or email…"
                                                    value={userSearch}
                                                    onChange={(e) => setUserSearch(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                                />
                                            </div>
                                            <button
                                                onClick={() =>
                                                    downloadCSV(
                                                        users.map((u) => ({
                                                            name: u.name || "",
                                                            email: u.email || "",
                                                            role: u.role || "attendee",
                                                            phone: u.phoneNumber || "",
                                                            joined: u.createdAt || "",
                                                            last_sign_in: u.lastSignIn || "",
                                                            status: u.disabled ? "blocked" : "active",
                                                        })),
                                                        "eventa-users.csv"
                                                    )
                                                }
                                                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 bg-white shrink-0"
                                            >
                                                <Download size={13} /> Export
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left">Name</th>
                                                        <th className="px-6 py-3 text-left">Email</th>
                                                        <th className="px-6 py-3 text-left">Role</th>
                                                        <th className="px-6 py-3 text-left">Joined</th>
                                                        <th className="px-6 py-3 text-left">
                                                            Last Sign-in
                                                        </th>
                                                        <th className="px-6 py-3 text-left">Status</th>
                                                        <th className="px-6 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredUsers.map((u) => {
                                                        const isLoading = actionLoadingId === u.id;
                                                        return (
                                                            <tr
                                                                key={u.id}
                                                                className="hover:bg-gray-50/50"
                                                            >
                                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                                    {u.name || "—"}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                                    {u.email || "—"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span
                                                                        className={clsx(
                                                                            "px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border",
                                                                            u.role === "organizer"
                                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                : "bg-gray-50 text-gray-500 border-gray-200"
                                                                        )}
                                                                    >
                                                                        {u.role || "attendee"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                                    {u.createdAt
                                                                        ? new Date(
                                                                              u.createdAt
                                                                          ).toLocaleDateString()
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                                    {u.lastSignIn
                                                                        ? new Date(
                                                                              u.lastSignIn
                                                                          ).toLocaleDateString()
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span
                                                                        className={clsx(
                                                                            "px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border",
                                                                            u.disabled
                                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                                : "bg-green-50 text-green-700 border-green-200"
                                                                        )}
                                                                    >
                                                                        {u.disabled
                                                                            ? "Blocked"
                                                                            : "Active"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    {isLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
                                                                    ) : (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleUserStatus(
                                                                                    u.id,
                                                                                    !u.disabled
                                                                                )
                                                                            }
                                                                            className={clsx(
                                                                                "text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-white",
                                                                                u.disabled
                                                                                    ? "text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                                                                                    : "text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                                                            )}
                                                                        >
                                                                            {u.disabled
                                                                                ? "Unblock"
                                                                                : "Block"}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {filteredUsers.length === 0 && (
                                                        <tr>
                                                            <td
                                                                colSpan={7}
                                                                className="px-6 py-12 text-center text-gray-400"
                                                            >
                                                                No users found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
