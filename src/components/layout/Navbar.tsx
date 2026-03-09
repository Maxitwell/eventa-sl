"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { Search, User, BarChart, LogIn, LogOut } from "lucide-react";
import clsx from "clsx";

export function Navbar() {
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
        { name: "Create Event", href: "/events/create" },
    ];

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/logo.png" alt="Eventa Logo" className="h-10 w-auto rounded-lg object-contain" />
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
                            <div className="flex items-center gap-4">
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
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/dashboard"
                                    className="hidden md:flex bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-100 transition border border-orange-200 items-center gap-2"
                                >
                                    <BarChart size={16} /> Dashboard
                                </Link>
                                <div className="text-right hidden md:block border-l border-gray-200 pl-4">
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
                    </div>
                </div>
            </div>
        </nav>
    );
}
