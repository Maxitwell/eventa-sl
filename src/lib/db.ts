import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, addDoc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Types
export interface EventEntity {
    id: string; // Document ID
    title: string;
    date: string;
    time: string;
    location: string;
    price: number;
    currency: string;
    image: string;
    categories: string[];
    featured?: boolean;
    sellingFast?: boolean;
    organizerId: string;
    organizerName?: string;
    status: "draft" | "published" | "cancelled" | "paused";
    createdAt: string;
    totalCapacity: number;
    ticketsSold: number;
    description?: string;
    googleMapLink?: string;
    endDate?: string;
    endTime?: string;
    talents?: { name: string; role: string }[];
    tickets?: EventTicketTier[];
    payoutDetails?: { method: string; accountName: string; accountNumber: string };
    contactSocials?: { email: string; phone: string; whatsapp: string; instagram: string; twitter: string; website: string; facebook: string };
}

export interface EventTicketTier {
    id: string;
    name: string;
    quantity: number;
    price: number;
    isPrivate: boolean;
    description: string;
}

export interface TicketEntity {
    id: string;
    eventId: string;
    userId: string;
    eventName: string;
    ticketType: string;
    date: string;
    time: string;
    location: string;
    purchaseDate: string;
    qrCode: string;
    status: "valid" | "used" | "refunded";
    pricePaid: number;
}

// Data Fetching Helpers

/**
 * Fetch all published events from Firestore (Original - non-paginated)
 */
export async function getPublishedEvents(): Promise<EventEntity[]> {
    try {
        const eventsRef = collection(db, "events");
        const q = query(
            eventsRef,
            where("status", "==", "published"),
            // orderBy("date", "asc") // Note: requires an index to be built in Firebase console
        );

        const querySnapshot = await getDocs(q);
        const events: EventEntity[] = [];

        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() } as EventEntity);
        });

        return events;
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
}

/**
 * Fetch published events with Pagination
 */
export async function getPublishedEventsPaginated(lastVisibleDoc: any = null, limitCount: number = 15): Promise<{ events: EventEntity[], lastVisible: any, hasMore: boolean }> {
    try {
        const eventsRef = collection(db, "events");
        let q = query(
            eventsRef,
            where("status", "==", "published"),
            // orderBy("createdAt", "desc"), // Requires index if combined with where filter
            limit(limitCount)
        );

        // If we have a cursor, start after it
        /* Need to import startAfter from firebase/firestore if using this
        if (lastVisibleDoc) {
            q = query(q, startAfter(lastVisibleDoc));
        }
        */
        // For simple cursor-less simulated pagination on the client, we might just fetch all for now
        // But to do true Firestore pagination:
        const { startAfter } = await import("firebase/firestore");

        let paginatedQuery = query(
            eventsRef,
            where("status", "==", "published"),
            // orderBy("createdAt", "desc"), // Ensure index exists
            limit(limitCount)
        );

        if (lastVisibleDoc) {
            paginatedQuery = query(
                eventsRef,
                where("status", "==", "published"),
                // orderBy("createdAt", "desc"),
                startAfter(lastVisibleDoc),
                limit(limitCount)
            );
        }

        const querySnapshot = await getDocs(paginatedQuery);
        const events: EventEntity[] = [];

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const hasMore = querySnapshot.docs.length === limitCount;

        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() } as EventEntity);
        });

        return { events, lastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching paginated events:", error);
        return { events: [], lastVisible: null, hasMore: false };
    }
}

/**
 * Fetch a single event by its Document ID
 */
export async function getEventById(eventId: string): Promise<EventEntity | null> {
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
            return { id: eventSnap.id, ...eventSnap.data() } as EventEntity;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
        return null;
    }
}

/**
 * Fetch tickets belonging to a specific user UID
 */
export async function getUserTickets(userId: string): Promise<TicketEntity[]> {
    try {
        const ticketsRef = collection(db, "tickets");
        const q = query(
            ticketsRef,
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const tickets: TicketEntity[] = [];

        querySnapshot.forEach((doc) => {
            tickets.push({ id: doc.id, ...doc.data() } as TicketEntity);
        });

        return tickets;
    } catch (error) {
        console.error("Error fetching user tickets:", error);
        return [];
    }
}

/**
 * Fetch all events matching a specific organizer ID
 */
export async function getOrganizerEvents(organizerId: string): Promise<EventEntity[]> {
    try {
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("organizerId", "==", organizerId));
        const querySnapshot = await getDocs(q);

        const events: EventEntity[] = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() } as EventEntity);
        });

        return events;
    } catch (error) {
        console.error("Error fetching organizer events:", error);
        return [];
    }
}

