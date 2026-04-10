import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { SerwistProvider } from "./serwist";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      <body suppressHydrationWarning className={`${inter.variable} antialiased bg-gray-50 text-gray-900 pb-20 relative min-h-screen flex flex-col`}>
        <SerwistProvider swUrl="/serwist/sw.js">
          <Providers>
            <Navbar />
            <main className="flex-1 relative w-full overflow-x-hidden">
              {children}
            </main>
            <Footer />
            <ChatWidget />
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  );
}
