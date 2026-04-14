"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => {
                        const isSuccess = toast.type === "success";
                        const isError = toast.type === "error";

                        const bgClass = isSuccess
                            ? "bg-green-600"
                            : isError
                                ? "bg-red-600"
                                : "bg-gray-900";

                        return (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 100 }}
                                className={`${bgClass} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium pointer-events-auto`}
                            >
                                {isSuccess && <CheckCircle size={18} />}
                                {isError && <AlertCircle size={18} />}
                                {!isSuccess && !isError && <Info size={18} />}
                                <span>{toast.message}</span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
