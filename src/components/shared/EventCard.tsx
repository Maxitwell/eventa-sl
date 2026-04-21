"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/ToastProvider";
import { Heart, MapPin, ArrowRight } from "lucide-react";
import { EventEntity, toggleSavedEvent } from "@/lib/db";
import { useAuth } from "@/store/AuthContext";

interface EventCardProps {
    event: EventEntity;
    onClickTickets?: (e: React.MouseEvent) => void;
    onClickWaitlist?: (e: React.MouseEvent) => void;
}

export function EventCard({ event, onClickTickets, onClickWaitlist }: EventCardProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { isLoggedIn, currentUser, updateSavedEventsCache } = useAuth();
    const isLiked = currentUser?.savedEvents?.includes(event.id) || false;

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isLoggedIn || !currentUser) {
            showToast("Log in to save events", "error");
            router.push("/login");
            return;
        }
        const newIsLiked = !isLiked;
        updateSavedEventsCache(event.id, newIsLiked);
        try {
            await toggleSavedEvent(currentUser.id, event.id, newIsLiked);
        } catch {
            updateSavedEventsCache(event.id, isLiked);
            showToast("Failed to save event.", "error");
        }
    };

    const primaryCategory = event.categories?.[0] || "Event";
    const isSoldOut = event.ticketsSold >= event.totalCapacity && event.totalCapacity > 0;
    const isFree = event.price === 0;

    // Parse date for badge
    const parts = event.date?.split(" ") || [];
    const month = parts[0] || "";
    const dayNum = parts[1] || "";
    const currentYear = new Date().getFullYear();
    const dateObj = month && dayNum ? new Date(`${month} ${dayNum} ${currentYear}`) : null;
    const dayOfWeek = dateObj && !isNaN(dateObj.getTime())
        ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dateObj.getDay()]
        : "";

    return (
        <div
            onClick={() => router.push(`/events/${event.id}`)}
            className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-gray-100 overflow-hidden group cursor-pointer flex flex-col ${isSoldOut ? "opacity-90 hover:opacity-100" : ""}`}
        >
            {/* ── Image ── */}
            <div className={`relative h-52 bg-gray-200 overflow-hidden ${isSoldOut ? "grayscale group-hover:grayscale-0 transition-all duration-500" : ""}`}>
                <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-700"
                    sizes="(max-width: 640px) 100vw, 50vw"
                />

                {/* Sold-out overlay */}
                {isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <span className="text-white font-bold text-lg uppercase tracking-widest border-2 border-white px-6 py-2">
                            Sold Out
                        </span>
                    </div>
                )}

                {/* Date badge — top left */}
                {dayNum && !isSoldOut && (
                    <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white flex flex-col items-center justify-center w-12 h-[3.25rem] rounded-xl shadow-lg">
                        <span className="text-[9px] font-black uppercase leading-none opacity-90">{dayOfWeek}</span>
                        <span className="text-xl font-black leading-none">{dayNum}</span>
                        <span className="text-[9px] font-bold uppercase leading-none opacity-90">{month.toUpperCase()}</span>
                    </div>
                )}

                {/* Status badge — top right */}
                {!isSoldOut && (
                    <div className="absolute top-3 right-3 z-10">
                        {isFree ? (
                            <span className="bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                Free
                            </span>
                        ) : event.sellingFast ? (
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                Selling Fast
                            </span>
                        ) : event.featured ? (
                            <span className="bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                Featured
                            </span>
                        ) : null}
                    </div>
                )}

                {/* Like button */}
                {!isSoldOut && (
                    <button
                        onClick={handleLike}
                        className={`absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${isLiked
                            ? "bg-white text-red-500"
                            : "bg-black/20 text-white hover:bg-white hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                            }`}
                    >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                )}
            </div>

            {/* ── Card body ── */}
            <div className="p-5 flex flex-col flex-grow">
                <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    {event.categories?.join(" · ") || primaryCategory}
                </span>
                <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 group-hover:text-orange-500 transition-colors line-clamp-2">
                    {event.title}
                </h3>
                <p className="text-gray-400 text-xs flex items-center gap-1 mb-auto">
                    <MapPin size={11} className="shrink-0" />
                    <span>{event.location}</span>
                    {event.time && <span className="text-gray-300">· {event.time}</span>}
                </p>

                {/* Footer */}
                <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-50">
                    {!isSoldOut ? (
                        <>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Entry</p>
                                <p className="text-base font-bold text-gray-900">
                                    {isFree ? "Free" : `NLe ${event.price.toLocaleString()}`}
                                </p>
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); if (onClickTickets) onClickTickets(e); }}
                                className="flex items-center gap-1 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-500 active:bg-orange-600 transition active:scale-95"
                            >
                                {isFree ? "Reserve" : "Get tickets"} <ArrowRight size={13} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={e => { e.stopPropagation(); if (onClickWaitlist) onClickWaitlist(e); }}
                            className="w-full border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition"
                        >
                            Join Waitlist
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
