"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/store/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/ToastProvider";
import { getUserTickets, TicketEntity } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Edit2, LogOut, Ticket as TicketIcon, Calendar, MapPin, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Profile() {
    const { currentUser, isLoggedIn, logout, updateProfile } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [tickets, setTickets] = useState<TicketEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    useEffect(() => {
        if (!isLoggedIn && typeof window !== "undefined") {
            router.push("/login?redirect=/profile");
            return;
        }

        if (currentUser) {
            setEditName(currentUser.name);
            fetchUserTickets();
        }
    }, [isLoggedIn, currentUser, router]);

    const fetchUserTickets = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const userTickets = await getUserTickets(currentUser.id);
            // Sort by purchase date
            userTickets.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
            setTickets(userTickets);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            showToast("Failed to load your tickets.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            showToast("Name cannot be empty", "error");
            return;
        }
        setIsSaving(true);
        try {
            await updateProfile(editName, currentUser?.avatar);
            showToast("Profile updated successfully!", "success");
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            showToast("Failed to update profile", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast("Image must be less than 2MB", "error");
            return;
        }

        setIsUploadingImage(true);
        try {
            const storageRef = ref(storage, `avatars/${currentUser.id}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            await updateProfile(currentUser.name, downloadUrl);
            showToast("Profile picture updated!", "success");
        } catch (error) {
            console.error("Error uploading image:", error);
            showToast("Failed to upload image", "error");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    if (!isLoggedIn || !currentUser) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row gap-8">

                {/* Profile Settings Sidebar */}
                <div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className="relative group mb-4">
                            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-md flex items-center justify-center relative">
                                {currentUser.avatar ? (
                                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-gray-400">{currentUser.name.charAt(0).toUpperCase()}</span>
                                )}

                                {isUploadingImage && (
                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm">
                                        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="absolute bottom-0 right-0 bg-gray-900 text-white p-2 rounded-full shadow-lg hover:bg-orange-500 transition-colors disabled:opacity-50"
                            >
                                <Camera size={14} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {isEditing ? (
                            <div className="w-full space-y-3 mt-2">
                                <Input
                                    placeholder="Your Name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="text-center"
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => { setIsEditing(false); setEditName(currentUser.name); }}>Cancel</Button>
                                    <Button className="flex-1" onClick={handleSaveProfile} isLoading={isSaving}>Save</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 justify-center">
                                    {currentUser.name}
                                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-orange-500 transition">
                                        <Edit2 size={14} />
                                    </button>
                                </h2>
                                <p className="text-sm text-gray-500">{currentUser.email}</p>
                            </>
                        )}

                        <div className="w-full border-t border-gray-100 mt-6 pt-6 flex flex-col gap-2">
                            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-orange-50 text-orange-600 font-semibold">
                                <UserIcon size={18} /> Account Details
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 font-semibold hover:bg-red-50 transition"
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area - Tickets */}
                <div className="w-full md:w-2/3 lg:w-3/4">
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                        <TicketIcon className="text-orange-500" /> My Tickets
                    </h2>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 flex gap-6 animate-pulse">
                                    <div className="w-24 h-24 bg-gray-200 rounded-xl"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-6 w-1/2 bg-gray-200 rounded"></div>
                                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 border border-gray-100 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-4">
                                <TicketIcon size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No tickets yet</h3>
                            <p className="text-gray-500 mb-6 max-w-sm">
                                You haven't snagged any tickets for upcoming events yet. Time to change that!
                            </p>
                            <Button onClick={() => router.push('/')}>
                                Browse Events
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-row items-center gap-5 hover:border-orange-200 transition-colors">
                                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                                        <TicketIcon className="text-gray-400" size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-gray-900 truncate mb-1">
                                            {ticket.eventName}
                                        </h4>
                                        <div className="flex items-center text-sm text-gray-500 gap-3 mb-2">
                                            <span className="flex items-center gap-1 shrink-0"><Calendar size={14} className="text-orange-500" /> {ticket.date}</span>
                                            <span className="flex items-center gap-1 truncate"><MapPin size={14} className="text-orange-500" /> {ticket.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                            <span className="text-xs font-semibold text-gray-400">ID: {ticket.id.slice(0, 8).toUpperCase()}</span>
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-sm">
                                                {ticket.ticketType.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
