"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { useCart } from "@/store/CartContext";
import { useToast } from "./ToastProvider";
import { useAuth } from "@/store/AuthContext";
import { createTicket } from "@/lib/db";
import { CreditCard, Smartphone, Building2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
}

export function CheckoutModal({ isOpen, onClose, onBack }: CheckoutModalProps) {
    const { items, totalPrice, clearCart } = useCart();
    const { currentUser, isLoggedIn } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [method, setMethod] = useState<"card" | "ussd" | "transfer">("card");
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Guest info state
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestSurname, setGuestSurname] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestConfirmEmail, setGuestConfirmEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");

    const handlePayment = async () => {
        if (!isLoggedIn) {
            if (!guestFirstName.trim() || !guestSurname.trim() || !guestEmail.trim() || !guestConfirmEmail.trim() || !guestPhone.trim()) {
                showToast("Please fill in all contact details to receive your tickets.", "error");
                return;
            }
            if (guestEmail.trim().toLowerCase() !== guestConfirmEmail.trim().toLowerCase()) {
                showToast("Email addresses do not match.", "error");
                return;
            }
        }

        setIsProcessing(true);

        try {
            const ticketPromises = [];

            for (const item of items) {
                // For each quantity, create a distinct ticket
                for (let i = 0; i < item.quantity; i++) {
                    const ticketData = {
                        eventId: item.eventId || "unknown-event",
                        userId: currentUser?.id || `guest_${guestEmail}`,
                        eventName: item.eventName,
                        ticketType: item.ticketName,
                        date: item.eventDate || "TBD",
                        time: item.eventTime || "TBD",
                        location: item.eventLocation || "TBD",
                        purchaseDate: new Date().toISOString(),
                        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        status: "valid" as const,
                        pricePaid: item.price,
                        ...(!isLoggedIn && {
                            guestName: `${guestFirstName.trim()} ${guestSurname.trim()}`,
                            guestEmail: guestEmail.trim().toLowerCase(),
                            guestPhone: guestPhone.trim()
                        })
                    };
                    ticketPromises.push(createTicket(ticketData));
                }
            }

            await Promise.all(ticketPromises);

            clearCart();
            onClose();
            
            if (!isLoggedIn && guestEmail) {
                const fullName = `${guestFirstName.trim()} ${guestSurname.trim()}`;
                router.push(`/purchase-success?guestEmail=${encodeURIComponent(guestEmail.trim().toLowerCase())}&guestName=${encodeURIComponent(fullName)}`);
            } else {
                router.push("/purchase-success");
            }
            showToast("Payment successful! Tickets generated.", "success");
        } catch (error) {
            console.error("Payment error:", error);
            showToast("Something went wrong processing your order.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Checkout"
            maxWidth="md"
        >
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Order Summary</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-800">
                        {items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span>
                                    <span className="font-bold">{item.quantity}x</span> {item.ticketName}
                                </span>
                                <span>NLe {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold text-gray-900 text-lg">
                        <span>Total</span>
                        <span>NLe {totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                {!isLoggedIn && (
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-3">
                            Guest Contact Info <span className="text-gray-500 font-normal text-xs">(to receive your ticket)</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <Input 
                                placeholder="First Name" 
                                value={guestFirstName} 
                                onChange={(e) => setGuestFirstName(e.target.value)} 
                            />
                            <Input 
                                placeholder="Surname" 
                                value={guestSurname} 
                                onChange={(e) => setGuestSurname(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-3">
                            <Input 
                                placeholder="Email Address" 
                                type="email" 
                                value={guestEmail} 
                                onChange={(e) => setGuestEmail(e.target.value)} 
                            />
                            <Input 
                                placeholder="Confirm Email Address" 
                                type="email" 
                                value={guestConfirmEmail} 
                                onChange={(e) => setGuestConfirmEmail(e.target.value)} 
                            />
                            <Input 
                                placeholder="Phone Number" 
                                type="tel" 
                                value={guestPhone} 
                                onChange={(e) => setGuestPhone(e.target.value)} 
                            />
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-3 text-center">
                        Select Payment Method
                    </h4>
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMethod("card")}
                            className={`flex-1 py-3 px-3 rounded-lg border-2 text-xs flex flex-col items-center gap-1 font-bold transition-all ${method === "card"
                                ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                }`}
                        >
                            <CreditCard size={18} /> Card
                        </button>
                        <button
                            onClick={() => setMethod("ussd")}
                            className={`flex-1 py-3 px-3 rounded-lg border-2 text-xs flex flex-col items-center gap-1 font-bold transition-all ${method === "ussd"
                                ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                }`}
                        >
                            <Smartphone size={18} /> Mobile Money
                        </button>
                        <button
                            onClick={() => setMethod("transfer")}
                            className={`flex-1 py-3 px-3 rounded-lg border-2 text-xs flex flex-col items-center gap-1 font-bold transition-all ${method === "transfer"
                                ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                }`}
                        >
                            <Building2 size={18} /> Transfer
                        </button>
                    </div>

                    <div className="min-h-[140px]">
                        {method === "card" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <Input placeholder="Card Number (0000 0000 0000 0000)" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input placeholder="MM/YY" />
                                    <Input placeholder="CVV" type="password" />
                                </div>
                            </div>
                        )}

                        {method === "ussd" && (
                            <div className="space-y-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100 animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-xs text-gray-600 text-center mb-2">
                                    Enter your Orange/Africell Money number to receive a prompt.
                                </p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">+232</span>
                                    <Input placeholder="77 000 000" className="pl-12" type="tel" />
                                </div>
                            </div>
                        )}

                        {method === "transfer" && (
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2 text-center">
                                <p className="text-xs text-blue-800 font-bold mb-1 uppercase tracking-wider">
                                    Ecobank Sierra Leone
                                </p>
                                <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider my-2">
                                    0022 1033 4455 66
                                </p>
                                <p className="text-xs text-gray-600 font-medium">
                                    Account Name: Eventa SL Ltd
                                </p>
                                <div className="mt-4 pt-4 border-t border-blue-200/50 flex items-start gap-2 text-[10px] text-gray-500 text-left">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                                    <p>Your ticket will be issued automatically once our system confirms the exact transfer amount.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={onBack} className="w-1/3">
                        Back
                    </Button>
                    <Button
                        onClick={handlePayment}
                        isLoading={isProcessing}
                        disabled={totalPrice === 0}
                        className="w-2/3"
                    >
                        Pay NLe {totalPrice.toLocaleString()}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
