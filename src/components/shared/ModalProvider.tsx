"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { TicketModal } from "./TicketModal";
import { CheckoutModal } from "./CheckoutModal";
import { HypeModal } from "./HypeModal";
import { EventEntity } from "@/lib/db";

type ModalState = "none" | "ticket" | "checkout" | "hype";

interface ModalContextType {
    openTicketModal: (event: EventEntity) => void;
    openCheckoutModal: () => void;
    openHypeModal: (event: EventEntity) => void;
    closeAll: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [activeModal, setActiveModal] = useState<ModalState>("none");
    const [selectedEvent, setSelectedEvent] = useState<EventEntity | null>(null);

    useEffect(() => {
        // Listen for custom events triggered by components that don't have direct access
        const handleHypeEvent = (e: any) => {
            openHypeModal(e.detail.event);
        };

        window.addEventListener("open-hype-modal", handleHypeEvent);
        return () => window.removeEventListener("open-hype-modal", handleHypeEvent);
    }, []);

    const openTicketModal = (event: EventEntity) => {
        setSelectedEvent(event);
        setActiveModal("ticket");
    };

    const openCheckoutModal = () => {
        setActiveModal("checkout");
    };

    const openHypeModal = (event: EventEntity) => {
        setSelectedEvent(event);
        setActiveModal("hype");
    };

    const closeAll = () => {
        setActiveModal("none");
        // Don't clear selectedEvent immediately to allow exit animations to show content
        setTimeout(() => setSelectedEvent(null), 300);
    };

    return (
        <ModalContext.Provider
            value={{ openTicketModal, openCheckoutModal, openHypeModal, closeAll }}
        >
            {children}

            <TicketModal
                isOpen={activeModal === "ticket"}
                onClose={closeAll}
                event={selectedEvent}
                onProceedToCheckout={openCheckoutModal}
            />

            <CheckoutModal
                isOpen={activeModal === "checkout"}
                onClose={closeAll}
                onBack={() => setActiveModal("ticket")}
            />

            <HypeModal
                isOpen={activeModal === "hype"}
                onClose={closeAll}
                event={selectedEvent}
            />
        </ModalContext.Provider>
    );
}

export function useModals() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModals must be used within a ModalProvider");
    }
    return context;
}
