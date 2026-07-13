import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisre.pavangudiwada.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI SRE Watchlist",
    template: "%s | AI SRE Watchlist",
  },
  description:
    "Evidence-led profiles, comparisons, and evaluation workflows for AI incident response and reliability tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI SRE Watchlist",
    description:
      "Find and evaluate AI incident-response and reliability tools with evidence you can inspect.",
    url: "/",
    siteName: "AI SRE Watchlist",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "AI SRE Watchlist",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "AI SRE Watchlist",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
