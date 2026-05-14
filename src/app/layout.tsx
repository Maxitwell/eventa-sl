import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SerwistProvider } from "./serwist";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700", "900"],
});

export const viewport: Viewport = {
  themeColor: "#EA580C",
};

export const metadata: Metadata = {
  title: "Eventa Sierra Leone - Discover & Create",
  description: "Discover the hottest concerts, tech meetups, and beach festivals happening across the country this weekend.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eventa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before browser scroll-restoration can fire — keeps hero at top on back-navigation */}
        <script dangerouslySetInnerHTML={{ __html: `history.scrollRestoration='manual';` }} />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${playfair.variable} antialiased bg-gray-50 text-gray-900 pb-20 relative min-h-screen flex flex-col`}>
        <SerwistProvider swUrl="/serwist/sw.js">
          <Providers>
            <Navbar />
            <main className="flex-1 relative w-full overflow-x-hidden">
              {children}
            </main>
            <Footer />
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  );
}
