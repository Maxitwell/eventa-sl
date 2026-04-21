"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/components/shared/ToastProvider";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Calendar, Clock, MapPin, Tag, Briefcase, Camera, Image as ImageIcon, X, Map, Users, Plus, Trash2, Ticket, Info, Wallet, Phone, Mail, MessageCircle, Instagram, Twitter, Globe, Facebook, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Cropper, { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import imageCompression from "browser-image-compression";
import { getEventById, updateEvent, EventEntity } from "@/lib/db";

export default function EditEvent() {
    const { isLoggedIn, currentUser } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const params = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [originalEvent, setOriginalEvent] = useState<EventEntity | null>(null);

    const [eventType, setEventType] = useState<"physical" | "online">("physical");

    // Form State
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Music & Arts");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");
    const [location, setLocation] = useState("");
    const [googleMapLink, setGoogleMapLink] = useState("");
    const [description, setDescription] = useState("");
    const [organizerName, setOrganizerName] = useState("");
    const [talents, setTalents] = useState<{ id: string; name: string; role: string }[]>([]);

    // Ticketing State
    const [isFreeEvent, setIsFreeEvent] = useState(false);
    const [tickets, setTickets] = useState<any[]>([]);

    // Payout State
    const [payoutDetails, setPayoutDetails] = useState({
        method: "Orange Money",
        accountName: "",
        accountNumber: ""
    });

    // Contact State
    const [contactSocials, setContactSocials] = useState({
        website: "",
        instagram: "",
        facebook: "",
        twitter: "",
        email: "",
        phone: "",
        whatsapp: "",
    });

    // Image Cropping State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Parse "Dec 20" logic reverse (simplified back to localDate strings)
    // Note: Since we stored a formatted date string like "Dec 20", converting it exactly back to input type="date"
    // is tricky without the year. For robust apps, store IsoString. This MVP will just use string value in the picker if possible,
    // or we might lose the year. In a real app, `date` should be stored as YYYY-MM-DD.
    // For now we will let the organizer re-pick if they need to change it, or we try to map it.

    useEffect(() => {
        if (!isLoggedIn && typeof window !== "undefined") {
            router.push("/login?redirect=/events/" + params.id + "/edit");
            return;
        }

        const fetchEvent = async () => {
            try {
                if (!params.id) return;
                const fetchedEvent = await getEventById(params.id as string);
                if (fetchedEvent) {
                    if (fetchedEvent.organizerId !== currentUser?.id) {
                        showToast("You are not authorized to edit this event.", "error");
                        router.push("/dashboard");
                        return;
                    }
                    setOriginalEvent(fetchedEvent);

                    // Hydrate State
                    setTitle(fetchedEvent.title);
                    setCategory(fetchedEvent.categories?.[0] || "Music");
                    // Assuming date was stored as 'Jan 15', input type="date" needs yyyy-mm-dd
                    // We'll leave it blank or let user overwrite unless they provide a valid ISO string.
                    // If we had stored YYYY-MM-DD, we'd do: setDate(fetchedEvent.date);
                    // For the sake of this prototype, we'll ask them to re-confirm date if they edit.
                    setTime(fetchedEvent.time);
                    setEndDate(fetchedEvent.endDate || "");
                    setEndTime(fetchedEvent.endTime || "");
                    setLocation(fetchedEvent.location);
                    setGoogleMapLink(fetchedEvent.googleMapLink || "");
                    setDescription(fetchedEvent.description || "");
                    setOrganizerName(fetchedEvent.organizerName || "");
                    setTalents(fetchedEvent.talents?.map((t, idx) => ({ id: idx.toString(), ...t })) || []);

                    if (fetchedEvent.price === 0 && (!fetchedEvent.tickets || fetchedEvent.tickets.length === 0)) {
                        setIsFreeEvent(true);
                    } else {
                        setIsFreeEvent(false);
                        setTickets(fetchedEvent.tickets || [
                            { id: Date.now().toString(), name: "Regular Admission", quantity: 100, price: fetchedEvent.price, isPrivate: false, description: "" }
                        ]);
                    }

                    if (fetchedEvent.payoutDetails) {
                        setPayoutDetails(fetchedEvent.payoutDetails as any);
                    }
                    if (fetchedEvent.contactSocials) {
                        setContactSocials(fetchedEvent.contactSocials as any);
                    }

                    setImagePreview(fetchedEvent.image || null);

                    // Guess Event Type
                    if (fetchedEvent.location.startsWith("http")) {
                        setEventType("online");
                    } else {
                        setEventType("physical");
                    }

                } else {
                    showToast("Event not found.", "error");
                    router.push("/dashboard");
                }
            } catch (error) {
                console.error("Failed to fetch event:", error);
                showToast("Failed to load event for editing.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser) {
            fetchEvent();
        }
    }, [isLoggedIn, params.id, currentUser, router]);

    if (!isLoggedIn) {
        return null; // Next.js will redirect
    }

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading event editor...</p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Validation ... (same as before)
        if (!title || !time || !location || !description || !organizerName) {
            showToast("Please fill in all required fields.", "error");
            setIsSaving(false);
            return;
        }

        if (!isFreeEvent && tickets.length === 0) {
            showToast("Please add at least one ticket tier.", "error");
            setIsSaving(false);
            return;
        }

        let computedCapacity = 0;
        let minPrice = -1;

        if (!isFreeEvent) {
            for (const t of tickets) {
                if (!t.name || t.quantity <= 0) {
                    showToast("All tickets must have a name and quantity greater than 0.", "error");
                    setIsSaving(false);
                    return;
                }
                computedCapacity += t.quantity;
                if (!t.isPrivate) {
                    if (minPrice === -1 || t.price < minPrice) {
                        minPrice = t.price;
                    }
                }
            }
        }

        if (computedCapacity <= 0 && !isFreeEvent) {
            showToast("Total event capacity must be greater than 0.", "error");
            setIsSaving(false);
            return;
        }

        if (isFreeEvent) { computedCapacity = 1000; minPrice = 0; }
        if (minPrice === -1) minPrice = 0;

        try {
            let imageUrl = originalEvent?.image || "";

            if (imageFile) {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                try {
                    const compressedFile = await imageCompression(imageFile, options);
                    const storageRef = ref(storage, `events/${currentUser?.id}/${Date.now()}_${compressedFile.name}`);
                    const snapshot = await uploadBytes(storageRef, compressedFile);
                    imageUrl = await getDownloadURL(snapshot.ref);
                } catch (compressionError) {
                    console.error("Image compression failed, using original size...", compressionError);
                    const storageRef = ref(storage, `events/${currentUser?.id}/${Date.now()}_${imageFile.name}`);
                    const snapshot = await uploadBytes(storageRef, imageFile);
                    imageUrl = await getDownloadURL(snapshot.ref);
                }
            }

            let finalDate = originalEvent?.date;
            if (date) {
                const dateObj = new Date(date);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                finalDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate().toString().padStart(2, '0')}`;
            }

            await updateEvent(params.id as string, {
                title,
                date: finalDate, // Might be undefined if not re-selected, fallback to original inside
                time,
                endDate,
                endTime,
                location,
                googleMapLink,
                price: minPrice,
                currency: "NLe",
                image: imageUrl,
                categories: [category],
                organizerName: organizerName,
                totalCapacity: computedCapacity,
                description: description,
                talents: talents.map(({ name, role }) => ({ name, role })),
                tickets: isFreeEvent ? [] : tickets,
                payoutDetails: isFreeEvent ? null : payoutDetails,
                contactSocials: contactSocials
            });

            showToast("Event updated successfully!", "success");
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            showToast("Failed to update event. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast("Image size should be less than 5MB", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = "";
    };

    const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropImage = async () => {
        try {
            if (uploadedImage && croppedAreaPixels) {
                const croppedFile = await getCroppedImg(uploadedImage, croppedAreaPixels);
                if (croppedFile) {
                    setImageFile(croppedFile);
                    setImagePreview(URL.createObjectURL(croppedFile));
                }
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to crop image", "error");
        } finally {
            setShowCropper(false);
        }
    };

    const handleAddTalent = () => {
        if (talents.length < 20) {
            setTalents([...talents, { id: Date.now().toString(), name: "", role: "" }]);
        } else {
            showToast("Maximum 20 line up members allowed.", "error");
        }
    };

    const handleRemoveTalent = (idToRemove: string) => {
        setTalents(talents.filter(t => t.id !== idToRemove));
    };

    const handleTalentChange = (id: string, field: "name" | "role", value: string) => {
        setTalents(talents.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleAddTicket = () => {
        setTickets([...tickets, { id: Date.now().toString(), name: "", quantity: 100, price: 0, isPrivate: false, description: "" }]);
    };

    const handleRemoveTicket = (idToRemove: string) => {
        setTickets(tickets.filter(t => t.id !== idToRemove));
    };

    const handleTicketChange = (id: string, field: string, value: any) => {
        setTickets(tickets.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Edit Event
                </h1>
                <p className="text-gray-500 mt-2">
                    Update the details below to reflect changes to your event.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                {/* ... existing form structure ... */}
                <div className="p-8 sm:p-12 space-y-10">
                    {/* Top Toggles */}
                    <div className="flex flex-col sm:flex-row gap-6 mb-8 justify-center">
                        <div className="bg-gray-50 p-2 rounded-2xl flex border border-gray-100 max-w-sm mx-auto sm:mx-0 w-full">
                            <button
                                type="button"
                                onClick={() => setEventType("physical")}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${eventType === "physical"
                                    ? "bg-white text-orange-600 shadow-sm border border-gray-200"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Physical Event
                            </button>
                            <button
                                type="button"
                                onClick={() => setEventType("online")}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${eventType === "online"
                                    ? "bg-white text-orange-600 shadow-sm border border-gray-200"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Online Event
                            </button>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Tag size={20} className="text-orange-500" /> Basic Details
                        </h3>

                        {/* Banner Upload area */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Event Banner</label>
                            <label className="h-56 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl relative group cursor-pointer hover:bg-gray-100 transition-colors block overflow-hidden">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />

                                {imagePreview ? (
                                    <div className="absolute inset-0 w-full h-full">
                                        <img src={imagePreview} alt="Event Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/90 px-4 py-2 rounded-full font-semibold text-gray-900 flex items-center gap-2">
                                                <Camera size={18} /> Change Banner
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                            <ImageIcon size={24} className="text-gray-500" />
                                        </div>
                                        <p className="font-bold text-gray-700">Upload Event Banner</p>
                                        <p className="text-xs mt-1 max-w-xs text-center">
                                            Recommended size: 1920x1080px (16:9). Max 5MB.
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Event Title"
                                placeholder="e.g. Salone Afrobeats Festival '26"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    className="form-input min-h-[120px] resize-y"
                                    placeholder="Tell people what your event is about..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                ></textarea>
                            </div>

                            <Input
                                label="Organizer (Who is Hosting)"
                                placeholder="e.g. Freetown Events Co."
                                value={organizerName}
                                onChange={(e) => setOrganizerName(e.target.value)}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <select
                                        className="form-input !pl-11 appearance-none bg-white"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Music">Music</option>
                                        <option value="Comedy">Comedy</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Religion">Religion</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Business">Business</option>
                                        <option value="Art & Culture">Art & Culture</option>
                                        <option value="Food and Drink">Food and Drink</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Location */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <MapPin size={20} className="text-orange-500" /> When & Where
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {eventType === "physical" ? (
                                <Input
                                    label="Venue / Location"
                                    placeholder="e.g. Country Lodge, Hill Station"
                                    icon={<MapPin size={16} />}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    required
                                />
                            ) : (
                                <Input
                                    label="Stream Link"
                                    placeholder="e.g. https://zoom.us/j/12345678"
                                    icon={<MapPin size={16} />}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    required
                                />
                            )}
                            {eventType === "physical" && (
                                <Input
                                    label="Google Map Link (Optional)"
                                    placeholder="e.g. https://maps.app.goo.gl/..."
                                    icon={<Map size={16} />}
                                    value={googleMapLink}
                                    onChange={(e) => setGoogleMapLink(e.target.value)}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Prev: {originalEvent?.date})</label>
                                <Input
                                    type="date"
                                    icon={<Calendar size={16} />}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (AM/PM)</label>
                                <Input
                                    type="time"
                                    icon={<Clock size={16} />}
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                                <Input
                                    type="date"
                                    icon={<Calendar size={16} />}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time (AM/PM) (Optional)</label>
                                <Input
                                    type="time"
                                    icon={<Clock size={16} />}
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Talent and Line up */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-orange-500" /> Talent and Line up
                            </h3>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddTalent} className="gap-2">
                                <Plus size={16} /> Add Person
                            </Button>
                        </div>

                        {talents.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-sm text-gray-500">No talents added yet. Add presenters or co-hosts.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {talents.map((talent, index) => (
                                    <div key={talent.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex-1 w-full">
                                            <Input
                                                label={`Name ${index + 1}`}
                                                placeholder="e.g. John Doe"
                                                value={talent.name}
                                                onChange={(e) => handleTalentChange(talent.id, "name", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <Input
                                                label={`Role ${index + 1}`}
                                                placeholder="e.g. Presenter, DJ"
                                                value={talent.role}
                                                onChange={(e) => handleTalentChange(talent.id, "role", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTalent(talent.id)}
                                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 sm:mb-1 w-full sm:w-auto flex justify-center border border-red-100 sm:border-transparent"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ticketing & Capacity */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Ticket size={20} className="text-orange-500" /> Tickets
                            </h3>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">Is this a free event?</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isFreeEvent}
                                        onChange={(e) => setIsFreeEvent(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>
                        </div>

                        {(originalEvent?.ticketsSold || 0) > 0 && (
                            <div className="flex items-center gap-2 bg-[#fffbeb] text-[#d97706] p-3 rounded-xl text-sm border border-[#fde68a]">
                                <Info size={16} className="shrink-0" />
                                Tickets have already been sold. Be careful when updating quantities or prices to avoid billing issues.
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 p-3 rounded-xl text-sm border border-blue-200">
                            <Info size={16} className="shrink-0" />
                            An 8% transaction fee applies to all paid tickets.
                        </div>

                        {!isFreeEvent && (
                            <div className="space-y-6">
                                {tickets.map((ticket, index) => (
                                    <div key={ticket.id} className="p-6 border border-gray-200 rounded-2xl bg-white space-y-4 shadow-sm relative group">
                                        {tickets.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTicket(ticket.id)}
                                                className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}

                                        <div className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="flex-1 w-full">
                                                <Input
                                                    label="TICKET NAME"
                                                    placeholder="Regular Admission"
                                                    value={ticket.name}
                                                    onChange={(e) => handleTicketChange(ticket.id, "name", e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="w-full md:w-32">
                                                <Input
                                                    type="number"
                                                    label="QUANTITY"
                                                    placeholder="100"
                                                    value={ticket.quantity || ""}
                                                    onChange={(e) => handleTicketChange(ticket.id, "quantity", Number(e.target.value))}
                                                    required
                                                    min="1"
                                                />
                                            </div>
                                            <div className="w-full md:w-40">
                                                <Input
                                                    type="number"
                                                    label="PRICE (SLE)"
                                                    placeholder="0"
                                                    value={ticket.price || ""}
                                                    onChange={(e) => handleTicketChange(ticket.id, "price", Number(e.target.value))}
                                                    required
                                                    min="0"
                                                />
                                            </div>
                                            <div className="w-full md:w-32 flex flex-col justify-end pb-3">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">INVITE ONLY</label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 bg-white"
                                                        checked={ticket.isPrivate}
                                                        onChange={(e) => handleTicketChange(ticket.id, "isPrivate", e.target.checked)}
                                                    />
                                                    <span className="text-sm text-gray-600 font-medium">Private</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">DESCRIPTION / PERKS</label>
                                            <Input
                                                placeholder="e.g. Includes entry, parking, and one drink"
                                                value={ticket.description}
                                                onChange={(e) => handleTicketChange(ticket.id, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleAddTicket}
                                    className="flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 transition-colors py-2"
                                >
                                    <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center">
                                        <Plus size={14} />
                                    </div>
                                    Add another ticket type
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Payout Details */}
                    {!isFreeEvent && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Wallet size={20} className="text-orange-500" /> Payout Details
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Where should we send your earnings after ticket sales begin?
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                    <select
                                        className="form-input appearance-none bg-white w-full border-gray-200 rounded-xl"
                                        value={payoutDetails.method}
                                        onChange={(e) => setPayoutDetails({ ...payoutDetails, method: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select your bank...</option>
                                        <option value="Orange Money">Orange Money</option>
                                        <option value="Afrimoney">Afrimoney</option>
                                        <option value="Sierra Leone Commercial Bank (SLCB)">SLCB</option>
                                        <option value="Rokel Commercial Bank">Rokel Commercial Bank</option>
                                        <option value="Guaranty Trust Bank (GTBank)">GTBank</option>
                                        <option value="Ecobank Sierra Leone">Ecobank</option>
                                        <option value="Zenith Bank">Zenith Bank</option>
                                        <option value="United Bank for Africa (UBA)">UBA</option>
                                        <option value="Access Bank">Access Bank</option>
                                        <option value="First International Bank (FIBank)">FIBank</option>
                                        <option value="Keystone Bank">Keystone Bank</option>
                                        <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                                        <option value="Other Bank">Other Bank...</option>
                                    </select>
                                </div>
                                <Input
                                    label="Account Number"
                                    placeholder="e.g. 0011223344"
                                    value={payoutDetails.accountNumber}
                                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountNumber: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Account Name"
                                    placeholder="e.g. John Doe"
                                    value={payoutDetails.accountName}
                                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Contact & Socials */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Phone size={20} className="text-orange-500" /> Contact & Socials
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Add links to your pages so attendees can learn more about you or reach out.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Website"
                                type="url"
                                placeholder="https://yourwebsite.com"
                                icon={<Globe size={16} />}
                                value={contactSocials.website}
                                onChange={(e) => setContactSocials({ ...contactSocials, website: e.target.value })}
                            />
                            <Input
                                label="Instagram"
                                placeholder="https://instagram.com/yourhandle"
                                icon={<Instagram size={16} />}
                                value={contactSocials.instagram}
                                onChange={(e) => setContactSocials({ ...contactSocials, instagram: e.target.value })}
                            />
                            <Input
                                label="Facebook"
                                placeholder="https://facebook.com/yourpage"
                                icon={<Facebook size={16} />}
                                value={contactSocials.facebook}
                                onChange={(e) => setContactSocials({ ...contactSocials, facebook: e.target.value })}
                            />
                            <Input
                                label="X (Twitter)"
                                placeholder="https://twitter.com/yourhandle"
                                icon={<Twitter size={16} />}
                                value={contactSocials.twitter}
                                onChange={(e) => setContactSocials({ ...contactSocials, twitter: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Action */}

                    <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="px-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSaving}
                            className="px-12"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>

            {/* Cropper Modal */}
            {showCropper && uploadedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10 bg-white">
                            <h3 className="font-bold text-gray-900">Crop Event Banner</h3>
                            <button onClick={() => setShowCropper(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 relative bg-gray-900">
                            <Cropper
                                image={uploadedImage}
                                crop={crop}
                                zoom={zoom}
                                aspect={16 / 9}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="p-4 sm:p-6 bg-white border-t border-gray-100">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => {
                                        setZoom(Number(e.target.value))
                                    }}
                                    className="w-full accent-orange-500 cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowCropper(false)}>Cancel</Button>
                                <Button onClick={handleCropImage}>Crop & Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
