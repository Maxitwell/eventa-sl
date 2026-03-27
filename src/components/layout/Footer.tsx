"use client";

import Link from "next/link";
import { Instagram, Twitter, Facebook, Globe, MessageCircle } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* WhatsApp Banner */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-8 sm:p-12 mb-16 text-center text-white shadow-lg shadow-teal-500/20 relative overflow-hidden flex flex-col items-center">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>

                    <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-sm border border-white/20">
                        <img src="/whatsapp-logo.svg" alt="WhatsApp" className="w-10 h-10 object-contain" />
                    </div>
                    <h3 className="text-3xl font-extrabold mb-4">Book Tickets on WhatsApp!</h3>
                    <p className="text-teal-50 text-lg max-w-2xl mb-8">
                        Skip the website and book your next event directly through our automated WhatsApp assistant. Fast, easy, and secure.
                    </p>
                    <a
                        href="https://wa.me/14155238886?text=join%20thought-stiff"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-teal-600 font-bold py-4 px-10 rounded-full hover:bg-teal-50 transition-colors shadow-md flex items-center gap-2 group"
                    >
                        <img src="/whatsapp-logo.svg" alt="WhatsApp" className="w-5 h-5 group-hover:scale-110 transition-transform object-contain" />
                        Chat with our Bot
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6 inline-block">
                            <img src="/desktop-logo.svg" alt="Eventa Logo" className="h-12 w-auto object-contain" />
                        </Link>
                        <p className="text-gray-500 max-w-sm">
                            The heartbeat of Sierra Leone. Discover the hottest concerts, tech meetups, and beach festivals happening across the country.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-6">Quick Links</h4>
                        <ul className="space-y-4 text-gray-500 font-medium pb-2">
                            <li><Link href="/" className="hover:text-orange-500 transition-colors">Discover Events</Link></li>
                            <li><Link href="/events/create" className="hover:text-orange-500 transition-colors">Create Event</Link></li>
                            <li><Link href="/login" className="hover:text-orange-500 transition-colors">Sign In</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-6">Connect with us</h4>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                                <Instagram size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                                <Twitter size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                                <Facebook size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                                <Globe size={18} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 font-medium pb-4">
                    <p>© {new Date().getFullYear()} Eventa SL. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
                        <Link href="/" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
