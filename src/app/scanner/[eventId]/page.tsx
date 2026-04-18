"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    Lock, ScanLine, List, CheckCircle2, XCircle,
    Search, User, Filter, RefreshCw, Zap, LogOut, Clock, WifiOff,
} from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = "valid" | "used" | "refunded" | "pending_payment" | "failed_payment";

type LocalTicket = {
    id: string;
    eventId: string;
    ticketType?: string;
    status: TicketStatus;
    guestName?: string;
    guestEmail?: string;
    offlineAdmitted?: boolean; // admitted locally, sync pending
};

type TicketManifest = {
    eventId: string;
    tickets: Record<string, LocalTicket>; // keyed by ticketId for O(1) lookup
    cachedAt: string;
};

type AdmitQueueEntry = {
    ticketId: string;
    queuedAt: string;
};

type ScanResult = {
    status: "success" | "error";
    message: string;
    guestName?: string;
    ticketType?: string;
    isOffline?: boolean;
};

type ScanHistoryEntry = {
    id: string;
    guestName: string;
    ticketType: string;
    timestamp: Date;
    status: "success" | "error";
    message: string;
    wasOffline?: boolean;
};

// ─── localStorage helpers (module-level, no closure issues) ──────────────────

function readManifest(eid: string): TicketManifest | null {
    try { const r = localStorage.getItem(`scanner_manifest_${eid}`); return r ? JSON.parse(r) : null; }
    catch { return null; }
}
function writeManifest(eid: string, m: TicketManifest): void {
    try { localStorage.setItem(`scanner_manifest_${eid}`, JSON.stringify(m)); } catch { /* quota */ }
}
function readQueue(eid: string): AdmitQueueEntry[] {
    try { const r = localStorage.getItem(`scanner_queue_${eid}`); return r ? JSON.parse(r) : []; }
    catch { return []; }
}
function writeQueue(eid: string, q: AdmitQueueEntry[]): void {
    try { localStorage.setItem(`scanner_queue_${eid}`, JSON.stringify(q)); } catch { /* quota */ }
}
function manifestToArray(m: TicketManifest): LocalTicket[] {
    return Object.values(m.tickets);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScannerTerminal() {
    const params = useParams();
    const eventId = params.eventId as string;

    // Auth
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [authError, setAuthError] = useState("");
    const [preloadedEventName, setPreloadedEventName] = useState<string | null>(null);

    // Event + tickets
    const [event, setEvent] = useState<{ id: string; title: string } | null>(null);
    const [tickets, setTickets] = useState<LocalTicket[]>([]);
    const [sessionToken, setSessionToken] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterVIP, setFilterVIP] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Connectivity + sync
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState(0);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Camera
    const [activeTab, setActiveTab] = useState<"camera" | "list" | "history">("camera");
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [cameraStarted, setCameraStarted] = useState(false);
    const [cameraLive, setCameraLive] = useState(false);
    const [torchEnabled, setTorchEnabled] = useState(false);

    // Scan history + confirm-admit
    const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
    const [confirmAdmitId, setConfirmAdmitId] = useState<string | null>(null);

    // Refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionTokenRef = useRef(sessionToken);
    const isFlushingRef = useRef(false);

    useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);

    // Pre-load event name before PIN entry
    useEffect(() => {
        if (!eventId) return;
        getDoc(doc(db, "events", eventId))
            .then((snap) => {
                if (snap.exists()) setPreloadedEventName((snap.data() as { title?: string }).title ?? null);
            })
            .catch(() => {});
    }, [eventId]);

    // Online / offline detection + auto-flush on reconnect
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Auto-flush the admit queue when internet returns
            flushQueue();
        };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Restore session from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem(`scanner_token_${eventId}`);
        if (storedToken) {
            setSessionToken(storedToken);
            setIsAuthenticated(true);
        }
    }, [eventId]);

    // ── Flush offline admit queue to server ──────────────────────────────────
    const flushQueue = useCallback(async () => {
        if (isFlushingRef.current) return;
        const queue = readQueue(eventId);
        if (!queue.length) return;
        const token = sessionTokenRef.current;
        if (!token || !navigator.onLine) return;

        isFlushingRef.current = true;
        setIsSyncing(true);

        let remaining = [...queue];
        for (const entry of queue) {
            try {
                const res = await fetch("/api/scanner/admit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ eventId, ticketId: entry.ticketId }),
                });
                const data = await res.json();
                // Remove from queue whether server says ok or "already used"
                // (already used means another scanner got it — that's fine, person is inside)
                if (res.ok || data.message === "Already Scanned!") {
                    remaining = remaining.filter((q) => q.ticketId !== entry.ticketId);
                    writeQueue(eventId, remaining);
                    setPendingSync(remaining.length);

                    // Clear offlineAdmitted flag in local manifest now that server confirmed it
                    const manifest = readManifest(eventId);
                    if (manifest?.tickets[entry.ticketId]) {
                        manifest.tickets[entry.ticketId].offlineAdmitted = false;
                        writeManifest(eventId, manifest);
                    }
                }
            } catch {
                break; // Network failed again — stop, try again later
            }
        }

        isFlushingRef.current = false;
        setIsSyncing(false);
    }, [eventId]);

    // ── Fetch fresh ticket list from server ──────────────────────────────────
    const loadEventData = useCallback(async () => {
        const token = sessionTokenRef.current;
        if (!token) return;

        const res = await fetch(`/api/scanner/tickets?eventId=${encodeURIComponent(eventId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.status === 401 || res.status === 403) throw new Error("AUTH_EXPIRED");
        if (!res.ok) throw new Error("NETWORK_ERROR");

        const serverTickets: LocalTicket[] = data.tickets || [];

        // Merge: any ticket currently in the offline queue must stay "used"
        // even if the server hasn't been updated yet (flush may not have run)
        const queue = readQueue(eventId);
        const queuedIds = new Set(queue.map((q) => q.ticketId));
        serverTickets.forEach((t) => {
            if (queuedIds.has(t.id)) {
                t.status = "used";
                t.offlineAdmitted = true;
            }
        });

        // Write to local manifest
        const manifest: TicketManifest = {
            eventId,
            tickets: serverTickets.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, LocalTicket>),
            cachedAt: new Date().toISOString(),
        };
        writeManifest(eventId, manifest);

        setTickets(serverTickets);
        setLastSynced(new Date());
    }, [eventId]);

    // On auth: load from cache first, then fetch fresh in background + start polling
    useEffect(() => {
        if (!isAuthenticated) return;

        // 1. Load cache immediately for instant offline UI
        const cached = readManifest(eventId);
        if (cached) {
            setTickets(manifestToArray(cached));
            setLastSynced(new Date(cached.cachedAt));
        }

        // 2. Restore pending sync count
        setPendingSync(readQueue(eventId).length);

        // 3. Fetch fresh data
        loadEventData().catch((err: Error) => {
            if (err.message === "AUTH_EXPIRED") {
                // Token is genuinely invalid — log out
                setAuthError("Scanner session expired. Please enter Door Pin again.");
                localStorage.removeItem(`scanner_token_${eventId}`);
                setSessionToken("");
                setIsAuthenticated(false);
            }
            // NETWORK_ERROR: cache already loaded above — stay operational
        });

        // 4. Flush any queued offline admits
        flushQueue();

        // 5. Poll every 30s for multi-scanner real-time sync
        pollIntervalRef.current = setInterval(() => {
            loadEventData().catch(() => {});
            flushQueue();
        }, 30000);

        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [isAuthenticated, eventId, loadEventData, flushQueue]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // ── Auth ─────────────────────────────────────────────────────────────────

    const handleLogin = async (pin: string) => {
        if (!pin || pin.length < 6) return;

        // Allow login from cache if offline (token already in localStorage covers this via useEffect)
        if (!isOnline && !localStorage.getItem(`scanner_token_${eventId}`)) {
            setAuthError("No internet. Connect to log in for the first time.");
            return;
        }

        try {
            const res = await fetch("/api/scanner/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, pin }),
            });
            const data = await res.json();
            if (!res.ok) { setAuthError(data.error || "Invalid Door Pin"); return; }
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
        // Intentionally keep manifest + queue in localStorage so offline admits
        // survive a shift handover and get flushed next time the scanner logs in
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

    // ── Sound + haptics ──────────────────────────────────────────────────────

    const playSound = (success: boolean) => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if (success) {
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
            } else {
                osc.frequency.setValueAtTime(280, ctx.currentTime);
                gain.gain.setValueAtTime(0.35, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
            }
        } catch { /* AudioContext unavailable */ }
    };

    const triggerUX = (isSuccess: boolean) => {
        if (typeof window !== "undefined" && window.navigator?.vibrate)
            window.navigator.vibrate(isSuccess ? [80] : [200, 80, 200, 80, 400]);
        playSound(isSuccess);
        document.body.style.backgroundColor = isSuccess ? "#052e16" : "#450a0a";
        setTimeout(() => { document.body.style.backgroundColor = ""; }, 300);
    };

    // ── Scan result overlay ──────────────────────────────────────────────────

    const showScanResult = (result: ScanResult) => {
        setScanResult(result);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => setScanResult(null), 4000);
    };
    const dismissScanResult = () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setScanResult(null);
    };

    // ── Admit logic (offline-first) ──────────────────────────────────────────

    const attemptAdmit = useCallback(async (ticketId: string) => {
        // ── OFFLINE PATH ────────────────────────────────────────────────────
        if (!navigator.onLine) {
            const manifest = readManifest(eventId);
            if (!manifest) {
                triggerUX(false);
                showScanResult({ status: "error", message: "Offline with no cached data. Must connect at least once." });
                return;
            }
            const ticket = manifest.tickets[ticketId];
            if (!ticket) {
                triggerUX(false);
                showScanResult({ status: "error", message: "Ticket not in local data. May be forged or wrong event." });
                return;
            }
            if (ticket.status === "used" || ticket.offlineAdmitted) {
                triggerUX(false);
                showScanResult({ status: "error", message: "Already Scanned!", guestName: ticket.guestName, ticketType: ticket.ticketType });
                setScanHistory((p) => [{ id: `${Date.now()}`, guestName: ticket.guestName || "Unknown", ticketType: ticket.ticketType || "Standard", timestamp: new Date(), status: "error", message: "Already Scanned!", wasOffline: true }, ...p]);
                return;
            }
            if (ticket.status !== "valid") {
                triggerUX(false);
                showScanResult({ status: "error", message: `Ticket is ${ticket.status.replace(/_/g, " ").toUpperCase()}`, guestName: ticket.guestName, ticketType: ticket.ticketType });
                setScanHistory((p) => [{ id: `${Date.now()}`, guestName: ticket.guestName || "Unknown", ticketType: ticket.ticketType || "Standard", timestamp: new Date(), status: "error", message: ticket.status.replace(/_/g, " ").toUpperCase(), wasOffline: true }, ...p]);
                return;
            }

            // Mark locally used
            manifest.tickets[ticketId] = { ...ticket, status: "used", offlineAdmitted: true };
            writeManifest(eventId, manifest);

            // Add to sync queue
            const queue = readQueue(eventId);
            if (!queue.find((q) => q.ticketId === ticketId)) {
                queue.push({ ticketId, queuedAt: new Date().toISOString() });
                writeQueue(eventId, queue);
                setPendingSync(queue.length);
            }

            // Update UI state optimistically
            setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "used", offlineAdmitted: true } : t));
            triggerUX(true);
            showScanResult({ status: "success", message: "Queued — will sync when online", guestName: ticket.guestName, ticketType: ticket.ticketType, isOffline: true });
            setScanHistory((p) => [{ id: `${Date.now()}`, guestName: ticket.guestName || "Unknown", ticketType: ticket.ticketType || "Standard", timestamp: new Date(), status: "success", message: "Admitted offline — pending sync", wasOffline: true }, ...p]);
            return;
        }

        // ── ONLINE PATH ─────────────────────────────────────────────────────
        try {
            const token = sessionTokenRef.current;
            if (!token) throw new Error("Scanner session expired");
            const res = await fetch("/api/scanner/admit", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ eventId, ticketId }),
            });
            const data = await res.json();

            setScanHistory((p) => [{
                id: `${Date.now()}-${Math.random()}`,
                guestName: data.guestName || "Unknown",
                ticketType: data.ticketType || "Standard",
                timestamp: new Date(),
                status: res.ok && data.ok ? "success" : "error",
                message: data.message || data.error || "Unknown result",
                wasOffline: false,
            }, ...p]);

            if (!res.ok || !data.ok) {
                triggerUX(false);
                showScanResult({ status: "error", message: data.message || data.error || "Validation failed.", guestName: data.guestName, ticketType: data.ticketType });
                return;
            }

            // Update local manifest on successful online admit
            const manifest = readManifest(eventId);
            if (manifest?.tickets[ticketId]) {
                manifest.tickets[ticketId] = { ...manifest.tickets[ticketId], status: "used", offlineAdmitted: false };
                writeManifest(eventId, manifest);
            }

            setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "used" } : t));
            triggerUX(true);
            showScanResult({ status: "success", message: "Admitted", guestName: data.guestName, ticketType: data.ticketType });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            triggerUX(false);
            showScanResult({ status: "error", message: !navigator.onLine ? "Network lost — retry." : `Error: ${msg}` });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const processScan = useCallback(async (decodedText: string) => {
        try {
            const parts = decodedText.split(".");
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId, attemptAdmit]);

    // ── Camera ───────────────────────────────────────────────────────────────

    const toggleTorch = async () => {
        try {
            const video = document.querySelector("#reader video") as HTMLVideoElement | null;
            if (!video?.srcObject) return;
            const track = (video.srcObject as MediaStream).getVideoTracks()[0];
            const next = !torchEnabled;
            await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
            setTorchEnabled(next);
        } catch { /* torch not supported */ }
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
                (decoded: string) => {
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.pause();
                        processScan(decoded).finally(() => {
                            setTimeout(() => scannerRef.current?.resume(), 2500);
                        });
                    }
                },
                () => { /* per-frame noise — ignore */ }
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

    // ── Derived state ────────────────────────────────────────────────────────

    const totalAdmitted = tickets.filter((t) => t.status === "used").length;

    const filteredTickets = tickets.filter((t) => {
        const q = searchQuery.toLowerCase();
        const ms = !q || (t.guestName || "").toLowerCase().includes(q) || (t.guestEmail || "").toLowerCase().includes(q);
        const mv = filterVIP ? (t.ticketType || "").toLowerCase().includes("vip") : true;
        return ms && mv;
    });

    const typeStats = tickets.reduce((acc, t) => {
        const type = t.ticketType || "Standard";
        if (!acc[type]) acc[type] = { total: 0, admitted: 0 };
        acc[type].total++;
        if (t.status === "used") acc[type].admitted++;
        return acc;
    }, {} as Record<string, { total: number; admitted: number }>);

    const cachedAt = readManifest(eventId)?.cachedAt;

    // ─── PIN Screen ──────────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {!isOnline && (
                        <div className="mb-4 flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg">
                            <WifiOff size={14} /> No internet — cached data will be used if you previously logged in.
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
                            <div className="p-3 bg-orange-500/10 rounded-full text-orange-500"><Lock size={28} /></div>
                        </div>
                        <h2 className="text-lg font-bold text-white text-center mb-1">Enter Door PIN</h2>
                        <p className="text-gray-400 text-center text-sm mb-6">6-character Gate PIN to unlock the scanner.</p>
                        {authError && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">{authError}</div>}
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

            {/* ── Header ────────────────────────────────────────────────── */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-50">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-white font-bold text-base truncate">{event?.title || "Event Gate"}</h1>
                        <p className="text-orange-500 text-xs font-semibold mt-0.5">
                            ADMITTED: {totalAdmitted} / {tickets.length}
                            {pendingSync > 0 && (
                                <span className="ml-2 text-yellow-400">· {pendingSync} unsynced</span>
                            )}
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

                        {/* Connectivity / sync status */}
                        {!isOnline ? (
                            <p className="text-yellow-500 text-xs font-semibold mt-0.5 flex items-center gap-1">
                                <WifiOff size={11} /> Offline — admits queued locally
                            </p>
                        ) : isSyncing ? (
                            <p className="text-blue-400 text-xs mt-0.5">Syncing…</p>
                        ) : lastSynced ? (
                            <p className="text-gray-600 text-xs mt-0.5">
                                Synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        ) : cachedAt ? (
                            <p className="text-gray-600 text-xs mt-0.5">
                                Cached {new Date(cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        ) : null}
                    </div>

                    {/* Tabs + logout */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => { setActiveTab("camera"); startCamera(); }}
                                title="Camera"
                                className={`p-2 rounded-md transition ${activeTab === "camera" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
                            ><ScanLine size={18} /></button>
                            <button
                                onClick={() => { setActiveTab("list"); stopCamera(); }}
                                title="Guest List"
                                className={`p-2 rounded-md transition ${activeTab === "list" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
                            ><List size={18} /></button>
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
                        <button onClick={handleLogout} title="Lock Scanner"
                            className="p-2 rounded-lg bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        ><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative overflow-hidden">

                {/* ── Camera Tab ──────────────────────────────────────────── */}
                {activeTab === "camera" && (
                    <div className="flex-1 flex flex-col relative">
                        <div id="reader" className="w-full bg-black" style={{ minHeight: "65vh" }} />

                        {/* Live indicator + torch */}
                        {cameraLive && (
                            <div className="absolute top-3 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-400 text-xs font-bold tracking-widest">LIVE</span>
                                    {!isOnline && <span className="text-yellow-400 text-xs font-bold ml-1">· OFFLINE</span>}
                                </div>
                                <button onClick={toggleTorch} title="Toggle flashlight"
                                    className={`pointer-events-auto p-3 rounded-full transition ${torchEnabled ? "bg-yellow-400 text-black" : "bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"}`}
                                >
                                    <Zap size={20} fill={torchEnabled ? "currentColor" : "none"} />
                                </button>
                            </div>
                        )}

                        {/* Scan result overlay */}
                        {scanResult && (
                            <div
                                onClick={dismissScanResult}
                                className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer select-none ${
                                    scanResult.status === "success"
                                        ? scanResult.isOffline ? "bg-yellow-950/97" : "bg-green-950/97"
                                        : "bg-red-950/97"
                                }`}
                                style={{ zIndex: 20 }}
                            >
                                <div className="text-center px-8 max-w-xs">
                                    {scanResult.status === "success" ? (
                                        <CheckCircle2
                                            className={scanResult.isOffline ? "text-yellow-400 mx-auto mb-4" : "text-green-400 mx-auto mb-4"}
                                            size={88}
                                        />
                                    ) : (
                                        <XCircle className="text-red-400 mx-auto mb-4" size={88} />
                                    )}
                                    <h2 className={`text-5xl font-black mb-3 tracking-wide ${
                                        scanResult.status === "success"
                                            ? scanResult.isOffline ? "text-yellow-300" : "text-green-300"
                                            : "text-red-300"
                                    }`}>
                                        {scanResult.status === "success"
                                            ? (scanResult.isOffline ? "QUEUED" : "VALID")
                                            : "REJECTED"}
                                    </h2>
                                    {scanResult.guestName && (
                                        <p className="text-white text-2xl font-bold leading-tight mb-1">{scanResult.guestName}</p>
                                    )}
                                    {scanResult.ticketType && (
                                        <p className={`text-base font-semibold mb-3 ${scanResult.ticketType.toLowerCase().includes("vip") ? "text-orange-400" : "text-white/50"}`}>
                                            {scanResult.ticketType.toUpperCase()}
                                        </p>
                                    )}
                                    {scanResult.isOffline && (
                                        <p className="text-yellow-400/80 text-sm mb-2">Offline — will sync automatically when connected</p>
                                    )}
                                    {scanResult.status === "error" && (
                                        <p className="text-red-300/80 text-sm leading-snug">{scanResult.message}</p>
                                    )}
                                    <p className="text-white/25 text-xs mt-6">Tap anywhere to dismiss</p>
                                </div>
                            </div>
                        )}

                        {/* Initial state */}
                        {!cameraStarted && (
                            <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-5 px-8">
                                <div className="p-5 bg-orange-500/10 rounded-full text-orange-500">
                                    <ScanLine size={56} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-xl mb-2">Ready to Scan</h3>
                                    <p className="text-gray-400 text-sm">
                                        {tickets.length > 0
                                            ? `${tickets.length} tickets loaded${!isOnline ? " from cache" : ""}. Point camera at any QR code.`
                                            : "Point the camera at any ticket QR code."}
                                    </p>
                                    {!isOnline && tickets.length > 0 && (
                                        <p className="text-yellow-500 text-xs mt-2 flex items-center justify-center gap-1">
                                            <WifiOff size={11} /> Offline mode — scanning from local cache
                                        </p>
                                    )}
                                </div>
                                <button onClick={startCamera}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg text-lg transition">
                                    Start Camera
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── List Tab ─────────────────────────────────────────────── */}
                {activeTab === "list" && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        {/* Offline cache notice */}
                        {!isOnline && tickets.length > 0 && (
                            <div className="mb-3 flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-xl">
                                <WifiOff size={13} />
                                Offline — showing local cache. Admits will sync when connected.
                            </div>
                        )}

                        {/* Pending sync notice */}
                        {pendingSync > 0 && isOnline && (
                            <div className="mb-3 flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl">
                                <span>{pendingSync} offline admit{pendingSync !== 1 ? "s" : ""} pending sync</span>
                                <button onClick={flushQueue} className="underline text-blue-300">Sync now</button>
                            </div>
                        )}

                        {/* Search + VIP + refresh */}
                        <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                                <input type="text" placeholder="Search name or email…" value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <button onClick={() => setFilterVIP(!filterVIP)} title="VIP filter"
                                className={`px-3 flex items-center justify-center rounded-xl border text-sm font-bold transition ${filterVIP ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-900 border-gray-800 text-gray-400"}`}
                            ><Filter size={15} /></button>
                            <button onClick={handleManualRefresh} disabled={isRefreshing} title="Refresh"
                                className="px-3 flex items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition disabled:opacity-40"
                            ><RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} /></button>
                        </div>

                        {/* Type stat pills */}
                        {Object.keys(typeStats).length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                                {Object.entries(typeStats).map(([type, s]) => (
                                    <div key={type} className="shrink-0 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center min-w-[72px]">
                                        <p className={`text-xs font-bold uppercase tracking-wide ${type.toLowerCase().includes("vip") ? "text-orange-400" : "text-gray-400"}`}>{type}</p>
                                        <p className="text-white font-bold text-sm mt-0.5">{s.admitted}<span className="text-gray-600 font-normal">/{s.total}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ticket rows */}
                        <div className="space-y-2">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.id} className={`bg-gray-900 rounded-xl p-4 flex items-center justify-between border transition ${ticket.status === "used" ? "border-green-900/40" : "border-gray-800"}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ticket.status === "used" ? "bg-green-500/10 text-green-500" : "bg-gray-800 text-gray-400"}`}>
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-white font-medium text-sm line-clamp-1">{ticket.guestName || "Guest Entry"}</h4>
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                <span className={ticket.ticketType?.toLowerCase().includes("vip") ? "text-orange-400 font-semibold" : ""}>
                                                    {ticket.ticketType || "Standard"}
                                                </span>
                                                <span>·</span>
                                                <span className={ticket.status === "used" ? "text-green-500" : ticket.status === "valid" ? "text-blue-400" : "text-red-400"}>
                                                    {ticket.status.replace(/_/g, " ").toUpperCase()}
                                                </span>
                                                {ticket.offlineAdmitted && <span className="text-yellow-500">· unsynced</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {ticket.status === "valid" && (
                                        <button onClick={() => handleConfirmAdmit(ticket.id)}
                                            className={`ml-3 shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                                confirmAdmitId === ticket.id
                                                    ? "bg-orange-500 border-orange-400 text-white animate-pulse"
                                                    : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                                            }`}
                                        >{confirmAdmitId === ticket.id ? "Confirm?" : "Admit"}</button>
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

                {/* ── History Tab ──────────────────────────────────────────── */}
                {activeTab === "history" && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-bold text-sm">Session Scan Log</h2>
                            <span className="text-gray-500 text-xs">{scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""}</span>
                        </div>
                        {scanHistory.length === 0 ? (
                            <div className="text-center py-14 text-gray-500 text-sm">
                                <Clock size={36} className="mx-auto mb-3 opacity-20" />
                                No scans recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {scanHistory.map((entry) => (
                                    <div key={entry.id} className={`rounded-xl p-3 border flex items-center gap-3 ${
                                        entry.status === "success"
                                            ? entry.wasOffline ? "bg-yellow-500/5 border-yellow-900/40" : "bg-green-500/5 border-green-900/40"
                                            : "bg-red-500/5 border-red-900/40"
                                    }`}>
                                        {entry.status === "success"
                                            ? <CheckCircle2 size={20} className={entry.wasOffline ? "text-yellow-500 shrink-0" : "text-green-500 shrink-0"} />
                                            : <XCircle size={20} className="text-red-500 shrink-0" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium line-clamp-1">{entry.guestName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                <span className={entry.ticketType.toLowerCase().includes("vip") ? "text-orange-400" : ""}>{entry.ticketType}</span>
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
