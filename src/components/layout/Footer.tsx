"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook } from "lucide-react";

function TikTokIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.52V6.76a4.85 4.85 0 0 1-1.02-.07z" />
        </svg>
    );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
    );
}

export function Footer() {
    const pathname = usePathname();
    if (pathname.startsWith("/scanner")) return null;
    const isMinimalPage = ["/terms", "/privacy", "/refunds", "/login", "/signup"].includes(pathname);

    return (
        <footer className={`bg-white border-t border-gray-100 ${isMinimalPage ? "pt-8 pb-4" : "pt-16 pb-8"}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── WhatsApp Banner ── */}
                {!isMinimalPage && (
                    <div className="bg-[#0a2e1a] rounded-3xl px-8 py-10 sm:px-12 mb-16 flex flex-col sm:flex-row sm:items-center gap-8 relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-72 h-72 rounded-full border border-white/10" />
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 translate-x-1/4 w-48 h-48 rounded-full border border-white/5" />

                        {/* Left: content */}
                        <div className="flex-1 relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-5 h-5 bg-[#25d366] rounded-full flex items-center justify-center shrink-0">
                                    <WhatsAppIcon size={12} />
                                </div>
                                <span className="text-[#4ade80] text-xs font-bold uppercase tracking-widest">
                                    Book on WhatsApp
                                </span>
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
                                Skip the website.<br />Book in your DMs.
                            </h3>
                            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                                Chat with our bot in Krio or English. Pay with Orange Money
                                or Afrimoney. Get your QR ticket instantly.
                            </p>
                        </div>

                        {/* Right: CTA */}
                        <a
                            href="https://wa.me/14155238886?text=join%20thought-stiff"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 bg-[#25d366] text-white font-bold py-4 px-8 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
                        >
                            Chat with bot →
                        </a>
                    </div>
                )}

                {/* ── Footer columns ── */}
                {!isMinimalPage && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        {/* Brand */}
                        <div className="col-span-1 md:col-span-2">
                            <Link href="/" className="inline-block mb-5">
                                <img src="/desktop-logo.svg" alt="Eventa" className="h-12 w-auto object-contain" />
                            </Link>
                            <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
                                The heartbeat of Sierra Leone. Concerts, meetups &amp; festivals from Freetown to Kono.
                            </p>
                            <div className="flex gap-3">
                                <a
                                    href="https://www.instagram.com/eventaticketing?igsh=c2lhcmYyeWpyMzhx"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Instagram"
                                    className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                >
                                    <Instagram size={18} />
                                </a>
                                <a
                                    href="https://www.facebook.com/share/18nZTrAn9p/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Facebook"
                                    className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                >
                                    <Facebook size={18} />
                                </a>
                                <a
                                    href="https://www.tiktok.com/@eventatickets?_r=1&_t=ZS-95SWY13t7bT"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="TikTok"
                                    className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                >
                                    <TikTokIcon size={18} />
                                </a>
                            </div>
                        </div>

                        {/* Discover */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-5 text-xs uppercase tracking-widest">Discover</h4>
                            <ul className="space-y-3.5 text-gray-500 font-medium">
                                <li><Link href="/" className="hover:text-orange-500 transition-colors">Browse events</Link></li>
                                <li><Link href="/events/create" className="hover:text-orange-500 transition-colors">Host an event</Link></li>
                                <li><Link href="/" className="hover:text-orange-500 transition-colors">Categories</Link></li>
                                <li><Link href="/login" className="hover:text-orange-500 transition-colors">Sign in</Link></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-5 text-xs uppercase tracking-widest">Support</h4>
                            <ul className="space-y-3.5 text-gray-500 font-medium">
                                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Help center</Link></li>
                                <li><Link href="/refunds" className="hover:text-orange-500 transition-colors">Refund policy</Link></li>
                                <li><Link href="/privacy" className="hover:text-orange-500 transition-colors">Contact us</Link></li>
                                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Organiser FAQ</Link></li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ── Bottom bar ── */}
                <div className={`${!isMinimalPage ? "border-t border-gray-100" : ""} pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 font-medium`}>
                    <p>© {new Date().getFullYear()} BluerainTechnologies Ltd · Made for Salone</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                        <Link href="/refunds" className="hover:text-gray-900 transition-colors">Refunds</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
