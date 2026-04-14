"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/shared/EventCard";
import { EventCardSkeleton } from "@/components/shared/EventCardSkeleton";
import { useAuth } from "@/store/AuthContext";
import { useModals } from "@/components/shared/ModalProvider";
import { useToast } from "@/components/shared/ToastProvider";
import { ArrowDown, Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import Image from "next/image";
import { getPublishedEventsPaginated, EventEntity } from "@/lib/db";

export default function Discover() {
  const { currentUser } = useAuth();
  const { openTicketModal } = useModals();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("Any Date");
  const [priceFilter, setPriceFilter] = useState("Any Price");

  const [dbEvents, setDbEvents] = useState<EventEntity[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchInitialEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const { events, lastVisible: newLastVisible, hasMore: more } = await getPublishedEventsPaginated(null, 15);
      setDbEvents(events);
      setLastVisible(newLastVisible);
      setHasMore(more);
    } catch (error) {
      console.error("Failed to load events:", error);
      showToast("Failed to load events.", "error");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchInitialEvents();
  }, []);

  const loadMoreEvents = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { events, lastVisible: newLastVisible, hasMore: more } = await getPublishedEventsPaginated(lastVisible, 15);
      setDbEvents(prev => [...prev, ...events]);
      setLastVisible(newLastVisible);
      setHasMore(more);
    } catch (error) {
      console.error("Failed to load more events:", error);
      showToast("Failed to load more events.", "error");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const scrollToEvents = () => {
    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const categories = [
    "All",
    "Music",
    "Comedy",
    "Technology",
    "Religion",
    "Sports",
    "Business",
    "Art & Culture",
    "Food and Drink"
  ];

  const filteredEvents = dbEvents.filter(event => {
    // 1. Text Search (Title or Location)
    const title = event.title || "";
    const loc = event.location || "";
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category
    const matchesCategory = activeCategory === "All" ||
      event.categories?.some(cat => cat.toLowerCase().includes(activeCategory.toLowerCase()));

    // 3. Price Filter
    const matchesPrice = priceFilter === "Any Price" ||
      (priceFilter === "Free" && event.price === 0) ||
      (priceFilter === "Paid" && event.price > 0);

    // 4. Date Filter
    let matchesDate = true;
    if (dateFilter !== "Any Date" && event.date) {
      // event.date is formatted as "Dec 20", we append the current year to parse it correctly
      const currentYear = new Date().getFullYear();
      const eventDate = new Date(`${event.date} ${currentYear}`);
      const today = new Date();

      if (dateFilter === "This Month") {
        matchesDate = eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === "This Weekend") {
        const currentDay = today.getDay(); // Sunday = 0, Monday = 1, etc.
        let diffToFriday = 5 - currentDay;

        // If today is Sunday (0), the Friday of THIS weekend was 2 days ago
        if (currentDay === 0) diffToFriday = -2;

        const thisFriday = new Date(today);
        thisFriday.setDate(today.getDate() + diffToFriday);
        thisFriday.setHours(0, 0, 0, 0);

        const thisSunday = new Date(thisFriday);
        thisSunday.setDate(thisFriday.getDate() + 2);
        thisSunday.setHours(23, 59, 59, 999);

        matchesDate = eventDate >= thisFriday && eventDate <= thisSunday;
      }
    }

    return matchesSearch && matchesCategory && matchesPrice && matchesDate;
  });

  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gray-900 h-[480px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
            alt="Hero background"
            fill
            priority
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center items-start pt-10">
          <span className="bg-white/10 backdrop-blur-md text-orange-400 border border-orange-400/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Happening Now in Sierra Leone
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 max-w-2xl leading-tight">
            The Heartbeat of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              Sierra Leone
            </span>
          </h1>
          <p className="text-lg text-gray-200 mb-8 max-w-lg font-medium">
            Discover the hottest concerts, tech meetups, and beach festivals
            happening across the country this weekend on Eventa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={scrollToEvents}
              className="bg-orange-500 text-white px-8 py-3.5 rounded-full font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 group"
            >
              Explore Events
              <ArrowDown className="group-hover:translate-y-1 transition-transform" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div id="events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">

        {/* Personalized Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              For You in Sierra Leone <span className="text-2xl align-middle ml-1">🇸🇱</span>
            </h2>
            {currentUser && (
              <p className="text-sm text-gray-500 mt-1">
                Based on your interest in{" "}
                <span className="text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">Technology</span>{" "}
                &{" "}
                <span className="text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">Networking</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium placeholder:font-normal"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full sm:w-40 pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium text-gray-700"
                >
                  <option value="Any Date">Any Date</option>
                  <option value="This Weekend">This Weekend</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>

              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full sm:w-40 pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium text-gray-700"
                >
                  <option value="Any Price">Any Price</option>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={
                activeCategory === cat
                  ? "px-5 py-2 rounded-full bg-orange-500 text-white font-medium text-sm whitespace-nowrap shadow-md shadow-orange-500/20"
                  : "px-5 py-2 rounded-full bg-white border border-gray-200 text-gray-600 font-medium text-sm whitespace-nowrap hover:border-orange-500 hover:text-orange-500 transition hover:bg-orange-50"
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {isLoadingEvents ? (
            // Show 6 skeletons while loading initial events
            Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={`skeleton-${i}`} />
            ))
          ) : (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClickTickets={() => openTicketModal(event)}
                onClickWaitlist={() => showToast("Added to waitlist!", "success")}
              />
            ))
          )}
        </div>

        {/* Load More Button */}
        {hasMore && filteredEvents.length > 0 && (
          <div className="flex justify-center mt-8 mb-12">
            <button
              onClick={loadMoreEvents}
              disabled={isLoadingMore}
              className="bg-white border-2 border-orange-500 text-orange-600 font-bold px-8 py-3 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingMore && <span className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>}
              {isLoadingMore ? "Loading..." : "Load More Events"}
            </button>
          </div>
        )}

        {filteredEvents.length === 0 && (
          <div id="no-search-results" className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400 text-3xl" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6">We couldn't find any events matching your search.</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("All") }}
              className="text-orange-600 font-bold hover:text-orange-700 transition"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </>
  );
}
