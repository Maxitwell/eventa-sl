"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Mock API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-bl from-orange-400/20 to-pink-500/20 blur-3xl rounded-full translate-y-[-50%] z-0"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link href="/" className="flex justify-center items-center gap-2 mb-6">
                    <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-500/30">
                        E
                    </div>
                    <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Eventa
                    </span>
                </Link>
                <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-gray-900">
                    Reset Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 px-4">
                    Enter your email and we'll send you a link to reset your password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white py-10 px-6 shadow-xl shadow-gray-200/50 sm:rounded-3xl border border-gray-100 sm:px-12">

                    {!isSubmitted ? (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <Input
                                    label="Email address"
                                    type="email"
                                    required
                                    icon={<Mail size={16} />}
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full flex justify-center py-3"
                                    isLoading={isLoading}
                                >
                                    Send Reset Link <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <ShieldCheck size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
                            <p className="text-sm text-gray-600 mb-8">
                                We sent a password reset link to <span className="font-bold text-gray-900">{email}</span>
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsSubmitted(false)}
                            >
                                Didn't receive it? Try again
                            </Button>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <Link href="/login" className="text-sm font-bold text-orange-600 hover:text-orange-500 transition flex items-center justify-center gap-1">
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
