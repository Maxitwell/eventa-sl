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
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const isHome = pathname === "/";
    const isTransparent = isHome && !isScrolled;

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
        <nav 
            className={clsx(
                "z-50 w-full transition-all duration-300",
                isTransparent 
                    ? "absolute top-0 bg-transparent border-transparent" 
                    : "sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm"
            )} 
            ref={menuRef}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Left: Logo & Nav Links */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <img 
                                src="/desktop-logo.svg" 
                                alt="Eventa" 
                                className={clsx("h-8 w-auto transition-all", isTransparent && "brightness-0 invert")} 
                            />
                        </Link>

                        <div className="hidden md:flex items-center gap-6">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={clsx(
                                            "inline-flex items-center px-1 pt-1 text-sm font-medium transition-all border-b-2 h-16 -mb-px",
                                            isActive 
                                                ? (isTransparent ? "border-white text-white" : "border-orange-500 text-gray-900")
                                                : (isTransparent ? "border-transparent text-white/80 hover:text-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
                                        )}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Search & Auth */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Search Bar */}
                        <div className="relative hidden lg:block">
                            <form onSubmit={handleNavSearch}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className={clsx("h-4 w-4", isTransparent ? "text-white/60" : "text-gray-400")} />
                                </div>
                                <input 
                                    type="text" 
                                    value={navSearch}
                                    onChange={(e) => setNavSearch(e.target.value)}
                                    className={clsx(
                                        "pl-10 pr-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-64 transition-all rounded-[10px]",
                                        isTransparent 
                                            ? "bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20" 
                                            : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white"
                                    )} 
                                    placeholder="Search events in Sierra Leone..."
                                />
                            </form>
                        </div>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4 sm:gap-6">
                            {!isLoggedIn ? (
                                <>
                                    <Link 
                                        href="/login" 
                                        className={clsx("text-sm font-bold transition", isTransparent ? "text-white hover:text-white/80" : "text-gray-700 hover:text-orange-600")}
                                    >
                                        Sign In
                                    </Link>
                                    <Link 
                                        href="/signup" 
                                        className={clsx(
                                            "hidden sm:block px-6 py-3 rounded-[10px] text-base font-semibold transition shadow-sm font-inter-tight",
                                            isTransparent 
                                                ? "bg-white text-[#0A0402] hover:bg-white/90" 
                                                : "bg-gray-900 text-white hover:bg-gray-800"
                                        )}
                                    >
                                        Get Started
                                    </Link>
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {currentUser?.role === "organizer" && (
                                        <Link
                                            href="/dashboard"
                                            className={clsx(
                                                "hidden sm:flex px-4 py-2 rounded-full text-sm font-bold transition border items-center gap-2",
                                                isTransparent 
                                                    ? "bg-white/10 text-white border-white/20 hover:bg-white/20" 
                                                    : "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                                            )}
                                        >
                                            <BarChart size={16} /> Dashboard
                                        </Link>
                                    )}
                                    <Link
                                        href="/profile"
                                        className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition",
                                            isTransparent ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-700"
                                        )}
                                        title={currentUser?.name}
                                    >
                                        {getInitials(currentUser?.name)}
                                    </Link>
                                </div>
                            )}

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className={clsx("md:hidden p-2 rounded-md transition-colors", isTransparent ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100")}
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="px-4 pt-4 pb-3 space-y-1">
                        <form onSubmit={handleNavSearch} className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={navSearch}
                                onChange={e => setNavSearch(e.target.value)}
                                placeholder="Search events..."
                                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-[10px] bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                            />
                        </form>
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
                                            : "text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="pt-4 pb-6 border-t border-gray-100 px-4">
                        {!isLoggedIn ? (
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full text-center text-sm font-bold text-gray-700 py-2"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full text-center bg-gray-900 text-white px-4 py-3 rounded-[10px] text-sm font-bold shadow-sm"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                                        {getInitials(currentUser?.name)}
                                    </div>
                                    <div>
                                        <div className="text-base font-medium text-gray-800">{currentUser?.name}</div>
                                        <div className="text-sm font-medium text-gray-500">{currentUser?.email}</div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {currentUser?.role === "organizer" && (
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-bold text-orange-600 bg-orange-50 hover:bg-orange-100"
                                        >
                                            <BarChart size={18} /> Dashboard
                                        </Link>
                                    )}
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
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
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
