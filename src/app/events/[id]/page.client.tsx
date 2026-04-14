"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/shared/ToastProvider";
import { useModals } from "@/components/shared/ModalProvider";
import { getEventById, EventEntity } from "@/lib/db";
import { Calendar, Clock, MapPin, Tag, Briefcase, Map, Users, Ticket, Phone, Mail, MessageCircle, Instagram, Twitter, Globe, Facebook, ArrowLeft, Loader2, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { openTicketModal } = useModals();

    const [event, setEvent] = useState<EventEntity | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!params.id) return;
            try {
                const fetchedEvent = await getEventById(params.id as string);
                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                } else {
                    showToast("Event not found.", "error");
                    router.push("/");
                }
            } catch (error) {
                console.error("Failed to fetch event", error);
                showToast("Failed to fetch event details.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [params.id, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20 animate-pulse">
                {/* Hero Skeleton */}
                <div className="w-full relative h-[300px] sm:h-[400px] md:h-[500px] bg-gray-200" />

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Main Content Area Skeleton */}
                    <div className="flex-1 space-y-10">
                        {/* Box Skeletons */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 h-48 bg-gray-200 border border-gray-100" />
                        <div className="bg-white rounded-3xl p-6 sm:p-8 h-64 bg-gray-200 border border-gray-100" />
                    </div>

                    {/* Sidebar Skeleton */}
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="bg-white rounded-3xl p-6 h-[250px] bg-gray-200 shadow-xl shadow-gray-100 sticky top-24 border border-gray-100" />
                    </div>
                </div>
            </div>
        );
    }

    if (!event) {
        return null; // Will redirect in useEffect
    }

    const primaryCategory = event.categories?.[0] || "Event";
    const isSoldOut = event.ticketsSold >= event.totalCapacity && event.totalCapacity > 0;
    const isFree = event.price === 0;

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: event.title,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast("Link copied to clipboard!", "success");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Nav Header (Minimal) */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-bold text-gray-700"
                >
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Hero Image */}
            <div className="w-full relative h-[300px] sm:h-[400px] md:h-[500px] bg-gray-900 overflow-hidden">
                <Image
                    src={event.image || "/placeholder.jpg"}
                    alt={event.title}
                    fill
                    className={`object-cover ${isSoldOut ? "grayscale" : ""}`}
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent flex items-end">
                    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
                        <div className="flex gap-2 mb-3">
                            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {primaryCategory}
                            </span>
                            {event.featured && (
                                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-green-600/30 flex items-center gap-1">
                                    <Star size={10} /> Featured
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
                            {event.title}
                        </h1>
                        <p className="text-gray-300 font-medium flex items-center gap-2">
                            By <span className="text-white font-bold">{event.organizerName || "Eventa Organizer"}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Main Content Area */}
                <div className="flex-1 space-y-10">

                    {/* Date and Location Card */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-4">When & Where</h2>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{event.date}</h3>
                                {event.endDate && event.endDate !== event.date && (
                                    <p className="text-gray-500">to {event.endDate}</p>
                                )}
                                <div className="flex items-center gap-1 text-gray-600 mt-1 font-medium">
                                    <Clock size={16} />
                                    <span>{event.time}</span>
                                    {event.endTime && <span> - {event.endTime}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Location</h3>
                                <p className="text-gray-600 mt-1 font-medium">{event.location}</p>
                                {event.googleMapLink && (
                                    <a href={event.googleMapLink} target="_blank" rel="noopener noreferrer" className="text-orange-600 text-sm font-bold mt-2 flex items-center gap-1 hover:underline">
                                        <Map size={14} /> View on Google Maps
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">About this Event</h2>
                        <div className="prose prose-orange max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {event.description || "No description provided."}
                        </div>
                    </div>

                    {/* Talent Lineup */}
                    {event.talents && event.talents.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <Users size={20} className="text-orange-500" /> Talent & Lineup
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {event.talents.map((talent, idx) => (
                                    <div key={idx} className="flex flex-col p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="font-bold text-gray-900 text-lg">{talent.name}</span>
                                        <span className="text-orange-600 text-sm font-medium">{talent.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contact & Socials */}
                    {event.contactSocials && Object.values(event.contactSocials).some(val => val) && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <MessageCircle size={20} className="text-orange-500" /> Connect with Organizer
                            </h2>
                            <div className="flex flex-wrap gap-4">
                                {event.contactSocials.email && (
                                    <a href={`mailto:${event.contactSocials.email}`} className="flex items-center gap-2 text-gray-600 hover:text-orange-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Mail size={16} /> Email
                                    </a>
                                )}
                                {event.contactSocials.phone && (
                                    <a href={`tel:${event.contactSocials.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-orange-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Phone size={16} /> Call
                                    </a>
                                )}
                                {event.contactSocials.whatsapp && (
                                    <a href={`https://wa.me/${event.contactSocials.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-green-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <img src="/whatsapp-logo.svg" alt="WhatsApp" className="w-4 h-4 object-contain" /> WhatsApp
                                    </a>
                                )}
                                {event.contactSocials.instagram && (
                                    <a href={event.contactSocials.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-pink-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Instagram size={16} /> Instagram
                                    </a>
                                )}
                                {event.contactSocials.facebook && (
                                    <a href={event.contactSocials.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Facebook size={16} /> Facebook
                                    </a>
                                )}
                                {event.contactSocials.twitter && (
                                    <a href={event.contactSocials.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-sky-500 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Twitter size={16} /> X (Twitter)
                                    </a>
                                )}
                                {event.contactSocials.website && (
                                    <a href={event.contactSocials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-orange-600 bg-gray-50 px-4 py-2 rounded-full font-medium transition-colors border border-gray-100">
                                        <Globe size={16} /> Website
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Widget */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-100 sticky top-24 border border-gray-100 space-y-6">
                        <div className="text-center">
                            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider block mb-1">
                                {isFree ? "General Admission" : "Starting from"}
                            </span>
                            <span className="text-4xl font-extrabold text-gray-900">
                                {isFree ? "Free" : `${event.currency || 'SLe'} ${event.price.toLocaleString()}`}
                            </span>
                        </div>

                        {!isSoldOut ? (
                            <Button
                                className="w-full py-4 text-lg"
                                size="lg"
                                onClick={() => openTicketModal(event)}
                            >
                                <Ticket size={20} className="mr-2" />
                                Get Tickets
                            </Button>
                        ) : (
                            <Button className="w-full py-4 text-lg" size="lg" variant="outline" disabled>
                                Sold Out
                            </Button>
                        )}

                        <div className="text-center">
                            <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-4">
                                100% secure checkout
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
