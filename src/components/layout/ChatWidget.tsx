"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Bot, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    if (pathname.startsWith("/scanner")) return null;
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "bot",
            text: "Hello! I can help you find events or plan your evening in Sierra Leone. What are you looking for ✨"
        }
    ]);
    const [input, setInput] = useState("");

    const toggleChat = () => setIsOpen(!isOpen);

    const sendMessage = () => {
        if (!input.trim()) return;

        // Add user message
        const userMsg = { id: Date.now(), sender: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        // Mock AI response
        setTimeout(() => {
            const botMsg = {
                id: Date.now() + 1,
                sender: "bot",
                text: "I can help you find tickets for that! Check out the Discover page for upcoming events."
            };
            setMessages((prev) => [...prev, botMsg]);
        }, 1000);
    };

    return (
        <>
            {/* Floating Action Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={toggleChat}
                        className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-xl z-40 flex items-center gap-2 transition-transform"
                    >
                        <Sparkles className="text-yellow-300" size={20} />
                        <span className="font-bold">AI Help</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] max-h-[calc(100dvh-8rem)] z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 shrink-0 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} />
                                <h3 className="font-bold text-sm">Eventa AI</h3>
                            </div>
                            <button
                                onClick={toggleChat}
                                className="hover:bg-white/20 rounded-full p-1 w-6 h-6 flex items-center justify-center transition-colors"
                                aria-label="Close chat"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                                >
                                    {msg.sender === "bot" && (
                                        <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                                            <Bot className="text-orange-500" size={14} />
                                        </div>
                                    )}
                                    <div
                                        className={`p-3 text-sm border shadow-sm ${msg.sender === "user"
                                                ? "bg-gray-900 text-white rounded-2xl rounded-tr-none border-gray-800"
                                                : "bg-white text-gray-700 rounded-2xl rounded-tl-none border-gray-100"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    placeholder="Ask about events..."
                                    className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="bg-orange-500 hover:bg-orange-600 transition-colors text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
