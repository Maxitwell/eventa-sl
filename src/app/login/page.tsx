"use client";

import { useState, Suspense, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Phone } from "lucide-react";
import Link from "next/link";

/* ─────────────────────────────────────────
   Reusable Auth Field — same as signup page
───────────────────────────────────────── */
function AuthField({
    label,
    icon,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 px-1">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
                    {icon}
                </span>
                <input
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all placeholder:text-gray-400 text-gray-900 text-sm"
                    {...props}
                />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Main Login Content
───────────────────────────────────────── */
function LoginContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<"email" | "phone">("email");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<any>(null);

    const { loginWithEmail, loginWithGoogle, loginWithPhone, verifyOTP, isLoggedIn, isLoading: isAuthLoading, currentUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const fallbackRedirect = currentUser?.role === "organizer" ? "/dashboard" : "/";
    const redirectTo = searchParams.get("redirect") || fallbackRedirect;

    useEffect(() => {
        if (!isAuthLoading && isLoggedIn) router.push(redirectTo);
    }, [isAuthLoading, isLoggedIn, router, redirectTo]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await loginWithEmail(email, password, false);
        } catch {
            showToast("Invalid email or password", "error");
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try { await loginWithGoogle(); } catch { setIsLoading(false); }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+232${phoneNumber.replace(/^0+/, "")}`;
            const result = await loginWithPhone(formattedPhone);
            setConfirmationResult(result);
        } catch {
            showToast("Failed to send SMS. Make sure to use the correct country code.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (confirmationResult) await verifyOTP(confirmationResult, otp);
        } catch {
            showToast("Invalid verification code.", "error");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fbf8ff] flex flex-col">
            <main className="flex-grow flex items-center justify-center py-24 px-4">
                <div className="w-full max-w-xl bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(26,27,34,0.08)] p-8 md:p-12">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-gray-500 text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href={`/signup?redirect=${redirectTo}`} className="text-orange-600 font-semibold hover:underline">
                                Sign up for free
                            </Link>
                        </p>
                    </div>

                    {/* Social logins */}
                    <div className="mb-10">
                        <button
                            type="button"
                            onClick={() => { setAuthMode(authMode === "email" ? "phone" : "email"); setConfirmationResult(null); }}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors active:scale-[0.98] font-semibold text-sm text-gray-700"
                        >
                            {authMode === "email"
                                ? <Phone size={18} className="text-orange-500" />
                                : <Mail size={18} className="text-orange-500" />}
                            {authMode === "email" ? "Continue with Phone Number" : "Continue with Email"}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-px flex-grow bg-gray-200" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Or continue with {authMode === "phone" ? "phone" : "email"}
                        </span>
                        <div className="h-px flex-grow bg-gray-200" />
                    </div>

                    {/* reCAPTCHA anchor */}
                    <div id="recaptcha-container" />

                    {/* ── EMAIL LOGIN FORM ── */}
                    {authMode === "email" ? (
                        <form className="space-y-6" onSubmit={handleEmailLogin}>
                            <AuthField
                                label="Email Address"
                                icon={<Mail size={16} />}
                                type="email"
                                required
                                placeholder="john.doe@eventa.africa"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Password
                                    </label>
                                    <Link href="/forgot-password" className="text-xs font-semibold text-orange-600 hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
                                        <Lock size={16} />
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all placeholder:text-gray-400 text-gray-900 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-4 rounded-md font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
                                >
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </button>
                            </div>
                        </form>

                    ) : confirmationResult ? (
                        /* ── OTP VERIFY FORM ── */
                        <form className="space-y-6" onSubmit={handleVerifyOTP}>
                            <AuthField
                                label="Verification Code"
                                icon={<Lock size={16} />}
                                type="text"
                                required
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 -mt-4">Enter the 6-digit code sent to your phone.</p>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-4 rounded-md font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
                                >
                                    {isLoading ? "Verifying..." : "Verify Code"}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmationResult(null)}
                                className="w-full text-center text-sm font-semibold text-orange-600 hover:underline"
                            >
                                Change phone number
                            </button>
                        </form>

                    ) : (
                        /* ── PHONE SEND OTP FORM ── */
                        <form className="space-y-6" onSubmit={handleSendOTP}>
                            <AuthField
                                label="Phone Number"
                                icon={<Phone size={16} />}
                                type="tel"
                                required
                                placeholder="+232 76 123456"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 -mt-4">Include your country code (e.g. +232).</p>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-4 rounded-md font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
                                >
                                    {isLoading ? "Sending..." : "Send Login Code"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Footer legal copy */}
                    <p className="mt-8 text-center text-sm text-gray-500">
                        By signing in, you agree to our{" "}
                        <Link href="/terms" className="text-orange-600 font-semibold hover:underline">Terms</Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-orange-600 font-semibold hover:underline">Privacy Policy</Link>.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff]">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
