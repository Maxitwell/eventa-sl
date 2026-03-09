"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile as firebaseUpdateProfile,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface AuthContextType {
    isLoggedIn: boolean;
    currentUser: User | null;
    isLoading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, password?: string, isSignup?: boolean, name?: string) => Promise<void>;
    loginWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
    verifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (name: string, avatar?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setCurrentUser({
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || "Eventa User",
                    email: firebaseUser.email || "",
                    avatar: firebaseUser.photoURL || undefined,
                });
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const loginWithEmail = async (email: string, password?: string, isSignup?: boolean, name?: string) => {
        try {
            if (isSignup && password) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                if (name) {
                    await firebaseUpdateProfile(userCredential.user, { displayName: name });
                    // Provide optimistic update before listener catches it
                    setCurrentUser(prev => prev ? { ...prev, name } : null);
                }
            } else if (password) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                throw new Error("Password is required for email login");
            }
        } catch (error) {
            console.error("Error with email auth", error);
            throw error;
        }
    };

    const loginWithPhone = async (phoneNumber: string): Promise<ConfirmationResult> => {
        try {
            if (!(window as any).recaptchaVerifier) {
                (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                    size: "invisible"
                });
            }
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, (window as any).recaptchaVerifier);
            return confirmationResult;
        } catch (error) {
            console.error("Error sending OTP", error);
            throw error;
        }
    };

    const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
        try {
            await confirmationResult.confirm(otp);
        } catch (error) {
            console.error("Error verifying OTP", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const updateProfile = async (name: string, avatar?: string) => {
        if (auth.currentUser) {
            try {
                await firebaseUpdateProfile(auth.currentUser, {
                    displayName: name,
                    photoURL: avatar
                });
                setCurrentUser(prev => prev ? { ...prev, name, avatar } : null);
            } catch (error) {
                console.error("Error updating profile", error);
            }
        }
    };

    const isLoggedIn = !!currentUser;

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                currentUser,
                isLoading,
                loginWithGoogle,
                loginWithEmail,
                loginWithPhone,
                verifyOTP,
                logout,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

