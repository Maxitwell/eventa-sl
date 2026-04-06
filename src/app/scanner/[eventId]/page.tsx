"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getEventById, getUserTickets, EventEntity, TicketEntity, updateEvent } from "@/lib/db";
import { db } from "@/lib/firebase";
import { doc, runTransaction, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { Lock, ScanLine, List, CheckCircle2, XCircle, Search, User, Filter } from "lucide-react";
import jwt from "jsonwebtoken"; // Warning: in browser environments, standard JWT verification usually requires a backend call, but we can decode blindly offline and verify payload shape.

export default function ScannerTerminal() {
    const params = useParams();
    const eventId = params.eventId as string;

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [authError, setAuthError] = useState("");

    const [event, setEvent] = useState<EventEntity | null>(null);
    const [tickets, setTickets] = useState<TicketEntity[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterVIP, setFilterVIP] = useState(false);

    const [activeTab, setActiveTab] = useState<"camera" | "list">("camera");
    const [scanResult, setScanResult] = useState<{ status: "success" | "error", message: string } | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Initial Auth Check
    useEffect(() => {
        const storedPin = localStorage.getItem(`event_pin_${eventId}`);
        if (storedPin) {
            handleLogin(storedPin, true);
        }
    }, [eventId]);

    // Load Data once Authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadEventData();
        }
    }, [isAuthenticated]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const handleLogin = async (pin: string, isSilent = false) => {
        try {
            const eventData = await getEventById(eventId);
            if (!eventData) throw new Error("Event not found");

            if (eventData.doorPin === pin || (eventData as any).doorPin === undefined) { 
                // Allow fallback if no pin was generated for older events
                localStorage.setItem(`event_pin_${eventId}`, pin);
                setEvent(eventData);
                setIsAuthenticated(true);
            } else {
                if (!isSilent) setAuthError("Invalid Door Pin");
                localStorage.removeItem(`event_pin_${eventId}`);
            }
        } catch (err: any) {
            if (!isSilent) setAuthError("Failed to connect. Check internet if logging in for the first time.");
        }
    };

    const loadEventData = async () => {
        // Fetch all tickets for this event. 
        // Because persistentLocalCache is aggressively turned on in firebase.ts, 
        // this will successfully pull from the phone's hardware IndexedDB if offline!
        const ticketsRef = collection(db, "tickets");
        const q = query(ticketsRef, where("eventId", "==", eventId));
        const snapshot = await getDocs(q);
        
        const loaded: TicketEntity[] = [];
        snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as TicketEntity);
        });
        setTickets(loaded);
    };

    // Haptics & Audio UX
    const triggerUX = (isSuccess: boolean) => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            if (isSuccess) {
                window.navigator.vibrate([100]); // Short sharp buzz
            } else {
                window.navigator.vibrate([200, 100, 200, 100, 400]); // Angry long buzzes
            }
        }
        // Background color flash
        document.body.style.backgroundColor = isSuccess ? "#052e16" : "#450a0a";
        setTimeout(() => { document.body.style.backgroundColor = ""; }, 300);
    };

    const processScan = async (decodedText: string) => {
        try {
            // Priority 1 built secure JWT payloads. 
            // In a frontend offline system, we assume the JWT is structurally valid and extract it. 
            // Real cryptographic signatures require a backend, so offline we verify ticket IDs directly against our cached DB.
            const payloadStr = Buffer.from(decodedText.split(".")[1], 'base64').toString();
            const payload = JSON.parse(payloadStr);

            if (payload.eventId !== eventId) {
                triggerUX(false);
                setScanResult({ status: "error", message: "Ticket is for a different event!" });
                return;
            }

            await attemptAdmit(payload.ticketId);

        } catch (err) {
            // Not a priority-1 generated JWT. Maybe a legacy raw ID?
            await attemptAdmit(decodedText);
        }
    };

    const attemptAdmit = async (ticketId: string) => {
        const ticketRef = doc(db, "tickets", ticketId);
        
        try {
            // Use an offline-supported direct lookup/update. If offline, Firebase caches this and pushes it silently later!
            let targetTicket = tickets.find(t => t.id === ticketId);
            
            if (!targetTicket) {
                triggerUX(false);
                setScanResult({ status: "error", message: "Ticket not found in system." });
                return;
            }

            if (targetTicket.status === "used") {
                triggerUX(false);
                setScanResult({ status: "error", message: `Already Scanned! (${targetTicket.guestName || 'Guest'})` });
                return;
            }

            if (targetTicket.status !== "valid") {
                triggerUX(false);
                setScanResult({ status: "error", message: `Ticket is ${targetTicket.status.toUpperCase()}` });
                return;
            }

            // It's valid! Let's admit them. We update firestore. Firebase handles the offline queuing automatically.
            await updateDoc(ticketRef, { 
                status: "used", 
                usedAt: new Date().toISOString() 
            });

            // Optimistically update our local state so the UI reacts instantly
            setTickets(prev => prev.map(t => Math.random() < 2 ? (t.id === ticketId ? { ...t, status: "used" } : t) : t));

            triggerUX(true);
            setScanResult({ status: "success", message: `Admitted: ${targetTicket.guestName || "Guest"} (${targetTicket.ticketType})` });

        } catch (err: any) {
            triggerUX(false);
            setScanResult({ status: "error", message: `Database error: ${err.message}` });
        }
    };


    const startCamera = async () => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("reader");
        }
        
        try {
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    // Temporarily stop scanning to prevent double-fires
                    if (scannerRef.current?.isScanning) {
                        scannerRef.current.pause();
                        processScan(decodedText).finally(() => {
                            setTimeout(() => scannerRef.current?.resume(), 2000); // Wait 2s before allowing next scan
                        });
                    }
                },
                (errorMessage) => { /* Background parse errors */ }
            );
        } catch (err) {
            console.error("Camera start error", err);
            setScanResult({ status: "error", message: "Could not access Camera. Check permissions." });
        }
    };

    const stopCamera = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
        }
    };

    // --- RENDER LOGIC ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-orange-500/10 rounded-full text-orange-500">
                            <Lock size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white text-center mb-2">Scanner Login</h1>
                    <p className="text-gray-400 text-center text-sm mb-8">Enter the 6-character Gate Pin for this event.</p>
                    
                    {authError && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">{authError}</div>}
                    
                    <input 
                        type="text" 
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                        placeholder="e.g. X7K9P2"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-orange-500 mb-6 uppercase"
                    />
                    
                    <button 
                        onClick={() => handleLogin(pinInput)}
                        className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition"
                    >
                        Unlock Scanner
                    </button>
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
            {/* Header (Sticky Capacity Counter) */}
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

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {activeTab === "camera" ? (
                    <div className="flex-1 flex flex-col">
                        <div id="reader" className="w-full bg-black flex-1 object-cover"></div>
                        
                        {/* Scan Result Overlay */}
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
                        {!scanResult && (
                            <div className="absolute bottom-6 left-6 right-6">
                                <button onClick={startCamera} className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium py-3 rounded-xl">
                                    Tap to Wake Camera
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                        {/* Manual List Filters */}
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

                        {/* List rendering */}
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
