"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventCard } from "@/components/shared/EventCard";
import { EventCardSkeleton } from "@/components/shared/EventCardSkeleton";
import { useAuth } from "@/store/AuthContext";
import { useModals } from "@/components/shared/ModalProvider";
import { useToast } from "@/components/shared/ToastProvider";
import { Search, Filter, Calendar as CalendarIcon, ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublishedEventsPaginated, EventEntity } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

export default function Discover() {
  const { currentUser, isLoggedIn } = useAuth();
  const { openTicketModal } = useModals();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeCategory, setActiveCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("Any Date");
  const [priceFilter, setPriceFilter] = useState("Any Price");

  const [dbEvents, setDbEvents] = useState<EventEntity[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

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

  useEffect(() => {
    const t = setInterval(() => setHeroIndex(i => (i + 1) % 2), 4500);
    return () => clearInterval(t);
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

  const categories = [
    "All", "Music", "Comedy", "Technology", "Religion",
    "Sports", "Business", "Art & Culture", "Food and Drink",
  ];

  const filteredEvents = dbEvents.filter(event => {
    const title = event.title || "";
    const loc = event.location || "";
    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      event.categories?.some(cat => cat.toLowerCase().includes(activeCategory.toLowerCase()));
    const matchesPrice =
      priceFilter === "Any Price" ||
      (priceFilter === "Free" && event.price === 0) ||
      (priceFilter === "Paid" && event.price > 0);
    let matchesDate = true;
    if (dateFilter !== "Any Date" && event.date) {
      const currentYear = new Date().getFullYear();
      const eventDate = new Date(`${event.date} ${currentYear}`);
      const today = new Date();
      if (dateFilter === "This Month") {
        matchesDate =
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === "This Weekend") {
        const currentDay = today.getDay();
        let diffToFriday = 5 - currentDay;
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

  const featuredEvent = dbEvents.find(e => e.featured) ?? dbEvents[0] ?? null;
  const firstName = currentUser?.name?.split(" ")[0] ?? "you";

  const heroTexts = [
    { pre: "This weekend,", emphasis: "Freetown moves.", useSerif: true },
    { pre: "The Heartbeat of", emphasis: "Sierra Leone", useSerif: false },
  ];
  const current = heroTexts[heroIndex];

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left: text + CTAs */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#e8fff0] border border-[#b3ffd6] text-orange-600 text-xs font-bold px-4 py-2 rounded-full mb-8">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {dbEvents.length > 0 ? `${dbEvents.length}+ ` : ""}EVENTS LIVE THIS WEEK
              </div>

              {/* Animated hero heading */}
              <div className="h-28 sm:h-32 lg:h-36 relative overflow-hidden mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroIndex}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -28 }}
                    transition={{ duration: 0.55, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.08] tracking-tight">
                      {current.pre}
                      <br />
                      {current.useSerif ? (
                        <span style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                          {current.emphasis}
                        </span>
                      ) : (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">{current.emphasis}</span>
                      )}
                    </h1>
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="text-gray-500 text-lg mb-8 max-w-md leading-relaxed">
                Discover the hottest concerts, tech meetups, and beach festivals happening across the country this weekend on Eventa.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#events-section"
                  className="bg-orange-500 text-white px-7 py-3.5 rounded-full font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                >
                  Browse all events <ArrowRight size={16} />
                </a>
                <a
                  href="https://wa.me/14155238886?text=join%20thought-stiff"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-[#25d366] text-[#128c4e] px-7 py-3.5 rounded-full font-bold hover:bg-[#e8fff0] transition flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Book on WhatsApp
                </a>
              </div>
            </div>

            {/* Right: Featured event card */}
            {!isLoadingEvents && featuredEvent ? (
              <div
                onClick={() => openTicketModal(featuredEvent)}
                className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl cursor-pointer group relative"
              >
                <div className="absolute top-4 right-4 z-20">
                  <span className="bg-white text-gray-900 text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest">
                    FEATURED
                  </span>
                </div>

                {/* Image + overlay */}
                <div className="relative h-44 sm:h-52 overflow-hidden">
                  <div className="absolute top-4 right-4 w-28 h-28 bg-orange-500 rounded-full opacity-70 z-0 blur-sm" />
                  <Image
                    src={featuredEvent.image}
                    alt={featuredEvent.title}
                    fill
                    className="object-cover opacity-50 mix-blend-luminosity group-hover:scale-105 transition duration-700 z-10"
                    sizes="(max-width: 1024px) 100vw, 600px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent z-20" />
                  <div className="absolute bottom-0 left-0 p-4 z-30">
                    <p className="text-orange-300 text-[11px] italic mb-0.5">an evening with</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none">
                      {featuredEvent.title}
                    </h2>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {featuredEvent.categories?.map((c, i) => (
                      <span key={c}>
                        <span className="text-orange-400 text-[10px] font-black uppercase tracking-widest">{c}</span>
                        {i < (featuredEvent.categories?.length ?? 0) - 1 && (
                          <span className="text-gray-600 text-[10px] ml-1">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs mb-4">
                    <MapPin size={11} className="inline mr-1" />
                    {featuredEvent.location}
                    {featuredEvent.date ? ` · ${featuredEvent.date}` : ""}
                    {featuredEvent.time ? ` · ${featuredEvent.time}` : ""}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">From</p>
                      <p className="text-xl font-black text-white">
                        {featuredEvent.price > 0
                          ? `NLe ${featuredEvent.price.toLocaleString()}`
                          : "Free"}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); openTicketModal(featuredEvent); }}
                      className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition flex items-center gap-1.5 text-sm"
                    >
                      Get tickets <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ) : isLoadingEvents ? (
              <div className="hidden lg:block bg-gray-100 rounded-3xl h-[26rem] animate-pulse" />
            ) : (
              <div className="hidden lg:flex items-center justify-center h-96 bg-gradient-to-br from-orange-500 to-pink-600 rounded-3xl">
                <div className="text-center text-white p-8">
                  <p className="text-6xl mb-4">🎟️</p>
                  <p className="text-2xl font-black">Events Coming Soon</p>
                  <p className="text-orange-100 mt-2">Be the first to know!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Events Section ──────────────────────────────────── */}
      <div id="events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-2">
          <div>
            {isLoggedIn && currentUser ? (
              <>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  For you, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}.{" "}
                  <span className="text-2xl align-middle">🇸🇱</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Curated from your interest in{" "}
                  <span className="text-orange-600 font-medium">technology</span>
                  {" "}&amp;{" "}
                  <span className="text-orange-600 font-medium">networking</span>
                </p>
              </>
            ) : (
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Events in Sierra Leone{" "}
                <span className="text-2xl align-middle">🇸🇱</span>
              </h2>
            )}
          </div>
          <Link href="/" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition whitespace-nowrap">
            View all →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 sm:flex-none">
              <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
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
                onChange={e => setPriceFilter(e.target.value)}
                className="w-full sm:w-40 pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium text-gray-700"
              >
                <option value="Any Price">Any Price</option>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="relative mb-8">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map(cat => (
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
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        </div>

        {/* Events grid — 3-column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {isLoadingEvents ? (
            Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={`skeleton-${i}`} />)
          ) : (
            filteredEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onClickTickets={() => openTicketModal(event)}
                onClickWaitlist={() => showToast("Added to waitlist!", "success")}
              />
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && filteredEvents.length > 0 && (
          <div className="flex justify-center mt-8 mb-12">
            <button
              onClick={loadMoreEvents}
              disabled={isLoadingMore}
              className="bg-white border-2 border-orange-500 text-orange-600 font-bold px-8 py-3 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingMore && (
                <span className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              )}
              {isLoadingMore ? "Loading..." : "Load More Events"}
            </button>
          </div>
        )}

        {filteredEvents.length === 0 && !isLoadingEvents && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6">We couldn&apos;t find any events matching your search.</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
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
