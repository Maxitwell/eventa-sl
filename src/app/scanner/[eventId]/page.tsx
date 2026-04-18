"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Lock, ScanLine, List, CheckCircle2, XCircle, Search, User, Filter } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type TicketEntity = {
    id: string;
    eventId: string;
    ticketType?: string;
    status: "valid" | "used" | "refunded" | "pending_payment" | "failed_payment";
    guestName?: string;
    guestEmail?: string;
};

export default function ScannerTerminal() {
    const params = useParams();
    const eventId = params.eventId as string;

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [authError, setAuthError] = useState("");
    const [preloadedEventName, setPreloadedEventName] = useState<string | null>(null);

    const [event, setEvent] = useState<{ id: string; title: string } | null>(null);
    const [tickets, setTickets] = useState<TicketEntity[]>([]);
    const [sessionToken, setSessionToken] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterVIP, setFilterVIP] = useState(false);

    const [activeTab, setActiveTab] = useState<"camera" | "list">("camera");
    const [scanResult, setScanResult] = useState<{ status: "success" | "error", message: string } | null>(null);
    const [cameraStarted, setCameraStarted] = useState(false);

    // Hold the scanner instance in a ref — dynamically imported to avoid SSR crash
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Pre-load event name so staff can confirm they're at the right event before entering PIN
    useEffect(() => {
        if (!eventId) return;
        getDoc(doc(db, "events", eventId))
            .then((snap) => { if (snap.exists()) setPreloadedEventName((snap.data() as { title?: string }).title ?? null); })
            .catch(() => {});
    }, [eventId]);

    // Initial Auth Check
    useEffect(() => {
        const storedToken = localStorage.getItem(`scanner_token_${eventId}`);
        if (storedToken) {
            setSessionToken(storedToken);
            setIsAuthenticated(true);
        }
    }, [eventId]);

    // Load Data once Authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadEventData().catch(() => {
                setAuthError("Scanner session expired. Please enter Door Pin again.");
                localStorage.removeItem(`scanner_token_${eventId}`);
                setSessionToken("");
                setIsAuthenticated(false);
            });
        }
    }, [isAuthenticated, eventId, sessionToken]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const handleLogin = async (pin: string, isSilent = false) => {
        try {
            const response = await fetch("/api/scanner/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, pin }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (!isSilent) setAuthError(data.error || "Invalid Door Pin");
                localStorage.removeItem(`scanner_token_${eventId}`);
                return;
            }
            localStorage.setItem(`scanner_token_${eventId}`, data.token);
            setSessionToken(data.token);
            setEvent(data.event);
            setIsAuthenticated(true);
        } catch {
            if (!isSilent) setAuthError("Failed to connect. Check internet if logging in for the first time.");
        }
    };

    const loadEventData = async () => {
        if (!sessionToken) return;
        const response = await fetch(`/api/scanner/tickets?eventId=${encodeURIComponent(eventId)}`, {
            headers: {
                Authorization: `Bearer ${sessionToken}`,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to load tickets");
        }
        setTickets(data.tickets || []);
    };

    const triggerUX = (isSuccess: boolean) => {
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
            window.navigator.vibrate(isSuccess ? [100] : [200, 100, 200, 100, 400]);
        }
        document.body.style.backgroundColor = isSuccess ? "#052e16" : "#450a0a";
        setTimeout(() => { document.body.style.backgroundColor = ""; }, 300);
    };

    const processScan = async (decodedText: string) => {
        try {
            // Decode JWT payload without a library using browser-native atob()
            const parts = decodedText.split(".");
            if (parts.length === 3) {
                const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                const payload = JSON.parse(payloadStr);
                if (payload.eventId && payload.eventId !== eventId) {
                    triggerUX(false);
                    setScanResult({ status: "error", message: "Ticket is for a different event!" });
                    return;
                }
                if (payload.ticketId) {
                    await attemptAdmit(payload.ticketId);
                    return;
                }
            }
            // Fallback: treat the raw text as a ticket ID
            await attemptAdmit(decodedText);
        } catch {
            await attemptAdmit(decodedText);
        }
    };

    const attemptAdmit = async (ticketId: string) => {
        try {
            if (!sessionToken) throw new Error("Scanner session expired");
            const response = await fetch("/api/scanner/admit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({ eventId, ticketId }),
            });
            const data = await response.json();

            if (!response.ok || !data.ok) {
                triggerUX(false);
                setScanResult({ status: "error", message: data.message || data.error || "Ticket validation failed." });
                return;
            }
            setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "used" } : t)));
            triggerUX(true);
            setScanResult({ status: "success", message: data.message || "Admitted" });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            triggerUX(false);
            setScanResult({ status: "error", message: `Database error: ${message}` });
        }
    };

    const startCamera = async () => {
        setCameraStarted(true);
        setScanResult(null);
        try {
            // Dynamically import html5-qrcode only on the client, avoiding SSR crash
            const { Html5Qrcode } = await import("html5-qrcode");
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }
            if (scannerRef.current.isScanning) return;

            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText: string) => {
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.pause();
                        processScan(decodedText).finally(() => {
                            setTimeout(() => scannerRef.current?.resume(), 2000);
                        });
                    }
                },
                (_errorMessage: string) => { /* Ignore per-frame parse errors */ }
            );
        } catch (err: unknown) {
            console.error("Camera start error", err);
            setScanResult({ status: "error", message: "Could not access Camera. Check browser permissions." });
        }
    };

    const stopCamera = () => {
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(console.error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Event name banner */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                            <ScanLine size={13} /> Door Scanner
                        </div>
                        {preloadedEventName ? (
                            <h1 className="text-2xl font-extrabold text-white leading-tight">{preloadedEventName}</h1>
                        ) : (
                            <div className="h-7 w-48 bg-gray-800 rounded-lg animate-pulse mx-auto" />
                        )}
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
                        <div className="flex justify-center mb-5">
                            <div className="p-3 bg-orange-500/10 rounded-full text-orange-500">
                                <Lock size={28} />
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-white text-center mb-1">Enter Door PIN</h2>
                        <p className="text-gray-400 text-center text-sm mb-6">Enter the 6-character Gate PIN to unlock the scanner.</p>

                        {authError && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">{authError}</div>}

                        <input
                            type="text"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                            placeholder="e.g. X7K9P2"
                            autoFocus
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-orange-500 mb-4 uppercase"
                        />

                        <button
                            onClick={() => handleLogin(pinInput)}
                            className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition"
                        >
                            Unlock Scanner
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = (t.guestName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.guestEmail || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVIP = filterVIP ? (t.ticketType || "").toLowerCase().includes("vip") : true;
        return matchesSearch && matchesVIP;
    });

    const totalAdmitted = tickets.filter(t => t.status === "used").length;

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50 flex items-center justify-between">
                <div>
                    <h1 className="text-white font-bold text-lg truncate max-w-[200px]">{event?.title || "Event Gate"}</h1>
                    <p className="text-orange-500 text-xs font-semibold">ADMITTED: {totalAdmitted} / {tickets.length}</p>
                </div>
                <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => { setActiveTab("camera"); startCamera(); }}
                        className={`p-2 rounded-md ${activeTab === 'camera' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    >
                        <ScanLine size={20} />
                    </button>
                    <button
                        onClick={() => { setActiveTab("list"); stopCamera(); }}
                        className={`p-2 rounded-md ${activeTab === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative overflow-hidden">
                {activeTab === "camera" ? (
                    <div className="flex-1 flex flex-col">
                        <div id="reader" className="w-full bg-black" style={{ minHeight: "60vh" }}></div>

                        {scanResult && (
                            <div className={`absolute bottom-0 left-0 right-0 p-6 ${scanResult.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                                <div className="flex items-center gap-4">
                                    {scanResult.status === 'success' ?
                                        <CheckCircle2 className="text-white shrink-0" size={40} /> :
                                        <XCircle className="text-white shrink-0" size={40} />
                                    }
                                    <div>
                                        <h3 className="text-white font-bold text-xl">{scanResult.status === 'success' ? 'VALID' : 'INVALID'}</h3>
                                        <p className="text-white/80 text-sm leading-tight">{scanResult.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!cameraStarted && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button onClick={startCamera} className="bg-orange-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg text-lg">
                                    Tap to Start Camera
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        <div className="flex gap-2 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <button
                                onClick={() => setFilterVIP(!filterVIP)}
                                className={`px-4 flex items-center justify-center rounded-xl border text-sm font-medium transition ${filterVIP ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                            >
                                <Filter size={16} className="mr-2" /> VIP
                            </button>
                        </div>

                        <div className="space-y-3">
                            {filteredTickets.map(ticket => (
                                <div key={ticket.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ticket.status === 'used' ? 'bg-green-500/10 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium line-clamp-1">{ticket.guestName || "Guest Entry"}</h4>
                                            <p className="text-xs text-gray-500 flex gap-2">
                                                <span className={`${ticket.ticketType?.toLowerCase().includes('vip') ? 'text-orange-400' : ''}`}>{ticket.ticketType || "Standard"}</span>
                                                <span>•</span>
                                                <span className={ticket.status === 'used' ? 'text-green-500' : ticket.status === 'valid' ? 'text-blue-400' : 'text-red-400'}>
                                                    {ticket.status.toUpperCase()}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    {ticket.status === 'valid' && (
                                        <button
                                            onClick={() => attemptAdmit(ticket.id)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/10 transition"
                                        >
                                            Admit
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredTickets.length === 0 && (
                                <div className="text-center py-10 text-gray-500 text-sm">
                                    No attendees match your search.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
