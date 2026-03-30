"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { Search, User, BarChart, LogIn, LogOut, Menu, X } from "lucide-react";
import clsx from "clsx";

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, currentUser, logout } = useAuth();

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
        navLinks.push({ name: "Create Event", href: "/events/create" });
    }

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/desktop-logo.svg" alt="Eventa Logo" className="h-10 w-auto object-contain" />
                        </Link>
                        <div className="hidden md:flex ml-10 space-x-8">
                            {navLinks.map((link) => {
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
                    <div className="flex items-center space-x-4">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search events in Sierra Leone..."
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white w-64 transition-all"
                            />
                        </div>

                        {!isLoggedIn ? (
                            <div className="hidden md:flex items-center gap-4">
                                <Link
                                    href="/login"
                                    className="text-sm font-bold text-gray-700 hover:text-orange-600 transition"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/signup"
                                    className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-sm"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-4">
                                {currentUser?.role === "organizer" && (
                                    <Link
                                        href="/dashboard"
                                        className="hidden md:flex bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-100 transition border border-orange-200 items-center gap-2"
                                    >
                                        <BarChart size={16} /> Dashboard
                                    </Link>
                                )}
                                <div className="text-right border-l border-gray-200 pl-4">
                                    <p className="text-xs text-gray-500 font-medium">Welcome back,</p>
                                    <Link href="/profile" className="block mt-0.5 group">
                                        <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition">
                                            {currentUser?.name}
                                        </p>
                                    </Link>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold hover:bg-red-100 transition shadow-sm"
                                    title="Log Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}

                        {/* Mobile menu toggle button */}
                        <div className="flex items-center md:hidden ml-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 p-2 rounded-md"
                            >
                                <span className="sr-only">Open main menu</span>
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
                <div className="md:hidden bg-white border-t border-gray-200 absolute w-full shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="px-4 pt-4 pb-3 space-y-1">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search events..."
                                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                            />
                        </div>
                        {navLinks.map((link) => {
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
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                        <User size={20} />
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
                                    <User size={20} /> Profile
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                                >
                                    <LogOut size={20} /> Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
