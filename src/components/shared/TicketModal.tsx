"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { useCart } from "@/store/CartContext";
import { useToast } from "./ToastProvider";
import { Minus, Plus, ShoppingCart, ArrowRight, ArrowLeft } from "lucide-react";
import { EventEntity } from "@/lib/db";

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: EventEntity | null;
    onProceedToCheckout: () => void;
}

export function TicketModal({ isOpen, onClose, event, onProceedToCheckout }: TicketModalProps) {
    const { addItem, updateQuantity, items, totalItems, totalPrice } = useCart();

    if (!event) return null;

    const basePrice = event.price || 0;

    const handleUpdate = (ticketName: string, price: number, delta: number) => {
        const existingItem = items.find(i => i.id === `${event.id}-${ticketName}`);
        if (existingItem) {
            updateQuantity(existingItem.id, delta);
        } else if (delta > 0) {
            addItem({
                id: `${event.id}-${ticketName}`,
                eventId: event.id,
                eventName: event.title,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location,
                ticketName,
                price,
                quantity: 1
            });
        }
    };

    const getQuantity = (ticketName: string) => {
        return items.find(i => i.id === `${event.id}-${ticketName}`)?.quantity || 0;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={event.title}
            maxWidth="2xl"
            footer={
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Total ({totalItems} tickets)</span>
                        <span className="text-2xl font-extrabold text-gray-900">
                            NLe {totalPrice.toLocaleString()}
                        </span>
                    </div>
                    <button
                        onClick={onProceedToCheckout}
                        disabled={totalItems === 0}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        Go to Checkout <ArrowRight size={18} />
                    </button>
                </div>
            }
        >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-orange-50 p-3 rounded-lg border border-orange-100">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                {event.date} • {event.location}
            </div>

            <div className="space-y-4">
                {event.tickets && event.tickets.length > 0 ? (
                    event.tickets.map((ticket) => {
                        const price = ticket.price !== undefined ? ticket.price : basePrice;
                        const qty = getQuantity(ticket.name);

                        return (
                            <div
                                key={ticket.name}
                                className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white hover:border-orange-200 hover:shadow-sm transition-all"
                            >
                                <div>
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                        {ticket.name}
                                        {ticket.isPrivate && (
                                            <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
                                                Invite Only
                                            </span>
                                        )}
                                    </h4>
                                    {ticket.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">{ticket.description}</p>
                                    )}
                                    <p className="text-sm font-bold text-orange-600 mt-1">
                                        {price === 0 ? "Free" : `NLe ${price.toLocaleString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleUpdate(ticket.name, price, -1)}
                                        disabled={qty === 0}
                                        className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors border border-transparent"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="font-bold w-6 text-center text-gray-900">{qty}</span>
                                    <button
                                        onClick={() => handleUpdate(ticket.name, price, 1)}
                                        // Optional: Check against ticket.quantity available
                                        className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center transition-colors border border-transparent"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Fallback if no specific tickets are defined, but event has a price (MVP fallback)
                    <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white hover:border-orange-200 hover:shadow-sm transition-all">
                        <div>
                            <h4 className="font-bold text-gray-900">General Admission</h4>
                            <p className="text-sm font-bold text-orange-600 mt-1">
                                {basePrice === 0 ? "Free" : `NLe ${basePrice.toLocaleString()}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleUpdate("General Admission", basePrice, -1)}
                                disabled={getQuantity("General Admission") === 0}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors border border-transparent"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="font-bold w-6 text-center text-gray-900">{getQuantity("General Admission")}</span>
                            <button
                                onClick={() => handleUpdate("General Admission", basePrice, 1)}
                                className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center transition-colors border border-transparent"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
