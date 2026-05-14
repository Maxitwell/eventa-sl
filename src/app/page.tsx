"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EventCard } from "@/components/shared/EventCard";
import { EventCardSkeleton } from "@/components/shared/EventCardSkeleton";
import { useAuth } from "@/store/AuthContext";
import { useModals } from "@/components/shared/ModalProvider";
import { useToast } from "@/components/shared/ToastProvider";
import { Search, Filter, Calendar as CalendarIcon, ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublishedEventsPaginated, isEventUpcoming, EventEntity } from "@/lib/db";

function Discover() {
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

  const fetchInitialEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const { events, lastVisible: newLastVisible, hasMore: more } = await getPublishedEventsPaginated(null, 15);
      const upcoming = events
        .filter(isEventUpcoming)
        .sort((a, b) => (a.eventTimestamp ?? a.date ?? '').localeCompare(b.eventTimestamp ?? b.date ?? ''));
      setDbEvents(upcoming);
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
    // Prevent browser scroll restoration from briefly flashing the footer on load
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    fetchInitialEvents();
  }, []);

  const loadMoreEvents = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { events, lastVisible: newLastVisible, hasMore: more } = await getPublishedEventsPaginated(lastVisible, 15);
      const upcoming = events.filter(isEventUpcoming);
      setDbEvents(prev => [...prev, ...upcoming]);
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

  const firstName = currentUser?.name?.split(" ")[0] ?? "you";

  return (
    <>
      <style jsx global>{`
        .page {
          height: 100dvh; min-height: 100dvh;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
        }
        .hero {
          flex: 1 1 auto;
          position: relative;
          display: flex; flex-direction: column;
          overflow: hidden;
          background:
            radial-gradient(60% 70% at 70% 30%, rgba(255, 138, 76, .6), transparent 60%),
            radial-gradient(70% 80% at 30% 70%, rgba(255, 120, 40, .55), transparent 65%),
            linear-gradient(180deg, #FF8A4C 0%, #EA580C 35%, #C2410C 75%, #9A3412 100%);
          z-index: 1;
        }
        .hero::before {
          content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            radial-gradient(28% 60% at 65% 55%, rgba(255, 255, 255, .06), transparent 70%),
            radial-gradient(20% 30% at 60% 30%, rgba(255, 220, 180, .14), transparent 70%),
            radial-gradient(35% 50% at 70% 80%, rgba(255, 160, 90, .16), transparent 70%);
          mix-blend-mode: screen;
        }
        .hero::after {
          content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background:
            linear-gradient(180deg, transparent 0%, transparent 95%, rgba(0, 0, 0, 0.05) 100%);
        }
        .grain {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          opacity: .12; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .hero-body {
          position: relative; z-index: 20; flex: 1;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 64px 22px 26px;
          max-width: 1280px; width: 100%; margin: 0 auto;
        }
        .pill {
          align-self: flex-start;
          display: inline-flex; align-items: center; gap: 9px;
          padding: 8px 14px 8px 12px; border-radius: 999px;
          background: rgba(20, 8, 4, .45);
          border: 1px solid rgba(255, 255, 255, .18);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          color: #fff; font-size: 13px; font-weight: 500; letter-spacing: -.005em;
          margin-bottom: auto; margin-top: 100px;
          transition: border-color .2s, transform .2s;
        }
        .pill:hover { border-color: rgba(255, 138, 76, .55); transform: translateY(-1px) }
        .pill .live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #22C55E;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, .65);
          animation: pulse 1.8s infinite;
        }
        .pill .count { font-weight: 700; color: #FF8A4C }
        .pill svg { color: #FF8A4C; margin-left: 2px }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, .65) }
          70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0) }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0) }
        }
        .headline-stack {
          display: grid;
          margin-bottom: 18px;
        }
        .headline-stack > h1 {
          grid-column: 1; grid-row: 1;
          font-family: var(--font-inter-tight), sans-serif;
          font-weight: 800;
          font-size: clamp(34px, 8.4vw, 80px);
          line-height: 1.02;
          letter-spacing: -.035em;
          color: #fff;
          max-width: 18ch;
          opacity: 0;
          will-change: opacity, transform;
          animation: rotateHead 8s cubic-bezier(.22, .7, .2, 1) infinite;
        }
        .headline-stack > h1:nth-child(2) { animation-delay: -4s }
        .headline-stack > h1 .accent {
          display: inline-block;
          background: linear-gradient(180deg, #FFFFFF 0%, #FFE3CF 40%, #FF8A4C 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          font-style: italic;
          padding-right: 0.15em;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
          animation: heartbeat 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        @keyframes heartbeat {
          0% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45)) brightness(1); }
          14% { transform: scale(1.08); filter: drop-shadow(0 4px 15px rgba(255, 138, 76, 0.4)) brightness(1.15); }
          28% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45)) brightness(1); }
          42% { transform: scale(1.06); filter: drop-shadow(0 4px 14px rgba(255, 138, 76, 0.3)) brightness(1.1); }
          70% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45)) brightness(1); }
        }
        @keyframes rotateHead {
          0% { opacity: 0; transform: translateY(-26px); }
          10% { opacity: 1; transform: translateY(0); }
          50% { opacity: 1; transform: translateX(0); }
          62% { opacity: 0; transform: translateX(60px); }
          100% { opacity: 0; transform: translateX(60px); }
        }
        .lede {
          font-size: clamp(15px, 3.9vw, 19px);
          line-height: 1.45;
          color: rgba(255, 255, 255, .86);
          max-width: 46ch;
          margin-bottom: 24px;
          letter-spacing: -.005em;
        }
        .ctas { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; align-items: flex-start }
        .cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          padding: 14px 26px; border-radius: 10px;
          font-family: var(--font-inter-tight), sans-serif; font-weight: 600; font-size: 16px;
          letter-spacing: -.01em;
          transition: transform .2s, background .2s, border-color .2s;
          min-width: 200px;
        }
        .cta-primary { background: #fff; color: #0A0402 }
        .cta-primary:hover { transform: translateY(-1px) }
        .cta-ghost {
          background: transparent; color: #fff;
          border: 1px solid rgba(255, 255, 255, .45);
        }
        .cta-ghost:hover { border-color: #fff; background: rgba(255, 255, 255, .06) }
        .cta-ghost .wa { color: #25D366 }
        .trust {
          position: relative; z-index: 2;
          padding: 0 22px 24px;
          max-width: 1280px; width: 100%; margin: 0 auto;
          flex: 0 0 auto;
        }
        .trust-line {
          text-align: center;
          color: rgba(255, 255, 255, .78);
          font-size: 13px; line-height: 1.45; letter-spacing: -.005em;
          max-width: 520px; margin-left: auto; margin-right: auto;
        }
        .trust-line b { color: #fff; font-weight: 600 }
        .fade { opacity: 0; transform: translateY(10px); animation: rise .9s cubic-bezier(.2, .7, .2, 1) forwards }
        .d1 { animation-delay: .05s } .d2 { animation-delay: .16s } .d3 { animation-delay: .26s }
        .d5 { animation-delay: .46s } .d6 { animation-delay: .56s } .d7 { animation-delay: .66s }
        @keyframes rise { to { opacity: 1; transform: translateY(0) } }

        .hero-img {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          z-index: 1;
          opacity: 0.35;
          mask-image: linear-gradient(to top, black 50%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, black 50%, transparent 100%);
        }

        @media (min-width: 1024px) {
          .hero-img {
            width: 55%;
            opacity: 1;
            mask-image: linear-gradient(to left, black 70%, transparent 100%);
            -webkit-mask-image: linear-gradient(to left, black 70%, transparent 100%);
          }
          .hero-body {
            padding-right: 45%;
          }
        }
        @media (min-width: 520px) {
          .ctas { flex-direction: row; flex-wrap: wrap }
          .cta { min-width: 0 }
        }
        @media (min-width: 768px) {
          .ann { font-size: 14px; padding: 12px 24px }
          nav.custom-nav { padding: 22px 36px }
          .hero-body { padding: 0 36px 40px }
          .trust { padding: 0 36px 32px }
          .trust-line { font-size: 14px }
        }
        @media (min-width: 1024px) {
          .hero-body { padding: 0 56px 56px }
          .headline-stack > h1 { max-width: 18ch; letter-spacing: -.04em }
          .trust { padding: 0 56px 40px }
        }
        @media (max-height: 700px) {
          .headline-stack > h1 { font-size: clamp(28px, 6.8vw, 50px) }
          .headline-stack { margin-bottom: 12px }
          .lede { font-size: 14px; margin-bottom: 16px }
          .cta { padding: 12px 22px; font-size: 15px }
          .ctas { margin-bottom: 20px }
          .trust-line { font-size: 12px }
        }
      `}</style>

      <div className="page">
        {/* Top announcement bar */}

        {/* Hero */}
        <section className="hero">
          <div className="grain"></div>
          <img 
            src="/hero-lady.png" 
            alt="Happy lady at party" 
            className="hero-img fade"
          />


          {/* Hero content */}
          <div className="hero-body">
            <a className="pill fade d3" href="#events-section">
              <span className="live-dot"></span>
              <span className="count" id="event-count">{dbEvents.length > 0 ? dbEvents.length : 23}</span> events live this week
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </a>

            {/* Headline rotator: fades in from top, fades out to right */}
            <div className="headline-stack">
              <h1>The ticketing platform to power your best events.</h1>
              <h1>The <span className="accent">Heartbeat</span> of Sierra Leone.</h1>
            </div>

            <p className="lede fade d5">
              Discover the hottest concerts, tech meetups, and beach festivals
              happening across the country this weekend on Eventa.
            </p>

            <div className="ctas fade d6">
              <a className="cta cta-primary" href="#events-section">Browse events</a>
              <a className="cta cta-ghost" href="https://wa.me/12184148971" target="_blank" rel="noopener noreferrer">
                <svg className="wa" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A10 10 0 0 0 4.16 18.5L3 22l3.6-1.13A10 10 0 1 0 19.05 4.91Zm-7.04 15.4a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-2.13.67.68-2.07-.2-.32a8.3 8.3 0 1 1 6.18 3.06Zm4.55-6.22c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.65.8-.8.97-.14.16-.3.18-.55.06a6.78 6.78 0 0 1-3.4-2.97c-.26-.44.26-.41.74-1.36a.46.46 0 0 0-.02-.43c-.06-.13-.56-1.36-.77-1.86-.2-.49-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31 2.8 2.8 0 0 0-.87 2.07c0 1.22.89 2.4 1.01 2.57.13.16 1.75 2.66 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.14-1.17-.06-.1-.23-.16-.49-.28Z" /></svg>
                Book on WhatsApp
              </a>
            </div>
          </div>

          {/* Trust line */}
          <div className="trust fade d7">
            <p className="trust-line"><b>Trusted by 700+ subscribers</b> — organisers, promoters, venues and creators</p>
            <p className="trust-line mt-1 opacity-70">The first ticketing platform native to Sierra Leone — pay with Orange Money or Afrimoney.</p>
          </div>
        </section>
      </div>

      {/* ── Events Section ──────────────────────────────────── */}
      <div id="events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-12">
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

export default function Page() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}
