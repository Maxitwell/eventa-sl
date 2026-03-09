"use client";

import { AuthProvider } from "@/store/AuthContext";
import { CartProvider } from "@/store/CartContext";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { ModalProvider } from "@/components/shared/ModalProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <CartProvider>
                <ToastProvider>
                    <ModalProvider>{children}</ModalProvider>
                </ToastProvider>
            </CartProvider>
        </AuthProvider>
    );
}
