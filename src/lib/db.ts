import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

type EventStatus = "draft" | "published" | "cancelled" | "paused";
type TicketStatus =
  | "valid"
  | "used"
  | "refunded"
  | "pending_payment"
  | "failed_payment";

export interface EventTicketTier {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isPrivate: boolean;
  description: string;
}

export interface EventEntity {
  id: string;
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
  status: EventStatus;
  createdAt: string;
  totalCapacity: number;
  ticketsSold: number;
  description?: string;
  googleMapLink?: string;
  endDate?: string;
  endTime?: string;
  talents?: { name: string; role: string }[];
  tickets?: EventTicketTier[];
  payoutDetails?: { method: string; accountName: string; accountNumber: string } | null;
  contactSocials?: {
    email: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    twitter: string;
    website: string;
    facebook: string;
  };
  doorPin?: string;
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
  status: TicketStatus;
  pricePaid: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: "attendee" | "organizer";
  phoneNumber?: string;
  savedEvents?: string[];
  createdAt: string;
}

const eventsRef = collection(db, "events");
const ticketsRef = collection(db, "tickets");

export interface OrderEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  depositId: string;
  eventId: string;
}

export async function getAllEventsAdmin(): Promise<EventEntity[]> {
  try {
    const snapshot = await getDocs(eventsRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EventEntity);
  } catch (error) {
    console.error("Error fetching all events for admin:", error);
    return [];
  }
}

export async function getAllOrdersAdmin(): Promise<OrderEntity[]> {
  try {
    const snapshot = await getDocs(collection(db, "orders"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderEntity));
  } catch(err) {
    console.error(err);
    return [];
  }
}

function generateDoorPin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

export async function getPublishedEvents(): Promise<EventEntity[]> {
  try {
    const q = query(eventsRef, where("status", "==", "published"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EventEntity);
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getPublishedEventsPaginated(
  lastVisibleDoc: unknown = null,
  limitCount = 15
): Promise<{ events: EventEntity[]; lastVisible: unknown; hasMore: boolean }> {
  try {
    const base = [where("status", "==", "published"), limit(limitCount)] as const;
    const q = lastVisibleDoc
      ? query(eventsRef, where("status", "==", "published"), startAfter(lastVisibleDoc), limit(limitCount))
      : query(eventsRef, ...base);
    const snapshot = await getDocs(q);
    return {
      events: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EventEntity),
      lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
      hasMore: snapshot.docs.length === limitCount,
    };
  } catch (error) {
    console.error("Error fetching paginated events:", error);
    return { events: [], lastVisible: null, hasMore: false };
  }
}

export async function getEventById(eventId: string): Promise<EventEntity | null> {
  try {
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) return null;
    return { id: eventSnap.id, ...eventSnap.data() } as EventEntity;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

export async function getUserTickets(userId: string): Promise<TicketEntity[]> {
  try {
    const q = query(ticketsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TicketEntity);
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return [];
  }
}

export async function getOrganizerEvents(organizerId: string): Promise<EventEntity[]> {
  try {
    const q = query(eventsRef, where("organizerId", "==", organizerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EventEntity);
  } catch (error) {
    console.error("Error fetching organizer events:", error);
    return [];
  }
}

export async function createEvent(
  eventData: Omit<EventEntity, "id" | "createdAt" | "ticketsSold" | "doorPin">
): Promise<string> {
  const payload = {
    ...eventData,
    createdAt: new Date().toISOString(),
    ticketsSold: 0,
    doorPin: generateDoorPin(),
  };
  const docRef = await addDoc(eventsRef, payload);
  return docRef.id;
}

export async function updateEvent(
  eventId: string,
  eventData: Partial<Omit<EventEntity, "id" | "organizerId" | "createdAt">>
): Promise<void> {
  try {
    const ref = doc(db, "events", eventId);
    const cleaned = Object.fromEntries(
      Object.entries(eventData).filter(([, value]) => value !== undefined)
    );
    await updateDoc(ref, cleaned);
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

export async function updateEventStatus(eventId: string, status: EventStatus): Promise<void> {
  try {
    await updateDoc(doc(db, "events", eventId), { status });
  } catch (error) {
    console.error("Error updating event status:", error);
    throw error;
  }
}

export async function createTicket(
  ticketData: Omit<TicketEntity, "id">
): Promise<string> {
  const docRef = await addDoc(ticketsRef, ticketData);
  return docRef.id;
}

export async function getTicketById(ticketId: string): Promise<TicketEntity | null> {
  try {
    const ticketSnap = await getDoc(doc(db, "tickets", ticketId));
    if (!ticketSnap.exists()) return null;
    return { id: ticketSnap.id, ...ticketSnap.data() } as TicketEntity;
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return null;
  }
}

export async function validateTicket(
  ticketId: string,
  organizerId: string
): Promise<{ success: boolean; message: string; ticket?: TicketEntity }> {
  try {
    return await runTransaction(db, async (transaction) => {
      const ticketRef = doc(db, "tickets", ticketId);
      const ticketDoc = await transaction.get(ticketRef);
      if (!ticketDoc.exists()) {
        return { success: false, message: "Ticket not found." };
      }

      const ticket = ticketDoc.data() as TicketEntity;
      const eventRef = doc(db, "events", ticket.eventId);
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        return { success: false, message: "Associated event not found." };
      }

      const event = eventDoc.data() as EventEntity;
      if (event.organizerId !== organizerId) {
        return {
          success: false,
          message: "Unauthorized. You are not the organizer of this event.",
        };
      }

      if (ticket.status === "used") {
        return {
          success: false,
          message: "Ticket has already been used.",
          ticket: { ...ticket, id: ticketDoc.id },
        };
      }
      if (ticket.status !== "valid") {
        return { success: false, message: `Ticket is ${ticket.status}.` };
      }

      transaction.update(ticketRef, { status: "used", usedAt: new Date().toISOString() });
      return {
        success: true,
        message: "Ticket successfully validated!",
        ticket: { ...ticket, id: ticketDoc.id, status: "used" },
      };
    });
  } catch (error) {
    console.error("Error validating ticket:", error);
    return { success: false, message: "An error occurred during validation." };
  }
}

export async function linkGuestTickets(guestEmail: string, newUid: string): Promise<void> {
  try {
    const q = query(ticketsRef, where("userId", "==", `guest_${guestEmail}`));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { userId: newUid }));
    await batch.commit();
  } catch (error) {
    console.error("Error linking guest tickets:", error);
  }
}

export async function getUserProfile(uid: string): Promise<UserEntity | null> {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return null;
    return { id: userSnap.id, ...userSnap.data() } as UserEntity;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function toggleSavedEvent(
  userId: string,
  eventId: string,
  isSaving: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      savedEvents: isSaving ? arrayUnion(eventId) : arrayRemove(eventId),
    });
  } catch (error) {
    console.error("Error toggling saved event:", error);
  }
}

export async function getEventsByIds(eventIds: string[]): Promise<EventEntity[]> {
  if (!eventIds.length) return [];
  try {
    const result: EventEntity[] = [];
    const chunkSize = 10;
    for (let i = 0; i < eventIds.length; i += chunkSize) {
      const chunk = eventIds.slice(i, i + chunkSize);
      const q = query(eventsRef, where(documentId(), "in", chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        result.push({ id: d.id, ...d.data() } as EventEntity);
      });
    }
    return result;
  } catch (error) {
    console.error("Error fetching saved events:", error);
    return [];
  }
}
