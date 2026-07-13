import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3"><p className="text-sm font-medium text-primary">Privacy</p><h1 className="text-4xl font-semibold tracking-tight">Private research stays private</h1><p className="text-muted-foreground">Last updated July 13, 2026.</p></header>
      <Card><CardHeader><CardTitle>Account and workflow data</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 leading-relaxed"><p>Authentication is provided by Supabase. The Watchlist stores your profile, saved products, private product notes, named evaluations, candidate membership, company follows, and update-read state.</p><p>Notes, saves, evaluation membership, evaluation text, and identity details are never exposed in company-facing analytics.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Product analytics</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 leading-relaxed"><p>Vercel Analytics measures aggregate traffic. The Watchlist records an allowlisted set of public profile views, update views, outbound clicks, and product-share actions using an opaque first-party cookie. The database stores only a one-way HMAC pseudonym that rotates each UTC day.</p><p>A product-share event records only the product slug. It does not record the destination or channel, share text, copied URL, user identity, notes, or search content.</p><p>Optional PostHog events record public page type and slug, anonymous search-result buckets, and workflow action type. Autocapture, session replay, person profiles, names, emails, note contents, evaluation contents, and search text are disabled or excluded.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Company reporting</CardTitle></CardHeader><CardContent className="leading-relaxed">Future company reports may include aggregate profile views, outbound clicks, product-share counts, company-follow counts, and update engagement. Engagement rows with fewer than 10 distinct daily pseudonyms are omitted, and follow counts below 10 are suppressed rather than reported as zero. Contact sharing requires a separate explicit opt-in and is not offered in the current interface.</CardContent></Card>
      <Card><CardHeader><CardTitle>Editorial submissions</CardTitle></CardHeader><CardContent className="leading-relaxed">Correction and company-update submissions are private until reviewed. Contact email is used only to clarify the submission. A short-lived first-party cookie limits repeated submissions.</CardContent></Card>
    </main>
  );
}