/**
 * Helper to register a newly created event (Organizer flow)
 */
export async function createEvent(eventData: Omit<EventEntity, "id" | "createdAt" | "ticketsSold">) {
    try {
        const eventsRef = collection(db, "events");
        const newEvent = {
            ...eventData,
            createdAt: new Date().toISOString(),
            ticketsSold: 0
        };
        const docRef = await addDoc(eventsRef, newEvent);
        return docRef.id;
    } catch (error) {
        console.error("Error creating event:", error);
        throw error;
    }
}

/**
 * Helper to register a newly purchased ticket safely using a Transaction
 */
export async function createTicket(ticketData: Omit<TicketEntity, "id">) {
    try {
        const docId = await runTransaction(db, async (transaction) => {
            // 1. Read the event document
            const eventRef = doc(db, "events", ticketData.eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists()) {
                throw new Error("Event does not exist!");
            }

            const event = eventDoc.data() as EventEntity;

            // 2. Business Logic Checks
            if (event.totalCapacity > 0 && event.ticketsSold >= event.totalCapacity) {
                throw new Error("Event is sold out!");
            }

            // 3. Write Operations
            // Increment ticketsSold on the Event
            transaction.update(eventRef, {
                ticketsSold: event.ticketsSold + 1
            });

            // Create the Ticket document
            const newTicketRef = doc(collection(db, "tickets"));
            transaction.set(newTicketRef, ticketData);

            return newTicketRef.id;
        });

        return docId;
    } catch (error) {
        console.error("Error creating ticket transaction:", error);
        throw error;
    }
}

/**
 * Helper to update an existing event
 */
export async function updateEvent(eventId: string, eventData: Partial<Omit<EventEntity, "id" | "createdAt" | "ticketsSold" | "organizerId">>) {
    try {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, eventData);
    } catch (error) {
        console.error("Error updating event:", error);
        throw error;
    }
}

/**
 * Helper to update an event's status (published, paused, cancelled)
 */
export async function updateEventStatus(eventId: string, status: "published" | "draft" | "cancelled" | "paused") {
    try {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, { status });
    } catch (error) {
        console.error("Error updating event status:", error);
        throw error;
    }
}

/**
 * Fetch a single ticket by its ID (useful for check-in scanners)
 */
export async function getTicketById(ticketId: string): Promise<TicketEntity | null> {
    try {
        const docRef = doc(db, "tickets", ticketId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as TicketEntity;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching ticket:", error);
        return null;
    }
}

/**
 * Validates and marks a ticket as used via Transaction
 */
export async function validateTicket(ticketId: string, organizerId: string): Promise<{ success: boolean; message: string; ticket?: TicketEntity }> {
    try {
        return await runTransaction(db, async (transaction) => {
            const ticketRef = doc(db, "tickets", ticketId);
            const ticketDoc = await transaction.get(ticketRef);

            if (!ticketDoc.exists()) {
                return { success: false, message: "Ticket not found." };
            }

            const ticket = ticketDoc.data() as TicketEntity;

            // Optional: verify the organizer actually owns this event to prevent cross-scanning
            const eventRef = doc(db, "events", ticket.eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists()) {
                return { success: false, message: "Associated event not found." };
            }

            const event = eventDoc.data() as EventEntity;
            if (event.organizerId !== organizerId) {
                return { success: false, message: "Unauthorized. You are not the organizer of this event." };
            }

            if (ticket.status === "used") {
                return { success: false, message: "Ticket has already been used.", ticket: { ...ticket, id: ticketDoc.id } };
            }

            if (ticket.status === ("cancelled" as any)) {
                return { success: false, message: "Ticket was cancelled or refunded." };
            }

            // Mark as used
            transaction.update(ticketRef, { status: "used", usedAt: new Date().toISOString() });

            return {
                success: true,
                message: "Ticket successfully validated!",
                ticket: { ...ticket, id: ticketDoc.id, status: "used" }
            };
        });
    } catch (error) {
        console.error("Error validating ticket:", error);
        return { success: false, message: "An error occurred during validation." };
    }
}
