"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/ToastProvider";
import { Heart, Search, Star, MapPin, Music, Briefcase, Zap } from "lucide-react";

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
    const [isHypeLoading, setIsHypeLoading] = useState(false);

    const handleHype = () => {
        setIsHypeLoading(true);
        setTimeout(() => {
            setIsHypeLoading(false);
            showToast("Hype generated! Check the modal.", "info");
            // In a real app, this would open the Hype Modal context
            window.dispatchEvent(
                new CustomEvent("open-hype-modal", { detail: { event } })
            );
        }, 1500);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isLoggedIn || !currentUser) {
            showToast("Log in to save events", "error");
            router.push("/login");
            return;
        }

        const newIsLiked = !isLiked;
        
        // Optimistically update UI globally via Context
        updateSavedEventsCache(event.id, newIsLiked);
        
        // Background DB sync
        try {
            await toggleSavedEvent(currentUser.id, event.id, newIsLiked);
        } catch (error) {
            // Revert cache on fail
            updateSavedEventsCache(event.id, isLiked);
            showToast("Failed to save event.", "error");
        }
    };

    const categoryColors: Record<string, string> = {
        "Music": "text-purple-600",
        "Technology": "text-orange-600",
        "Business": "text-blue-600",
        "Festival": "text-green-600",
        "Party": "text-pink-600",
        "Arts": "text-yellow-600",
        "Fashion": "text-rose-600",
        "Religious": "text-indigo-600"
    };

    const primaryCategory = event.categories?.[0] || "Event";

    const [month, day] = event.date.split(" ");
    const isPaid = event.price > 0;
    const isSoldOut = event.ticketsSold >= event.totalCapacity && event.totalCapacity > 0;

    return (
        <div
            onClick={() => router.push(`/events/${event.id}`)}
            className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full event-card cursor-pointer ${isSoldOut ? "opacity-90 hover:opacity-100" : ""
                }`}
            data-title={event.title}
            data-location={event.location}
        >
            <div
                className={`relative h-56 bg-gray-200 overflow-hidden ${isSoldOut
                    ? "grayscale group-hover:grayscale-0 transition-all duration-500"
                    : ""
                    }`}
            >
                <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-700"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Badges */}
                {isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <span className="text-white font-bold text-lg uppercase tracking-widest border-2 border-white px-6 py-2 backdrop-blur-sm">
                            Sold Out
                        </span>
                    </div>
                )}

                {event.featured && (
                    <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-green-600/30 flex items-center gap-1 z-10">
                        <Star size={10} /> Featured
                    </div>
                )}

                {event.sellingFast && (
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-orange-500/30 flex items-center gap-1 z-10">
                        <Zap size={10} /> Selling Fast
                    </div>
                )}

                {/* Date Box */}
                {!isSoldOut && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-gray-800 shadow-sm flex flex-col items-center z-10">
                        <span className="text-red-500 uppercase text-[10px]">{month}</span>
                        <span className="text-lg leading-none">{day}</span>
                    </div>
                )}

                {/* Like Button */}
                {!isSoldOut && (
                    <button
                        onClick={handleLike}
                        className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-sm transition-all duration-200 z-10 ${isLiked
                            ? "bg-white text-red-500 scale-90"
                            : "bg-black/20 text-white hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100"
                            }`}
                    >
                        <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                )}

                {/* AI Hype Button */}
                {!isSoldOut && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleHype(); }}
                        disabled={isHypeLoading}
                        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-purple-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-white hover:scale-105 transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 z-10 disabled:opacity-50"
                    >
                        {isHypeLoading ? (
                            <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce delay-200"></span>
                            </span>
                        ) : (
                            "✨ Hype this"
                        )}
                    </button>
                )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="mb-1">
                    <span
                        className={`${categoryColors[primaryCategory] || "text-gray-600"
                            } font-bold text-xs uppercase tracking-wide`}
                    >
                        {primaryCategory}
                    </span>
                </div>
                <h3
                    className={`text-xl font-bold text-gray-900 leading-tight mb-2 transition-colors ${!isSoldOut ? `group-hover:${categoryColors[primaryCategory] || "text-orange-500"}` : ""
                        }`}
                >
                    {event.title}
                </h3>
                <p className="text-gray-500 text-sm mb-2 flex items-center">
                    <MapPin size={14} className="mr-2 text-gray-400 shrink-0" />
                    {event.location}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    {!isSoldOut ? (
                        <>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400">
                                    {isPaid ? "Starting from" : "Entry"}
                                </span>
                                <span className="text-lg font-bold text-gray-900">
                                    {isPaid
                                        ? `${event.currency || 'NLe'} ${event.price.toLocaleString()}`
                                        : "Free"}
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickTickets) onClickTickets(e);
                                }}
                                className={`text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all transform active:scale-95 ${primaryCategory === "Technology"
                                    ? "bg-gray-900 hover:bg-gray-800"
                                    : primaryCategory === "Fundraiser"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : primaryCategory === "Music"
                                            ? "bg-purple-600 hover:bg-purple-700"
                                            : "bg-orange-500 hover:bg-orange-600"
                                    }`}
                            >
                                Get Tickets
                            </button>
                        </>
                    ) : (
                        <div className="w-full">
                            <button
                                onClick={(e) => { e.stopPropagation(); if (onClickWaitlist) onClickWaitlist(e); }}
                                className="w-full border-2 border-gray-200 text-gray-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 group-hover:text-gray-900"
                            >
                                Join Waitlist
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
