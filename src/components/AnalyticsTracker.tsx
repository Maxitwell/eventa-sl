"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsTracker() {
    const pathname = usePathname();
    const initialized = useRef(false);

    useEffect(() => {
        const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
        if (!measurementId) return;

        async function initAnalytics() {
            const { app } = await import("@/lib/firebase");
            const { getAnalytics, isSupported } = await import("firebase/analytics");
            if (await isSupported()) {
                getAnalytics(app);
                initialized.current = true;
            }
        }

        if (!initialized.current) {
            initAnalytics();
        }
    }, []);

    useEffect(() => {
        const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
        if (!measurementId || !initialized.current) return;

        async function logPageView() {
            const { app } = await import("@/lib/firebase");
            const { getAnalytics, logEvent, isSupported } = await import("firebase/analytics");
            if (await isSupported()) {
                const analytics = getAnalytics(app);
                logEvent(analytics, "page_view", { page_path: pathname });
            }
        }

        logPageView();
    }, [pathname]);

    return null;
}
