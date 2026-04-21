"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { Search, BarChart, Menu, X } from "lucide-react";
import clsx from "clsx";

function getInitials(name?: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
}

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [navSearch, setNavSearch] = useState("");
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, currentUser, logout } = useAuth();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        if (isMobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobileMenuOpen]);

    const handleNavSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (navSearch.trim()) {
            router.push(`/?search=${encodeURIComponent(navSearch.trim())}`);
            setNavSearch("");
            setIsMobileMenuOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push("/");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const navLinks = [
        { name: "Discover", href: "/" },
        { name: "My Tickets", href: "/tickets" },
    ];

    if (!isLoggedIn || currentUser?.role === "organizer") {
        navLinks.push({ name: "Host event", href: "/events/create" });
    }

    if (pathname.startsWith("/scanner")) return null;

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" ref={menuRef}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo + desktop nav links */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/desktop-logo.svg" alt="Eventa Logo" className="h-10 w-auto object-contain" />
                        </Link>
                        <div className="hidden md:flex ml-10 space-x-8">
                            {navLinks.map(link => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={clsx(
                                            "inline-flex items-center px-1 pt-1 text-sm font-medium transition-all",
                                            isActive
                                                ? "border-b-2 border-orange-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        )}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: search + auth */}
                    <div className="flex items-center space-x-4">
                        {pathname === "/" && (
                            <form onSubmit={handleNavSearch} className="relative hidden sm:block">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={navSearch}
                                    onChange={e => setNavSearch(e.target.value)}
                                    placeholder="Search events in Sierra Leone..."
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white w-64 transition-all"
                                />
                            </form>
                        )}

                        {!isLoggedIn ? (
                            <div className="hidden md:flex items-center gap-4">
                                <Link href="/login" className="text-sm font-bold text-gray-700 hover:text-orange-600 transition">
                                    Sign In
                                </Link>
                                <Link href="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-sm">
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                {currentUser?.role === "organizer" && (
                                    <Link
                                        href="/dashboard"
                                        className="bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-100 transition border border-orange-200 flex items-center gap-2"
                                    >
                                        <BarChart size={16} /> Dashboard
                                    </Link>
                                )}
                                <Link
                                    href="/profile"
                                    className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm hover:bg-gray-700 transition"
                                    title={currentUser?.name}
                                >
                                    {getInitials(currentUser?.name)}
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <div className="flex items-center md:hidden ml-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-menu"
                                className="text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 p-2 rounded-md"
                            >
                                <span className="sr-only">{isMobileMenuOpen ? "Close" : "Open"} main menu</span>
                                {isMobileMenuOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            {isMobileMenuOpen && (
                <div id="mobile-menu" className="md:hidden bg-white border-t border-gray-200 absolute w-full shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="px-4 pt-4 pb-3 space-y-1">
                        {pathname === "/" && (
                            <form onSubmit={handleNavSearch} className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={navSearch}
                                    onChange={e => setNavSearch(e.target.value)}
                                    placeholder="Search events..."
                                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                />
                            </form>
                        )}
                        {navLinks.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "block px-3 py-2 rounded-md text-base font-medium",
                                        isActive
                                            ? "bg-orange-50 text-orange-600"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                        {isLoggedIn && currentUser?.role === "organizer" && (
                            <Link
                                href="/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={clsx(
                                    "block px-3 py-2 rounded-md text-base font-medium",
                                    pathname === "/dashboard"
                                        ? "bg-orange-50 text-orange-600"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                Dashboard
                            </Link>
                        )}
                    </div>

                    <div className="pt-4 pb-4 border-t border-gray-200">
                        {!isLoggedIn ? (
                            <div className="px-5 flex flex-col gap-3">
                                <Link
                                    href="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full text-center text-sm font-bold text-gray-700 hover:text-orange-600 transition py-2"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full text-center bg-gray-900 text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-sm"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="px-5 flex flex-col gap-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                                        {getInitials(currentUser?.name)}
                                    </div>
                                    <div>
                                        <div className="text-base font-medium text-gray-800">{currentUser?.name}</div>
                                        <div className="text-sm font-medium text-gray-500">{currentUser?.email}</div>
                                    </div>
                                </div>
                                <Link
                                    href="/profile"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                >
                                    Profile
                                </Link>
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                                >
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
