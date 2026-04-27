"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 7 days from April 27, 2026 = May 4, 2026 midnight UTC (Sierra Leone is UTC+0)
const LAUNCH_DATE = new Date("2026-05-04T00:00:00Z");

function getTimeLeft() {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-white/5 border border-white/10 rounded-2xl px-5 py-4 sm:px-7 sm:py-5 min-w-[72px] sm:min-w-[96px] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="block text-4xl sm:text-6xl font-black text-white tabular-nums text-center"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-2.5 text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Mins" },
    { value: timeLeft.seconds, label: "Secs" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030712] flex flex-col items-center justify-center overflow-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-orange-600/5 rounded-full blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-2xl">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-black px-4 py-2 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Sierra Leone · Coming Soon
          </span>
        </motion.div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mb-3"
        >
          <h1 className="text-7xl sm:text-9xl font-black tracking-tighter text-white leading-none">
            EVENTA
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="text-gray-500 text-sm sm:text-base font-medium mb-10 tracking-wide"
        >
          Sierra Leone&apos;s Premier Events Platform
        </motion.p>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28 }}
          className="mb-3"
        >
          <p className="text-gray-600 text-xs uppercase tracking-[0.2em] font-bold mb-5">
            Launching in
          </p>
          {mounted ? (
            <div className="flex items-start gap-2.5 sm:gap-4">
              {units.map((u, i) => (
                <div key={u.label} className="flex items-start gap-2.5 sm:gap-4">
                  <CountdownUnit value={u.value} label={u.label} />
                  {i < units.length - 1 && (
                    <span className="text-3xl sm:text-5xl font-black text-orange-500/30 mt-3 sm:mt-4 leading-none select-none">
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 sm:gap-4">
              {["Days", "Hours", "Mins", "Secs"].map((label, i, arr) => (
                <div key={label} className="flex items-start gap-2.5 sm:gap-4">
                  <div className="flex flex-col items-center">
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 sm:px-7 sm:py-5 min-w-[72px] sm:min-w-[96px]">
                      <span className="block text-4xl sm:text-6xl font-black text-white tabular-nums text-center">
                        --
                      </span>
                    </div>
                    <span className="mt-2.5 text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-widest">
                      {label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-3xl sm:text-5xl font-black text-orange-500/30 mt-3 sm:mt-4 leading-none select-none">
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-24 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent my-8"
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md"
        >
          Concerts, tech meetups, beach festivals — and everything in between.{" "}
          <span className="text-white font-semibold">Be first in line.</span>
        </motion.p>

        {/* WhatsApp CTA */}
        <motion.a
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          href="https://wa.me/14155238886?text=join%20thought-stiff"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-[#25d366] text-white px-8 py-4 rounded-full font-bold text-sm sm:text-base hover:bg-[#1ebe5d] active:scale-95 transition-all duration-150 shadow-lg shadow-[#25d366]/20"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Get Notified on WhatsApp
        </motion.a>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 text-gray-800 text-xs"
        >
          © 2026 Eventa Sierra Leone · All rights reserved
        </motion.p>
      </div>
    </div>
  );
}
