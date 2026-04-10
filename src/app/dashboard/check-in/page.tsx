"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScanLine, Search, CheckCircle2, XCircle, Ticket, ArrowLeft, Loader2 } from "lucide-react";
import { getTicketById, validateTicket, TicketEntity, EventEntity } from "@/lib/db";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CheckInPage() {
    const { isLoggedIn, currentUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [ticketIdInput, setTicketIdInput] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const [scannedTicket, setScannedTicket] = useState<TicketEntity | null>(null);
    const [ticketEvent, setTicketEvent] = useState<EventEntity | null>(null);
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

    // Protect route
    useEffect(() => {
        if (!isLoggedIn && typeof window !== "undefined") {
            router.push("/login?redirect=/dashboard/check-in");
        }
    }, [isLoggedIn, router]);

    if (!isLoggedIn || !currentUser) {
        return null;
    }

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!ticketIdInput.trim()) {
            showToast("Please enter a Ticket ID", "error");
            return;
        }

        setIsSearching(true);
        setScanResult(null);
        setTicketEvent(null);

        try {
            // Check if input is a full URL from QR code (e.g. https://eventa.sl/t/12345)
            let parsedId = ticketIdInput.trim();
            if (parsedId.includes("/")) {
                const parts = parsedId.split("/");
                parsedId = parts[parts.length - 1];
            }

            const ticket = await getTicketById(parsedId);

            if (ticket) {
                setScannedTicket(ticket);
                // Fetch event details to ensure this organizer owns it
                const eventDoc = await getDoc(doc(db, "events", ticket.eventId));
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data() as EventEntity;
                    setTicketEvent(eventData);

                    if (eventData.organizerId !== currentUser.id) {
                        setScanResult({
                            success: false,
                            message: "Unauthorized: You are not the organizer for this event."
                        });
                    }
                }
            } else {
                setScannedTicket(null);
                setScanResult({
                    success: false,
                    message: "Ticket not found in database."
                });
            }
        } catch (error) {
            console.error(error);
            showToast("Error searching for ticket.", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const handleCheckIn = async () => {
        if (!scannedTicket || !scannedTicket.id) return;

        setIsValidating(true);
        setScanResult(null);

        try {
            const result = await validateTicket(scannedTicket.id, currentUser.id);
            setScanResult({
                success: result.success,
                message: result.message
            });

            if (result.success && result.ticket) {
                setScannedTicket(result.ticket);
                showToast("Ticket successfully checked in!", "success");
            } else {
                showToast(result.message, "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to validate ticket connecting to server.", "error");
        } finally {
            setIsValidating(false);
        }
    };

    const handleReset = () => {
        setTicketIdInput("");
        setScannedTicket(null);
        setTicketEvent(null);
        setScanResult(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 mb-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mx-auto mb-4">
                            <ScanLine size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Door Check-In</h1>
                        <p className="text-gray-500 mt-2">
                            Enter the Ticket ID or scan the QR code to validate attendee entry.
                        </p>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter Ticket ID (e.g. TKT-12345)"
                                value={ticketIdInput}
                                onChange={(e: any) => setTicketIdInput(e.target.value)}
                                className="w-full text-lg py-4"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            isLoading={isSearching}
                            className="px-8 whitespace-nowrap"
                        >
                            <Search size={20} className="mr-2" /> Lookup
                        </Button>
                    </form>

                    {/* Scan Results */}
                    {scanResult && !scannedTicket && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                            <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Invalid Ticket</h3>
                            <p className="text-red-600 font-medium">{scanResult.message}</p>
                            <Button variant="outline" onClick={handleReset} className="mt-6">Scan Another</Button>
                        </div>
                    )}

                    {scannedTicket && ticketEvent && (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Result Banner */}
                            <div className={`p-4 flex items-center justify-center gap-2 text-white font-bold tracking-widest uppercase text-sm ${scannedTicket.status === "valid" ? "bg-blue-500" :
                                    scannedTicket.status === "used" ? "bg-green-500" : "bg-red-500"
                                }`}>
                                {scannedTicket.status === "valid" && "Ready to Check In"}
                                {scannedTicket.status === "used" && <><CheckCircle2 size={18} /> Ticket Already Used</>}
                                {scannedTicket.status !== "valid" && scannedTicket.status !== "used" && "Invalid Status"}
                            </div>

                            {/* Ticket Details */}
                            <div className="p-6 bg-white space-y-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Event</p>
                                    <h3 className="text-xl font-bold text-gray-900">{scannedTicket.eventName}</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Type / Tier</p>
                                        <p className="font-bold text-gray-900">{scannedTicket.ticketType}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Price Paid</p>
                                        <p className="font-bold text-gray-900">Le {scannedTicket.pricePaid?.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-gray-600 bg-orange-50/50 p-3 rounded-xl">
                                    <Ticket size={18} className="text-orange-500" />
                                    <span className="font-mono">{scannedTicket.id}</span>
                                </div>

                                {scanResult && !scanResult.success && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                                        <XCircle size={20} className="shrink-0 mt-0.5" />
                                        <p className="text-sm font-bold">{scanResult.message}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                        className="flex-1"
                                    >
                                        Cancel Scan
                                    </Button>

                                    {scannedTicket.status === "valid" && ticketEvent.organizerId === currentUser.id && (
                                        <Button
                                            onClick={handleCheckIn}
                                            isLoading={isValidating}
                                            className="flex-1 shadow-lg shadow-orange-500/30"
                                        >
                                            <CheckCircle2 size={18} className="mr-2" /> Admit Attendee
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center text-sm text-gray-400">
                    <p>Tip: You can use a standard barcode/QR scanner plugged via USB. Position cursor in the input field above and scan.</p>
                </div>
            </div>
        </div>
    );
}
