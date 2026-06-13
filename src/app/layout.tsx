import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HarborMaster — Coral-Powered Maintainer Command Center",
  description:
    "HarborMaster joins GitHub, Discord, and Notion in a single Coral SQL query to tell open-source maintainers exactly what to fix, review, or ship next.",
  keywords: ["Coral", "open-source", "maintainer", "SQL", "GitHub", "Discord", "Notion", "developer tools"],
  openGraph: {
    title: "HarborMaster",
    description: "Your AI first mate for open-source projects. Powered by Coral cross-source SQL.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        {/* Animated mesh gradient — fixed behind all content */}
        <div className="hm-bg-mesh" aria-hidden="true" />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
