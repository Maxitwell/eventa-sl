"use client";

import { useAuth } from "@/store/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, Ticket, ArrowRight, Download, Share2, Lock } from "lucide-react";
import Confetti from "react-confetti";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { linkGuestTickets } from "@/lib/db";
import { useToast } from "@/components/shared/ToastProvider";

function PurchaseSuccessContent() {
    const { isLoggedIn, loginWithEmail, currentUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showConfetti, setShowConfetti] = useState(true);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    
    // Post-purchase account creation state
    const guestEmail = searchParams.get("guestEmail");
    const guestName = searchParams.get("guestName") || "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    useEffect(() => {
        // Client-side only
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleCreateAccount = async () => {
        if (!password || password.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }
        if (!guestEmail) return;

        setIsCreatingAccount(true);
        try {
            await loginWithEmail(guestEmail, password, true, guestName);
            // Current user might not be available immediately in this render cycle, 
            // but loginWithEmail throws if it fails.
            
            // To link tickets, we need the new UID. Let's rely on the auth listener state
            // or we'll just link the next time the component fetches. 
            // Better yet, auth.currentUser from firebase is immediately updated:
            const { auth } = await import("@/lib/firebase");
            if (auth.currentUser) {
                await linkGuestTickets(guestEmail, auth.currentUser.uid);
            }

            showToast("Account created successfully! Your tickets are saved.", "success");
            router.push("/tickets");
        } catch (error: any) {
            if (error?.code === "auth/email-already-in-use") {
                // Email is already registered. Try logging them in with this password!
                try {
                    await loginWithEmail(guestEmail, password, false);
                    
                    const { auth } = await import("@/lib/firebase");
                    if (auth.currentUser) {
                        await linkGuestTickets(guestEmail, auth.currentUser.uid);
                    }
                    showToast("Welcome back! Your new tickets have been added to your account.", "success");
                    router.push("/tickets");
                } catch (loginError) {
                    showToast("This email is already registered. Please go to the Login page if you forgot your password.", "error");
                }
            } else {
                showToast("Something went wrong creating your account.", "error");
            }
        } finally {
            setIsCreatingAccount(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 text-center relative z-10 w-full">
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    colors={['#f97316', '#ec4899', '#8b5cf6', '#10b981', '#fbbf24']}
                    recycle={false}
                    numberOfPieces={400}
                    style={{ position: 'fixed', top: 0, left: 0 }}
                />
            )}

            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-green-500" />
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                Payment Successful!
            </h1>
            <p className="text-gray-500 mb-8">
                Your tickets have been secured and a copy has been sent to your email.
            </p>

            {/* Mock Digital Ticket Stub */}
            <div className="bg-gray-900 text-white rounded-2xl p-6 text-left mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">Pass Type</p>
                        <p className="font-bold">Regular Admission</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm">
                            <Download size={14} />
                        </button>
                        <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm">
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="relative w-24 h-24 bg-white p-2 rounded-xl mb-2 z-10 mx-auto mt-4">
                    <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-SUCCESSFUL-${Date.now()}`}
                        alt="QR Code"
                        fill
                        className="object-contain p-1"
                    />
                </div>
                <p className="text-center text-xs text-gray-400 font-mono mt-2 z-10 relative">ID: TKT-{Math.floor(Math.random() * 1000000)}</p>
            </div>

            {/* Post-Purchase Account Creation Prompt */}
            {!isLoggedIn && guestEmail && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8 text-left animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold flex-wrap">
                        <Lock size={18} /> Save your details for next time?
                    </div>
                    <p className="text-sm text-blue-900/70 mb-4">
                        Create a password to securely access your tickets and speed up future checkouts.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Input 
                            type="password" 
                            placeholder="Create a secure password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Input 
                            type="password" 
                            placeholder="Confirm your password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                            isLoading={isCreatingAccount}
                            onClick={handleCreateAccount}
                        >
                            Save Account & View Tickets
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <Button
                    className="w-full py-4 text-sm"
                    onClick={() => router.push(isLoggedIn ? "/tickets" : "/login?redirect=/tickets")}
                >
                    View My Tickets <Ticket size={16} className="ml-2" />
                </Button>
                <Button
                    variant="ghost"
                    className="w-full py-3"
                    onClick={() => router.push("/")}
                >
                    Discover More Events
                </Button>
            </div>
        </div>
    );
}

export default function PurchaseSuccess() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 flex flex-col items-center justify-center relative overflow-hidden px-4">
            <Suspense fallback={<div className="text-gray-500 font-medium animate-pulse">Loading your success page...</div>}>
                <PurchaseSuccessContent />
            </Suspense>
        </div>
    );
}

