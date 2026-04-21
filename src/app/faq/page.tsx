"use client";

import { useState } from "react";
import Link from "next/link";

// ── Bubble sub-components ────────────────────────────────────────

function QBubble({ num, text }: { num: string; text: string }) {
    return (
        <div className="flex items-start">
            <div className="bg-orange-500 text-white rounded-2xl rounded-bl-sm px-5 py-3.5 max-w-[88%] shadow-lg shadow-orange-500/20">
                <span className="inline-flex items-center justify-center bg-white/20 text-white text-xs font-black px-2.5 py-0.5 rounded-md mr-2.5 align-middle">
                    {num}
                </span>
                <span className="font-semibold text-base sm:text-lg align-middle leading-snug">{text}</span>
            </div>
        </div>
    );
}

function ABubble({ lead, children }: { lead?: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-end">
            <div className="bg-white rounded-2xl rounded-br-sm px-5 py-4 max-w-[88%] shadow-sm border border-gray-100">
                {lead && (
                    <p className="font-bold text-gray-900 text-base sm:text-lg mb-1">{lead}</p>
                )}
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{children}</p>
            </div>
        </div>
    );
}

function FaqPair({
    num, q, lead, answer,
}: {
    num: string; q: string; lead?: string; answer: React.ReactNode;
}) {
    return (
        <div className="space-y-3">
            <QBubble num={num} text={q} />
            <ABubble lead={lead}>{answer}</ABubble>
        </div>
    );
}

// ── Highlighted text helper ──────────────────────────────────────

function B({ children }: { children: React.ReactNode }) {
    return <strong className="text-orange-500 font-bold">{children}</strong>;
}

// ── FAQ sections ─────────────────────────────────────────────────

function AttendeesFaqs() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <FaqPair num="Q1" q="What is Eventa?"
                answer={<>Eventa is Sierra Leone's home for events — <B>concerts, beach parties, comedy nights, tech meetups</B>. Discover them, book them, get in. All in one place.</>}
            />
            <FaqPair num="Q2" q="How do I get my ticket?"
                answer={<>Your QR ticket is sent to your <B>email and WhatsApp</B> the moment you pay. No app needed — just show it at the door to be scanned in.</>}
            />
            <FaqPair num="Q3" q="Can I pay with mobile money?" lead="Yes."
                answer={<>Eventa accepts <B>Orange Money</B> and <B>Afrimoney</B>. Pick what works for you at checkout.</>}
            />
            <FaqPair num="Q4" q="Do I need an account to buy a ticket?" lead="No."
                answer={<>Guest checkout is built in. Just enter your <B>name and email</B> and pay. Your ticket is tied to your email address.</>}
            />
            <FaqPair num="Q5" q="How are tickets scanned at the door?"
                answer={<>Door staff use the Eventa scanner on any phone — <B>even offline</B>. Every QR is verified and logged. No double entries, no fakes.</>}
            />
            <FaqPair num="Q6" q="What if my event is cancelled?" lead="You get a full refund."
                answer={<>Money returns to your Orange Money, Afrimoney, or card within <B>5–7 working days</B>. Our policy covers cancellations and major changes.</>}
            />
            <FaqPair num="Q7" q="Can I transfer my ticket to someone else?"
                answer={<>Tickets are <B>non-transferable</B> by default. If you need help, contact the event organiser directly through the event page.</>}
            />
            <FaqPair num="Q8" q="Where do I find my tickets after purchase?"
                answer={<>Check your <B>email inbox</B> for the QR code. If you have an account, your tickets also live in the <B>My Tickets</B> section of the site.</>}
            />
        </div>
    );
}

