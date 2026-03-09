"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/store/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, ArrowRight, Chrome } from "lucide-react";
import Link from "next/link";

function LoginContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { loginWithEmail, loginWithGoogle } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await loginWithEmail(email, password, false);
            router.push(redirectTo);
        } catch (error) {
            alert("Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await loginWithGoogle();
        setIsLoading(false);
        router.push(redirectTo);
    };

    return (
        <div className="w-full flex-1 flex flex-col justify-center items-center z-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full mb-8">
                <Link href="/" className="flex justify-center items-center gap-2 mb-6">
                    <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-500/30">
                        E
                    </div>
                    <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Eventa
                    </span>
                </Link>
                <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-gray-900">
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Or{" "}
                    <Link href={`/signup?redirect=${redirectTo}`} className="font-medium text-orange-600 hover:text-orange-500 transition">
                        create a new account for free
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white py-10 px-6 shadow-xl shadow-gray-200/50 sm:rounded-3xl border border-gray-100 sm:px-12">

                    <div className="mb-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleLogin}
                            isLoading={isLoading}
                            className="w-full flex justify-center !text-sm !font-bold py-3"
                        >
                            <Chrome size={18} className="mr-2 text-gray-700" />
                            Continue with Google
                        </Button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm font-medium">
                            <span className="bg-white px-4 text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleEmailLogin}>
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

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <Link href="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-500">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                required
                                icon={<Lock size={16} />}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full flex justify-center py-3"
                            isLoading={isLoading}
                        >
                            Sign In <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function Login() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-orange-400/20 to-pink-500/20 blur-3xl rounded-full translate-y-[-50%] z-0"></div>
            <Suspense fallback={<div className="flex justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <LoginContent />
            </Suspense>
        </div>
    );
}
