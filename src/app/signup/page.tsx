"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/store/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, Mail, Lock, ArrowRight, Chrome, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

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
    const { loginWithEmail, loginWithGoogle, loginWithPhone, verifyOTP, updateProfile, isLoggedIn, isLoading: isAuthLoading, currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const fallbackRedirect = currentUser?.role === "organizer" ? "/dashboard" : "/";
    const redirectTo = searchParams.get("redirect") || fallbackRedirect;

    useEffect(() => {
        if (!isAuthLoading && isLoggedIn) {
            router.push(redirectTo);
        }
    }, [isAuthLoading, isLoggedIn, router, redirectTo]);

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (email !== confirmEmail) {
            alert("Email addresses do not match.");
            return;
        }
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const fullName = `${firstName.trim()} ${surname.trim()}`;
            await loginWithEmail(email, password, true, fullName, role, phoneNumber);
            const dynamicRedirect = searchParams.get("redirect") || (role === "organizer" ? "/dashboard" : "/");
            router.push(dynamicRedirect);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to create account");
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogle();
            // Wait for useEffect
        } catch (error) {
            setIsLoading(false);
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+232${phoneNumber.replace(/^0+/, '')}`;
            const result = await loginWithPhone(formattedPhone);
            setConfirmationResult(result);
        } catch (error) {
            console.error(error);
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
                if (fullName.trim() !== "") {
                    await updateProfile(fullName);
                }
            }
        } catch (error) {
            alert("Invalid verification code.");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col justify-center items-center z-10 mt-10">
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
                    Create an account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href={`/ login ? redirect = ${redirectTo} `} className="font-medium text-orange-600 hover:text-orange-500 transition">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white py-10 px-6 shadow-xl shadow-gray-200/50 sm:rounded-3xl border border-gray-100 sm:px-12">
                    
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-900 mb-3 text-center">I am here to...</label>
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setRole("attendee")}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === "attendee" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Buy Tickets
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("organizer")}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === "organizer" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Sell Tickets
                            </button>
                        </div>
                    </div>

                    <div className="mb-6 space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleSignup}
                            isLoading={isLoading}
                            className="w-full flex justify-center !text-sm !font-bold py-3"
                        >
                            <Chrome size={18} className="mr-2 text-gray-700" />
                            Sign up with Google
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setAuthMode(authMode === "email" ? "phone" : "email");
                                setConfirmationResult(null);
                            }}
                            className="w-full flex justify-center !text-sm !font-bold py-3 text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                            {authMode === "email" ? <Phone size={18} className="mr-2" /> : <Mail size={18} className="mr-2" />}
                            {authMode === "email" ? "Sign up with Phone Number" : "Sign up with Email"}
                        </Button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm font-medium">
                            <span className="bg-white px-4 text-gray-500">Or sign up with {authMode === "phone" ? "phone number" : "email"}</span>
                        </div>
                    </div>

                    <div id="recaptcha-container"></div>

                    {authMode === "email" ? (
                        <form className="space-y-6" onSubmit={handleEmailSignup}>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        label="First name"
                                        type="text"
                                        required
                                        icon={<User size={16} />}
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        label="Surname"
                                        type="text"
                                        required
                                        icon={<User size={16} />}
                                        placeholder="Doe"
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Input
                                    label="Phone Number (WhatsApp)"
                                    type="tel"
                                    icon={<Phone size={16} />}
                                    placeholder="+232 76 123456"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>

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
                                <Input
                                    label="Confirm Email"
                                    type="email"
                                    required
                                    icon={<Mail size={16} />}
                                    placeholder="you@example.com"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <Input
                                    type="password"
                                    required
                                    icon={<Lock size={16} />}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-gray-500">Must be at least 8 characters.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                <Input
                                    type="password"
                                    required
                                    icon={<Lock size={16} />}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full flex justify-center py-3 mt-8"
                                isLoading={isLoading}
                            >
                                Create Account <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </form>
                    ) : confirmationResult ? (
                        <form className="space-y-6" onSubmit={handleVerifyOTP}>
                            <div>
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    required
                                    icon={<Lock size={16} />}
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-gray-500">Enter the 6-digit code sent to your phone.</p>
                            </div>
                            <Button
                                type="submit"
                                className="w-full flex justify-center py-3"
                                isLoading={isLoading}
                            >
                                Verify Account <ArrowRight size={16} className="ml-2" />
                            </Button>
                            <button
                                type="button"
                                onClick={() => setConfirmationResult(null)}
                                className="mt-4 text-sm text-orange-600 w-full text-center hover:underline"
                            >
                                Change phone number
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSendOTP}>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        label="First name"
                                        type="text"
                                        required
                                        icon={<User size={16} />}
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        label="Surname"
                                        type="text"
                                        required
                                        icon={<User size={16} />}
                                        placeholder="Doe"
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Input
                                    label="Phone Number"
                                    type="tel"
                                    required
                                    icon={<Phone size={16} />}
                                    placeholder="+232 76 123456"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-gray-500">Include your country code (e.g. +232).</p>
                            </div>
                            <Button
                                type="submit"
                                className="w-full flex justify-center py-3"
                                isLoading={isLoading}
                            >
                                Send Verification Code <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-xs text-gray-500">
                        By signing up, you agree to our <a href="#" className="underline hover:text-gray-900">Terms of Service</a> and <a href="#" className="underline hover:text-gray-900">Privacy Policy</a>.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Signup() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-bl from-pink-400/20 to-orange-500/20 blur-3xl rounded-full translate-y-[-50%] z-0"></div>
            <Suspense fallback={<div className="flex justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <SignupContent />
            </Suspense>
        </div>
    );
}
