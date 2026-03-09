"use client";

import React from "react";
import Image from "next/image";
import { Download, Share2, MapPin, Calendar, Clock, Ticket as TicketIcon } from "lucide-react";
import { useToast } from "./ToastProvider";

import { TicketEntity } from "@/lib/db";

export function TicketCard({ ticket }: { ticket: TicketEntity }) {
    const { showToast } = useToast();
    const isValid = ticket.status === "valid";

    const handleShare = () => {
        showToast("Ticket link copied to clipboard via Web Share API", "info");
    };

    return (
        <div className={`relative bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 ${!isValid && "opacity-75 grayscale"}`}>

            {/* Top Section - Event Details */}
            <div className="p-6 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 flex justify-between items-start mb-4">
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${isValid ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-gray-700 text-gray-400"}`}>
                        {isValid ? "Valid Ticket" : "Used"}
                    </span>
                    <span className="text-gray-400 text-xs font-mono">{ticket.id}</span>
                </div>

                <h3 className="text-xl font-bold leading-tight mb-4 pr-4">{ticket.eventName}</h3>

                <div className="space-y-2 text-sm text-gray-300 font-medium">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-orange-400" /> {ticket.date}
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-orange-400" /> {ticket.time}
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-orange-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{ticket.location}</span>
                    </div>
                </div>
            </div>

            {/* Perforation Line */}
            <div className="relative h-6 bg-white overflow-hidden -my-3 z-20 flex justify-between items-center px-2">
                <div className="w-6 h-6 bg-gray-50 rounded-full shadow-inner -ml-5 border border-gray-200"></div>
                <div className="flex-1 w-full border-t-2 border-dashed border-gray-300 mx-2"></div>
                <div className="w-6 h-6 bg-gray-50 rounded-full shadow-inner -mr-5 border border-gray-200"></div>
            </div>

            {/* Bottom Section - QR & Actions */}
            <div className="p-6 pt-8 flex flex-col items-center bg-white relative z-10">
                <div className="w-full flex justify-between items-center mb-6">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Pass Type</p>
                        <p className="font-bold text-gray-900">{ticket.ticketType}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Admits</p>
                        <p className="font-bold text-gray-900">1 Person</p>
                    </div>
                </div>

                <div className="relative w-40 h-40 p-2 bg-white border-2 border-gray-100 rounded-xl mb-6 shadow-sm group">
                    <Image
                        src={ticket.qrCode}
                        alt="Ticket QR Code"
                        fill
                        className="object-contain p-2"
                    />
                    {!isValid && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
                            <span className="text-gray-900 font-black text-xl rotate-[-20deg] border-4 border-gray-900 px-4 py-1 uppercase tracking-widest">
                                Scanned
                            </span>
                        </div>
                    )}
                </div>

                <div className="w-full flex gap-3 mt-auto">
                    <button
                        disabled={!isValid}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download size={16} /> Save PDF
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={!isValid}
                        className="flex-1 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold border border-orange-100 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </div>
        </div>
    );
}