function OrganisersFaqs() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <FaqPair num="Q1" q="How do I list my event?"
                answer={<>Sign up as an organiser at <B>eventa.africa</B>, create your event, set ticket types, and publish. We handle <B>payments, QR delivery, and door scanning</B>.</>}
            />
            <FaqPair num="Q2" q="What does Eventa cost organisers?" lead="Free events are free."
                answer={<>For paid events, Eventa charges an <B>8% platform fee</B> on revenue. No setup costs. No monthly subscription. No surprises.</>}
            />
            <FaqPair num="Q3" q="Can I see who's coming to my event?"
                answer={<>Yes. Your organiser dashboard shows <B>live ticket sales, attendee names, and real-time door scans</B>. Export the full guest list anytime.</>}
            />
            <FaqPair num="Q4" q="How quickly do organisers get paid?"
                answer={<>Payouts hit your <B>Orange Money, Afrimoney, or bank account</B> within 24–48 hours after the event ends. No long waits, no chasing.</>}
            />
            <FaqPair num="Q5" q="Can I create different ticket tiers?"
                answer={<>Yes. Create <B>Early Bird, VIP, Regular</B>, or any custom tier — each with its own price, quantity cap, and description.</>}
            />
            <FaqPair num="Q6" q="Can I run a free RSVP event?" lead="Absolutely."
                answer={<>Set ticket price to <B>NLe 0</B> and Eventa becomes your free RSVP platform — with QR check-in and live attendance tracking included at no cost.</>}
            />
            <FaqPair num="Q7" q="What happens if I cancel my event?"
                answer={<>Cancel through your dashboard. Eventa automatically <B>notifies all ticket holders</B> and processes full refunds to their original payment method.</>}
            />
            <FaqPair num="Q8" q="Can door staff scan without internet?" lead="Yes."
                answer={<>The Eventa scanner works <B>fully offline</B>. Scans sync automatically once internet is restored — no missed entries, no errors at the door.</>}
            />
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────

export default function FaqPage() {
    const [tab, setTab] = useState<"attendees" | "organisers">("attendees");

    return (
        <>
            {/* ── Hero ── */}
            <div className="bg-white border-b border-gray-100 py-16 md:py-20 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-50 rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-50 rounded-full pointer-events-none" />

                {/* Decorative glass ticket SVG */}
                <svg className="absolute right-8 top-8 opacity-30 hidden lg:block pointer-events-none" width="260" height="160" viewBox="0 0 260 160">
                    <defs>
                        <linearGradient id="faqGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>
                    <path d="M 0 0 L 240 0 Q 250 0 250 10 L 250 60 A 18 18 0 0 0 250 96 L 250 150 Q 250 160 240 160 L 0 160 Q -10 160 -10 150 L -10 96 A 18 18 0 0 0 -10 60 L -10 10 Q -10 0 0 0 Z"
                        fill="url(#faqGlass)" stroke="#ea580c" strokeOpacity="0.25" strokeWidth="1.5" transform="translate(10,0)" />
                    <line x1="135" y1="16" x2="135" y2="144" stroke="#ea580c" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 6" />
                    <rect x="155" y="40" width="60" height="60" rx="6" fill="none" stroke="#ea580c" strokeOpacity="0.3" strokeWidth="1.5" />
                    <rect x="163" y="48" width="12" height="12" fill="#ea580c" fillOpacity="0.3" />
                    <rect x="195" y="48" width="12" height="12" fill="#ea580c" fillOpacity="0.3" />
                    <rect x="163" y="80" width="12" height="12" fill="#ea580c" fillOpacity="0.3" />
                </svg>

                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <span className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Help Centre
                    </span>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
                        Frequently Asked{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                            Questions
                        </span>
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
                        Everything you need to know about buying tickets and hosting events on Eventa.
                    </p>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Tab switcher */}
                <div className="flex gap-1 p-1.5 bg-gray-100 rounded-2xl w-fit mx-auto mb-12 shadow-inner">
                    <button
                        onClick={() => setTab("attendees")}
                        className={`px-6 sm:px-10 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${tab === "attendees"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        🎟️ For Attendees
                    </button>
                    <button
                        onClick={() => setTab("organisers")}
                        className={`px-6 sm:px-10 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${tab === "organisers"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        🎪 For Organisers
                    </button>
                </div>

                {/* FAQ grid */}
                <div className="relative">
                    {/* Subtle warm bg */}
                    <div className="absolute inset-0 bg-gradient-to-b from-orange-50/40 to-transparent rounded-3xl pointer-events-none -mx-4" />
                    <div className="relative py-4">
                        {tab === "attendees" ? <AttendeesFaqs /> : <OrganisersFaqs />}
                    </div>
                </div>

                {/* Bottom breadcrumb */}
                <p className="text-center text-sm text-gray-400 mt-8">
                    <Link href="/" className="hover:text-orange-500 transition">Home</Link>
                    {" · "}
                    <Link href="/terms" className="hover:text-orange-500 transition">Terms</Link>
                    {" · "}
                    <Link href="/refunds" className="hover:text-orange-500 transition">Refund Policy</Link>
                    {" · "}
                    <Link href="/privacy" className="hover:text-orange-500 transition">Privacy</Link>
                </p>
            </div>
        </>
    );
}
