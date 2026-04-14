"use client";

import { useState, Suspense, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { User, Mail, Lock, Phone, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";

/* ─────────────────────────────────────────
   Reusable Auth Field — matches the HTML spec exactly
   (label + icon + bg-gray-50 input, orange focus ring)
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
   Main Signup Content
───────────────────────────────────────── */
function SignupContent() {
    const [firstName, setFirstName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<"attendee" | "organizer">("attendee");
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<"email" | "phone">("email");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const [agreeTerms, setAgreeTerms] = useState(false);

    const { loginWithEmail, loginWithGoogle, loginWithPhone, verifyOTP, updateProfile, isLoggedIn, isLoading: isAuthLoading, currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const fallbackRedirect = currentUser?.role === "organizer" ? "/dashboard" : "/";
    const redirectTo = searchParams.get("redirect") || fallbackRedirect;

    useEffect(() => {
        if (!isAuthLoading && isLoggedIn) router.push(redirectTo);
    }, [isAuthLoading, isLoggedIn, router, redirectTo]);

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreeTerms) { alert("You must agree to the Terms and Privacy Policy."); return; }
        if (email !== confirmEmail) { alert("Email addresses do not match."); return; }
        if (password !== confirmPassword) { alert("Passwords do not match."); return; }
        setIsLoading(true);
        try {
            const fullName = `${firstName.trim()} ${surname.trim()}`;
            await loginWithEmail(email, password, true, fullName, role, phoneNumber);
            
            fetch("/api/auth/welcome", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, name: fullName })
            }).catch(console.error);

            const dynamicRedirect = searchParams.get("redirect") || (role === "organizer" ? "/dashboard" : "/");
            router.push(dynamicRedirect);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to create account");
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        if (!agreeTerms) { alert("You must agree to the Terms and Privacy Policy."); return; }
        setIsLoading(true);
        try { await loginWithGoogle(); } catch { setIsLoading(false); }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreeTerms) { alert("You must agree to the Terms and Privacy Policy."); return; }
        setIsLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+232${phoneNumber.replace(/^0+/, "")}`;
            const result = await loginWithPhone(formattedPhone);
            setConfirmationResult(result);
        } catch {
            alert("Failed to send SMS. Make sure to use the correct country code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (confirmationResult) {
                await verifyOTP(confirmationResult, otp);
                const fullName = `${firstName.trim()} ${surname.trim()}`;
                if (fullName.trim()) await updateProfile(fullName);
            }
        } catch {
            alert("Invalid verification code.");
            setIsLoading(false);
        }
    };

    return (
        /* ── Page shell ── */
        <div className="min-h-screen bg-[#fbf8ff] flex flex-col">

            {/* ── Main Card ── */}
            <main className="flex-grow flex items-center justify-center py-24 px-4">
                <div className="w-full max-w-xl bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(26,27,34,0.08)] p-8 md:p-12">

                    {/* Segmented role control */}
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-10 w-full max-w-sm mx-auto">
                        <button
                            type="button"
                            onClick={() => setRole("attendee")}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === "attendee" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Buy Tickets
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("organizer")}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === "organizer" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Event Organiser
                        </button>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Create Account</h1>
                        <p className="text-gray-500 text-sm">Join the elite circle of event enthusiasts.</p>
                    </div>

                    {/* Social logins */}
                    <div className="mb-10">
                        <button
                            type="button"
                            onClick={() => { setAuthMode(authMode === "email" ? "phone" : "email"); setConfirmationResult(null); }}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors active:scale-[0.98] font-semibold text-sm text-gray-700"
                        >
                            {authMode === "email" ? <Phone size={18} className="text-orange-500" /> : <Mail size={18} className="text-orange-500" />}
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

                    {/* ── EMAIL FORM ── */}
                    {authMode === "email" ? (
                        <form className="space-y-6" onSubmit={handleEmailSignup}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AuthField
                                    label="First Name"
                                    icon={<User size={16} />}
                                    type="text"
                                    required
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                                <AuthField
                                    label="Surname"
                                    icon={<User size={16} />}
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                />
                            </div>

                            <AuthField
                                label="WhatsApp / Phone"
                                icon={<MessageSquare size={16} />}
                                type="tel"
                                placeholder="+232 76 123456"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />

                            <AuthField
                                label="Email Address"
                                icon={<Mail size={16} />}
                                type="email"
                                required
                                placeholder="john.doe@eventa.africa"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <AuthField
                                label="Confirm Email"
                                icon={<ShieldCheck size={16} />}
                                type="email"
                                required
                                placeholder="Confirm your email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                            />

                            <AuthField
                                label="Password"
                                icon={<Lock size={16} />}
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <AuthField
                                label="Confirm Password"
                                icon={<Lock size={16} />}
                                type="password"
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-4 rounded-md font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
                                >
                                    {isLoading ? "Creating..." : "Create Account"}
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
                                    {isLoading ? "Verifying..." : "Verify Account"}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AuthField
                                    label="First Name"
                                    icon={<User size={16} />}
                                    type="text"
                                    required
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                                <AuthField
                                    label="Surname"
                                    icon={<User size={16} />}
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                />
                            </div>
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
                                    {isLoading ? "Sending..." : "Send Verification Code"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Footer legal copy checkbox */}
                    <div className="mt-8 flex items-start gap-2 max-w-sm mx-auto text-sm text-gray-500">
                        <input 
                            type="checkbox" 
                            id="termsCheckbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor="termsCheckbox" className="flex-1 cursor-pointer">
                            By signing up, I agree to the{" "}
                            <Link href="/terms" target="_blank" className="text-orange-600 font-semibold hover:underline">Terms</Link>,{" "}
                            <Link href="/privacy" target="_blank" className="text-orange-600 font-semibold hover:underline">Privacy Policy</Link>, and{" "}
                            <Link href="/refunds" target="_blank" className="text-orange-600 font-semibold hover:underline">Refund Policy</Link>.
                        </label>
                    </div>

                    {/* Sign in link */}
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Already have an account?{" "}
                        <Link href={`/login?redirect=${redirectTo}`} className="text-orange-600 font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default function Signup() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff]">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
