"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    Lock, ScanLine, List, CheckCircle2, XCircle,
    Search, User, Filter, RefreshCw, Zap, LogOut, Clock,
} from "lucide-react";
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

type ScanResult = {
    status: "success" | "error";
    message: string;
    guestName?: string;
    ticketType?: string;
};

type ScanHistoryEntry = {
    id: string;
    guestName: string;
    ticketType: string;
    timestamp: Date;
    status: "success" | "error";
    message: string;
};

export default function ScannerTerminal() {
    const params = useParams();
    const eventId = params.eventId as string;

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [authError, setAuthError] = useState("");
    const [preloadedEventName, setPreloadedEventName] = useState<string | null>(null);

    // Event + ticket state
    const [event, setEvent] = useState<{ id: string; title: string } | null>(null);
    const [tickets, setTickets] = useState<TicketEntity[]>([]);
    const [sessionToken, setSessionToken] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterVIP, setFilterVIP] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    // Camera state
    const [activeTab, setActiveTab] = useState<"camera" | "list" | "history">("camera");
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [cameraStarted, setCameraStarted] = useState(false);
    const [cameraLive, setCameraLive] = useState(false);
    const [torchEnabled, setTorchEnabled] = useState(false);

    // Scan history (this session only)
    const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

    // Confirm-before-admit: first tap sets the id, second tap confirms
    const [confirmAdmitId, setConfirmAdmitId] = useState<string | null>(null);

    // Refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionTokenRef = useRef(sessionToken);

    // Keep ref in sync so polling closure always has the latest token
    useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);

    // Pre-load event name before auth so staff can confirm correct event
    useEffect(() => {
        if (!eventId) return;
        getDoc(doc(db, "events", eventId))
            .then((snap) => {
                if (snap.exists()) setPreloadedEventName((snap.data() as { title?: string }).title ?? null);
            })
            .catch(() => {});
    }, [eventId]);

    // Online / offline banner
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    // Initial auth check from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem(`scanner_token_${eventId}`);
        if (storedToken) {
            setSessionToken(storedToken);
            setIsAuthenticated(true);
        }
    }, [eventId]);

    const loadEventData = useCallback(async (token?: string) => {
        const t = token ?? sessionTokenRef.current;
        if (!t) return;
        const response = await fetch(`/api/scanner/tickets?eventId=${encodeURIComponent(eventId)}`, {
            headers: { Authorization: `Bearer ${t}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load tickets");
        setTickets(data.tickets || []);
    }, [eventId]);

    // Load data on auth + start 30-second polling for real-time sync
    useEffect(() => {
        if (!isAuthenticated) return;

        loadEventData().catch(() => {
            setAuthError("Scanner session expired. Please enter Door Pin again.");
            localStorage.removeItem(`scanner_token_${eventId}`);
            setSessionToken("");
            setIsAuthenticated(false);
        });

        pollIntervalRef.current = setInterval(() => {
            loadEventData().catch(() => {}); // silent on poll failure
        }, 30000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isAuthenticated, eventId, loadEventData]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const handleLogin = async (pin: string) => {
        if (!pin || pin.length < 6) return;
        if (!isOnline) {
            setAuthError("No internet connection. Connect to log in for the first time.");
            return;
        }
        try {
            const response = await fetch("/api/scanner/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, pin }),
            });
            const data = await response.json();
            if (!response.ok) {
                setAuthError(data.error || "Invalid Door Pin");
                localStorage.removeItem(`scanner_token_${eventId}`);
                return;
            }
            localStorage.setItem(`scanner_token_${eventId}`, data.token);
            setSessionToken(data.token);
            setEvent(data.event);
            setIsAuthenticated(true);
        } catch {
            setAuthError("Failed to connect. Check internet connection.");
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try { await loadEventData(); } catch { /* silent */ } finally { setIsRefreshing(false); }
    };

    const handleLogout = () => {
        if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error);
        localStorage.removeItem(`scanner_token_${eventId}`);
        setSessionToken("");
        setIsAuthenticated(false);
        setEvent(null);
        setTickets([]);
        setScanHistory([]);
        setCameraStarted(false);
        setCameraLive(false);
        setTorchEnabled(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };

    // Web Audio API — success = two ascending tones, failure = low single tone
    const playSound = (success: boolean) => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (success) {
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            } else {
                osc.frequency.setValueAtTime(280, ctx.currentTime);
                gain.gain.setValueAtTime(0.35, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch { /* AudioContext unavailable */ }
    };

    const triggerUX = (isSuccess: boolean) => {
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
            window.navigator.vibrate(isSuccess ? [80] : [200, 80, 200, 80, 400]);
        }
        playSound(isSuccess);
        document.body.style.backgroundColor = isSuccess ? "#052e16" : "#450a0a";
        setTimeout(() => { document.body.style.backgroundColor = ""; }, 300);
    };

    // Show scan result overlay; auto-dismiss after 4s, tap also dismisses
    const showScanResult = (result: ScanResult) => {
        setScanResult(result);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => setScanResult(null), 4000);
    };

    const dismissScanResult = () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setScanResult(null);
    };

    const processScan = async (decodedText: string) => {
        try {
            const parts = decodedText.split(".");
            if (parts.length === 3) {
                const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
                const payload = JSON.parse(payloadStr);
                if (payload.eventId && payload.eventId !== eventId) {
                    triggerUX(false);
                    showScanResult({ status: "error", message: "Ticket is for a different event!" });
                    return;
                }
                if (payload.ticketId) { await attemptAdmit(payload.ticketId); return; }
            }
            await attemptAdmit(decodedText);
        } catch {
            await attemptAdmit(decodedText);
        }
    };

    const attemptAdmit = async (ticketId: string) => {
        if (!isOnline) {
            triggerUX(false);
            showScanResult({ status: "error", message: "No internet — cannot validate ticket." });
            return;
        }
        try {
            const token = sessionTokenRef.current;
            if (!token) throw new Error("Scanner session expired");
            const response = await fetch("/api/scanner/admit", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ eventId, ticketId }),
            });
            const data = await response.json();

            // Append to session history regardless of outcome
            setScanHistory((prev) => [{
                id: `${Date.now()}-${Math.random()}`,
                guestName: data.guestName || "Unknown",
                ticketType: data.ticketType || "Standard",
                timestamp: new Date(),
                status: response.ok && data.ok ? "success" : "error",
                message: data.message || data.error || "Unknown result",
            }, ...prev]);

            if (!response.ok || !data.ok) {
                triggerUX(false);
                showScanResult({
                    status: "error",
                    message: data.message || data.error || "Ticket validation failed.",
                    guestName: data.guestName,
                    ticketType: data.ticketType,
                });
                return;
            }
            setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "used" } : t));
            triggerUX(true);
            showScanResult({
                status: "success",
                message: "Admitted",
                guestName: data.guestName,
                ticketType: data.ticketType,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            triggerUX(false);
            const isNetErr = !navigator.onLine || msg.toLowerCase().includes("fetch");
            showScanResult({
                status: "error",
                message: isNetErr ? "Network error — check connection and retry." : `Error: ${msg}`,
            });
        }
    };

    // Toggle flashlight via MediaStream track constraint
    const toggleTorch = async () => {
        try {
            const video = document.querySelector("#reader video") as HTMLVideoElement | null;
            if (!video?.srcObject) return;
            const track = (video.srcObject as MediaStream).getVideoTracks()[0];
            const next = !torchEnabled;
            await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
            setTorchEnabled(next);
        } catch { /* torch not supported on this device */ }
    };

    const startCamera = async () => {
        setCameraStarted(true);
        setScanResult(null);
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            if (!scannerRef.current) scannerRef.current = new Html5Qrcode("reader");
            if (scannerRef.current.isScanning) return;
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText: string) => {
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.pause();
                        processScan(decodedText).finally(() => {
                            setTimeout(() => scannerRef.current?.resume(), 2500);
                        });
                    }
                },
                (_err: string) => { /* per-frame parse noise — ignore */ }
            );
            setCameraLive(true);
        } catch (err) {
            console.error("Camera start error", err);
            setCameraStarted(false);
            setCameraLive(false);
            showScanResult({ status: "error", message: "Could not access camera. Check browser permissions." });
        }
    };

    const stopCamera = () => {
        if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error);
        setCameraLive(false);
        setTorchEnabled(false);
    };

    // Two-tap confirm for manual admit from list
    const handleConfirmAdmit = (ticketId: string) => {
        if (confirmAdmitId === ticketId) {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmAdmitId(null);
            attemptAdmit(ticketId);
        } else {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmAdmitId(ticketId);
            confirmTimerRef.current = setTimeout(() => setConfirmAdmitId(null), 3000);
        }
    };

    // Derived state
    const totalAdmitted = tickets.filter((t) => t.status === "used").length;

    const filteredTickets = tickets.filter((t) => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
            (t.guestName || "").toLowerCase().includes(q) ||
            (t.guestEmail || "").toLowerCase().includes(q);
        const matchVIP = filterVIP ? (t.ticketType || "").toLowerCase().includes("vip") : true;
        return matchSearch && matchVIP;
    });

    const typeStats = tickets.reduce((acc, t) => {
        const type = t.ticketType || "Standard";
        if (!acc[type]) acc[type] = { total: 0, admitted: 0 };
        acc[type].total++;
        if (t.status === "used") acc[type].admitted++;
        return acc;
    }, {} as Record<string, { total: number; admitted: number }>);

    // ─── PIN Screen ──────────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {!isOnline && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs text-center rounded-lg">
                            No internet connection
                        </div>
                    )}
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
                        <p className="text-gray-400 text-center text-sm mb-6">6-character Gate PIN to unlock the scanner.</p>

                        {authError && (
                            <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">{authError}</div>
                        )}

                        <input
                            type="text"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(pinInput); }}
                            placeholder="e.g. X7K9P2"
                            autoFocus
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-orange-500 mb-4 uppercase"
                        />
                        <button
                            onClick={() => handleLogin(pinInput)}
                            disabled={pinInput.length < 6}
                            className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Unlock Scanner
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main Scanner UI ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-50">
                <div className="flex items-start justify-between gap-3">
                    {/* Event info + counts */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-white font-bold text-base truncate">{event?.title || "Event Gate"}</h1>
                        <p className="text-orange-500 text-xs font-semibold mt-0.5">
                            ADMITTED: {totalAdmitted} / {tickets.length}
                        </p>
                        {/* Per-type breakdown */}
                        {Object.keys(typeStats).length > 0 && (
                            <p className="text-xs mt-0.5 flex flex-wrap gap-x-2">
                                {Object.entries(typeStats).map(([type, s]) => (
                                    <span key={type} className={type.toLowerCase().includes("vip") ? "text-orange-400" : "text-gray-500"}>
                                        {type}: {s.admitted}/{s.total}
                                    </span>
                                ))}
                            </p>
                        )}
                        {!isOnline && (
                            <p className="text-yellow-500 text-xs font-semibold mt-0.5">⚠ Offline</p>
                        )}
                    </div>

                    {/* Tab switcher + logout */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => { setActiveTab("camera"); startCamera(); }}
                                title="Camera"
                                className={`p-2 rounded-md transition ${activeTab === "camera" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                <ScanLine size={18} />
                            </button>
                            <button
                                onClick={() => { setActiveTab("list"); stopCamera(); }}
                                title="Guest List"
                                className={`p-2 rounded-md transition ${activeTab === "list" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => { setActiveTab("history"); stopCamera(); }}
                                title="Scan History"
                                className={`relative p-2 rounded-md transition ${activeTab === "history" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                <Clock size={18} />
                                {scanHistory.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {scanHistory.length > 99 ? "99" : scanHistory.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Lock Scanner"
                            className="p-2 rounded-lg bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative overflow-hidden">

                {/* ── Camera Tab ─────────────────────────────────────────── */}
                {activeTab === "camera" && (
                    <div className="flex-1 flex flex-col relative">
                        {/* QR reader mount point */}
                        <div id="reader" className="w-full bg-black" style={{ minHeight: "65vh" }} />

                        {/* Overlays that sit above the camera feed */}
                        {cameraLive && (
                            <div className="absolute top-3 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                                {/* LIVE indicator */}
                                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-400 text-xs font-bold tracking-widest">LIVE</span>
                                </div>
                                {/* Torch toggle */}
                                <button
                                    onClick={toggleTorch}
                                    title={torchEnabled ? "Turn off flashlight" : "Turn on flashlight"}
                                    className={`pointer-events-auto p-3 rounded-full transition ${
                                        torchEnabled
                                            ? "bg-yellow-400 text-black"
                                            : "bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                                    }`}
                                >
                                    <Zap size={20} fill={torchEnabled ? "currentColor" : "none"} />
                                </button>
                            </div>
                        )}

                        {/* Scan result — full-overlay, tap to dismiss, auto-dismiss 4s */}
                        {scanResult && (
                            <div
                                onClick={dismissScanResult}
                                className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer select-none ${
                                    scanResult.status === "success" ? "bg-green-950/97" : "bg-red-950/97"
                                }`}
                                style={{ zIndex: 20 }}
                            >
                                <div className="text-center px-8 max-w-xs">
                                    {scanResult.status === "success" ? (
                                        <CheckCircle2 className="text-green-400 mx-auto mb-4" size={88} />
                                    ) : (
                                        <XCircle className="text-red-400 mx-auto mb-4" size={88} />
                                    )}
                                    <h2 className={`text-5xl font-black mb-3 tracking-wide ${
                                        scanResult.status === "success" ? "text-green-300" : "text-red-300"
                                    }`}>
                                        {scanResult.status === "success" ? "VALID" : "REJECTED"}
                                    </h2>
                                    {scanResult.guestName && (
                                        <p className="text-white text-2xl font-bold leading-tight mb-1">{scanResult.guestName}</p>
                                    )}
                                    {scanResult.ticketType && (
                                        <p className={`text-base font-semibold mb-3 ${
                                            scanResult.ticketType.toLowerCase().includes("vip") ? "text-orange-400" : "text-white/50"
                                        }`}>
                                            {scanResult.ticketType.toUpperCase()}
                                        </p>
                                    )}
                                    {scanResult.status === "error" && (
                                        <p className="text-red-300/80 text-sm leading-snug">{scanResult.message}</p>
                                    )}
                                    <p className="text-white/25 text-xs mt-6">Tap anywhere to dismiss</p>
                                </div>
                            </div>
                        )}

                        {/* Initial state — camera not yet started */}
                        {!cameraStarted && (
                            <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-5 px-8">
                                <div className="p-5 bg-orange-500/10 rounded-full text-orange-500">
                                    <ScanLine size={56} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-xl mb-2">Ready to Scan</h3>
                                    <p className="text-gray-400 text-sm">Point the camera at any ticket QR code</p>
                                </div>
                                <button
                                    onClick={startCamera}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg text-lg transition"
                                >
                                    Start Camera
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── List Tab ───────────────────────────────────────────── */}
                {activeTab === "list" && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        {/* Search + VIP filter + refresh */}
                        <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <button
                                onClick={() => setFilterVIP(!filterVIP)}
                                title="Filter VIP"
                                className={`px-3 flex items-center justify-center rounded-xl border text-sm font-bold transition ${
                                    filterVIP ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-900 border-gray-800 text-gray-400"
                                }`}
                            >
                                <Filter size={15} />
                            </button>
                            <button
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                title="Refresh list"
                                className="px-3 flex items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition disabled:opacity-40"
                            >
                                <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {/* Per-type stat pills */}
                        {Object.keys(typeStats).length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                                {Object.entries(typeStats).map(([type, s]) => (
                                    <div key={type} className="shrink-0 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center min-w-[72px]">
                                        <p className={`text-xs font-bold uppercase tracking-wide ${
                                            type.toLowerCase().includes("vip") ? "text-orange-400" : "text-gray-400"
                                        }`}>{type}</p>
                                        <p className="text-white font-bold text-sm mt-0.5">
                                            {s.admitted}<span className="text-gray-600 font-normal">/{s.total}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ticket list */}
                        <div className="space-y-2">
                            {filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className={`bg-gray-900 rounded-xl p-4 flex items-center justify-between border transition ${
                                        ticket.status === "used" ? "border-green-900/40" : "border-gray-800"
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                            ticket.status === "used" ? "bg-green-500/10 text-green-500" : "bg-gray-800 text-gray-400"
                                        }`}>
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-white font-medium text-sm line-clamp-1">
                                                {ticket.guestName || "Guest Entry"}
                                            </h4>
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                <span className={ticket.ticketType?.toLowerCase().includes("vip") ? "text-orange-400 font-semibold" : ""}>
                                                    {ticket.ticketType || "Standard"}
                                                </span>
                                                <span>·</span>
                                                <span className={
                                                    ticket.status === "used" ? "text-green-500" :
                                                    ticket.status === "valid" ? "text-blue-400" : "text-red-400"
                                                }>
                                                    {ticket.status.replace(/_/g, " ").toUpperCase()}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    {ticket.status === "valid" && (
                                        <button
                                            onClick={() => handleConfirmAdmit(ticket.id)}
                                            className={`ml-3 shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                                confirmAdmitId === ticket.id
                                                    ? "bg-orange-500 border-orange-400 text-white animate-pulse"
                                                    : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                                            }`}
                                        >
                                            {confirmAdmitId === ticket.id ? "Confirm?" : "Admit"}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredTickets.length === 0 && (
                                <div className="text-center py-12 text-gray-500 text-sm">
                                    <User size={32} className="mx-auto mb-3 opacity-20" />
                                    No attendees match your search.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── History Tab ────────────────────────────────────────── */}
                {activeTab === "history" && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-bold text-sm">Session Scan Log</h2>
                            <span className="text-gray-500 text-xs">{scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} this session</span>
                        </div>

                        {scanHistory.length === 0 ? (
                            <div className="text-center py-14 text-gray-500 text-sm">
                                <Clock size={36} className="mx-auto mb-3 opacity-20" />
                                No scans recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {scanHistory.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`rounded-xl p-3 border flex items-center gap-3 ${
                                            entry.status === "success"
                                                ? "bg-green-500/5 border-green-900/40"
                                                : "bg-red-500/5 border-red-900/40"
                                        }`}
                                    >
                                        {entry.status === "success" ? (
                                            <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                                        ) : (
                                            <XCircle size={20} className="text-red-500 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium line-clamp-1">{entry.guestName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                <span className={entry.ticketType.toLowerCase().includes("vip") ? "text-orange-400" : ""}>
                                                    {entry.ticketType}
                                                </span>
                                                <span className="mx-1">·</span>
                                                <span>{entry.message}</span>
                                            </p>
                                        </div>
                                        <span className="text-gray-600 text-xs shrink-0 font-mono">
                                            {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
