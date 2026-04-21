"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
    footer?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "lg",
    footer,
}: ModalProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isMounted) return null;

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
    };

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 bg-black/50" : "opacity-0 pointer-events-none bg-transparent"
                }`}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidthClasses[maxWidth]
                    } max-h-[90vh] flex flex-col transform transition-transform duration-300 ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-full sm:translate-y-4"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-start bg-white z-10 rounded-t-2xl">
                    <div>
                        {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-500 shrink-0 ml-4"
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 sm:rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
