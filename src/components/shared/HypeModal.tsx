"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";
import { Copy, Sparkles, Check } from "lucide-react";
import { EventEntity } from "@/lib/db";
import { Button } from "../ui/Button";

interface HypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: EventEntity | null;
}

export function HypeModal({ isOpen, onClose, event }: HypeModalProps) {
    const { showToast } = useToast();
    const [hypeText, setHypeText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Generate mock hype text when modal opens
    useEffect(() => {
        if (isOpen && event) {
            setIsGenerating(true);
            setHypeText("");
            setCopied(false);

            setTimeout(() => {
                const categoryTags = event.categories?.length ? event.categories.map(c => `#${c.replace(/\s+/g, '')}`).join(' ') : '#EventaSL';
                const text = `🚨 FREEEEEETOWN! 🚨 Who is ready for ${event.title} at ${event.location} on ${event.date}?! 🔥 The energy is going to be unmatched! You don't want to miss this one. Get your tickets NOW on Eventa before it's too late! 🎟️🇸🇱 #EventaSL ${categoryTags}`;
                setHypeText(text);
                setIsGenerating(false);
            }, 1500);
        }
    }, [isOpen, event]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(hypeText);
        setCopied(true);
        showToast("Copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    if (!event) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="AI Hype Generator ✨"
            maxWidth="md"
        >
            <div className="space-y-6">
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100 min-h-[140px] flex items-center justify-center">
                    {isGenerating ? (
                        <div className="flex gap-1.5 items-center text-purple-600">
                            <span className="text-sm font-medium mr-2">Cooking up some hype</span>
                            <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200"></span>
                        </div>
                    ) : (
                        <p className="text-gray-800 text-sm italic leading-relaxed whitespace-pre-wrap">
                            "{hypeText}"
                        </p>
                    )}
                </div>

                <Button
                    onClick={copyToClipboard}
                    disabled={isGenerating || !hypeText}
                    variant="primary"
                    className="w-full !bg-purple-600 hover:!bg-purple-700 !shadow-purple-500/20"
                >
                    {copied ? (
                        <>
                            <Check size={18} className="mr-2" /> Copied!
                        </>
                    ) : (
                        <>
                            <Copy size={18} className="mr-2" /> Copy to Clipboard
                        </>
                    )}
                </Button>
            </div>
        </Modal>
    );
}
