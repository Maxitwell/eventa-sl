"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { BarChart, Users, Activity, LogOut, Ticket, Lock, LogIn, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getAllEventsAdmin, getAllOrdersAdmin, updateEventStatus, EventEntity, OrderEntity } from "@/lib/db";

const ADMIN_EMAIL = "admin@eventa.africa";

export default function AdminDashboard() {
    const { currentUser, logout, isLoggedIn, isLoading: isAuthLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    
    const [activeTab, setActiveTab] = useState("overview");
    const [events, setEvents] = useState<EventEntity[]>([]);
    const [orders, setOrders] = useState<OrderEntity[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const accessDeniedFired = useRef(false);

    useEffect(() => {
        // Wait for auth to fully resolve before making any access decisions
        if (isAuthLoading) return;

        if (!isLoggedIn) {
            router.push("/login?redirect=/admin");
        } else if (currentUser && currentUser.email !== ADMIN_EMAIL && !accessDeniedFired.current) {
            // Only fire when currentUser is confirmed non-null — avoids false positives
            // during the brief window where auth is resolved but user object not yet set
            accessDeniedFired.current = true;
            showToast("Access Denied: Missing Super Admin Privilege", "error");
            router.push("/");
        }
    }, [isLoggedIn, isAuthLoading, currentUser, router, showToast]);

    const currentUserEmail = currentUser?.email;
    useEffect(() => {
        if (!currentUserEmail || currentUserEmail !== ADMIN_EMAIL) return;

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const [allEvents, allOrders] = await Promise.all([
                    getAllEventsAdmin(),
                    getAllOrdersAdmin()
                ]);
                allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setEvents(allEvents);
                setOrders(allOrders);
            } catch (error) {
                console.error("Failed to load admin data:", error);
                showToast("Failed to load platform data", "error");
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [currentUserEmail]);

    if (isAuthLoading || !isLoggedIn || currentUser?.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleToggleStatus = async (eventId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "published" ? "paused" : "published";
            await updateEventStatus(eventId, newStatus as any);
            setEvents(events.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
            showToast(`Event manually set to ${newStatus}`, "success");
        } catch (error) {
            console.error("Failed to suspend event", error);
            showToast("Failed to suspend event", "error");
        }
    };

    // Global Metrics
    const totalPlatformRevenue = orders.filter(o => o.status === "paid").reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalPlatformCapacity = events.reduce((sum, e) => sum + (e.totalCapacity || 100), 0);
    const totalPlatformTicketsSold = events.reduce((sum, e) => sum + (e.ticketsSold || 0), 0);
    const activeEventsCount = events.filter(e => e.status === 'published').length;

    const tabs = [
        { id: "overview", name: "Platform Overview", icon: Activity },
        { id: "events", name: "All Events", icon: Ticket },
        { id: "orders", name: "Financials", icon: DollarSign },
        { id: "users", name: "Users & Organizers", icon: Users },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">Super Admin Console</h1>
                            <p className="text-sm font-medium text-gray-500 font-mono text-xs">Access: {ADMIN_EMAIL}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <Link href="/" className="text-gray-500 hover:text-gray-900">Exit Admin</Link>
                        <button onClick={() => { logout(); router.push('/'); }} className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-60 shrink-0">
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

                {/* Main Content */}
                <div className="flex-1">
                    {activeTab === "overview" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest z-10">Total Platform Value</h4>
                                    <p className="text-3xl font-bold text-gray-900 z-10 flex items-center gap-1">
                                        <span className="text-sm font-normal text-gray-400">Le</span>{totalPlatformRevenue.toLocaleString()}
                                    </p>
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-green-50 rounded-full" />
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest z-10">Live Events</h4>
                                    <p className="text-3xl font-bold text-gray-900 z-10">{activeEventsCount}</p>
                                    <p className="text-xs text-green-600 font-bold z-10">Selling right now</p>
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-50 rounded-full" />
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest z-10">Tickets Minted</h4>
                                    <p className="text-3xl font-bold text-gray-900 z-10">{totalPlatformTicketsSold.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 font-bold z-10">Out of {totalPlatformCapacity.toLocaleString()}</p>
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-50 rounded-full" />
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest z-10">Total Orders</h4>
                                    <p className="text-3xl font-bold text-gray-900 z-10">{orders.length}</p>
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-50 rounded-full" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "events" && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-bold text-gray-900 text-lg">Platform Events Database</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3">Event Name</th>
                                            <th className="px-6 py-3">Organizer ID</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Sold / Cap</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {events.map((e) => (
                                            <tr key={e.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{e.title}</td>
                                                <td className="px-6 py-4 text-gray-500 text-xs font-mono">{e.organizerId || 'Unknown'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border",
                                                        e.status === 'published' ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                    )}>
                                                        {e.status || 'draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium">
                                                    {e.ticketsSold || 0} / {e.totalCapacity || 0}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleToggleStatus(e.id, e.status)}
                                                        className="text-xs font-bold text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 bg-white"
                                                    >
                                                        {e.status === 'published' ? 'Suspend' : 'Unsuspend'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {(activeTab === "orders" || activeTab === "users") && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 text-gray-400">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Restricted Section</h3>
                            <p className="text-gray-500 max-w-sm text-sm">
                                The detailed financials and user tracking modules are coming in the next admin release. 
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
