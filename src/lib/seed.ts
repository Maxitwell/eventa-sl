import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// This is the mock data structure we were previously using in `app/page.tsx`
const mockEvents = [
    {
        title: "Salone Afrobeats Festival '26",
        date: "Dec 20",
        time: "18:00",
        location: "Siaka Stevens Stadium, Freetown",
        price: 150,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1540039155732-d69288f5e6a9?q=80&w=2669&auto=format&fit=crop",
        categories: ["Music", "Festival"],
        sellingFast: true,
    },
    {
        title: "Freetown Tech Summit",
        date: "Nov 15",
        time: "09:00",
        location: "Bintumani Conference Centre",
        price: 0,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2000&auto=format&fit=crop",
        categories: ["Technology", "Business"],
        featured: true,
    },
    {
        title: "Bo Beach Party Vol. 4",
        date: "Jan 01",
        time: "14:00",
        location: "River No. 2 Beach",
        price: 50,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1533174000255-b4618e47854d?q=80&w=2670&auto=format&fit=crop",
        categories: ["Music", "Party"],
    },
    {
        title: "Sierra Leone Fashion Week",
        date: "Oct 10-12",
        time: "18:00",
        location: "The Family Kingdom",
        price: 250,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1509631179647-0c500ba14175?q=80&w=2670&auto=format&fit=crop",
        categories: ["Arts", "Fashion"],
    },
    {
        title: "Gospel Praise Night",
        date: "Nov 28",
        time: "17:00",
        location: "National Stadium Main Bowl",
        price: 0,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2673&auto=format&fit=crop",
        categories: ["Music", "Religious"],
    },
    {
        title: "Startup Pitch Competition",
        date: "Sep 05",
        time: "10:00",
        location: "Radisson Blu, Aberdeen",
        price: 100,
        currency: "NLe",
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?q=80&w=2532&auto=format&fit=crop",
        categories: ["Business", "Technology"],
    }
];

export async function seedEventsToFirestore() {
    const eventsCollection = collection(db, "events");

    try {
        console.log("Starting database seed...");

        // Check if we already have events to avoid duplicates
        const querySnapshot = await getDocs(eventsCollection);
        if (!querySnapshot.empty) {
            console.log("Database already has events. Clearing existing events...");
            const deletePromises = querySnapshot.docs.map((document) =>
                deleteDoc(doc(db, "events", document.id))
            );
            await Promise.all(deletePromises);
            console.log("Cleared existing events.");
        }

        // Add all mock events
        const addPromises = mockEvents.map(event => {
            // Add some extra realistic data
            const enrichedEvent = {
                ...event,
                status: "published",
                createdAt: new Date().toISOString(),
                organizerId: "admin", // Placeholder until we have real users creating them
                ticketsSold: Math.floor(Math.random() * 100),
                totalCapacity: 500
            };
            return addDoc(eventsCollection, enrichedEvent);
        });

        await Promise.all(addPromises);
        console.log(`Successfully seeded ${mockEvents.length} events to Firestore.`);
        return true;

    } catch (error) {
        console.error("Error seeding database:", error);
        return false;
    }
}
