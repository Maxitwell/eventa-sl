"use client";

import { useAuth } from "@/store/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Ticket, ArrowRight, Download, Share2 } from "lucide-react";
import Confetti from "react-confetti";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function PurchaseSuccess() {
    const { isLoggedIn } = useAuth();
    const router = useRouter();
    const [showConfetti, setShowConfetti] = useState(true);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

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

    return (
        <div className="min-h-screen bg-gray-50 py-12 flex flex-col items-center justify-center relative overflow-hidden px-4">
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    colors={['#f97316', '#ec4899', '#8b5cf6', '#10b981', '#fbbf24']}
                    recycle={false}
                    numberOfPieces={400}
                />
            )}

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 text-center relative z-10">
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
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-SUCCESSFUL-NEW"
                            alt="QR Code"
                            fill
                            className="object-contain p-1"
                        />
                    </div>
                    <p className="text-center text-xs text-gray-400 font-mono mt-2 z-10 relative">ID: TKT-1090024</p>
                </div>

                <div className="space-y-3">
                    <Button
                        className="w-full py-4 text-sm"
                        onClick={() => router.push(isLoggedIn ? "/tickets" : "/login?redirect=/tickets")}
                    >
                        Vew My Tickets <Ticket size={16} className="ml-2" />
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
        </div>
    );
}
