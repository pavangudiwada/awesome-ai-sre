import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3"><p className="text-sm font-medium text-primary">Terms</p><h1 className="text-4xl font-semibold tracking-tight">Use the Watchlist as research support, not operational authority</h1><p className="text-muted-foreground">Last updated July 10, 2026.</p></header>
      <Alert><AlertTitle>No reliability guarantee</AlertTitle><AlertDescription>Catalog entries, resources, and evidence labels may be incomplete or outdated. Validate every product, security boundary, and operational claim before a production decision.</AlertDescription></Alert>
      <Card><CardHeader><CardTitle>Acceptable use</CardTitle></CardHeader><CardContent className="leading-relaxed">Do not abuse authentication, scrape private workflow data, submit deceptive corrections, impersonate a company, or interfere with the service. Public source links remain subject to their owners’ terms.</CardContent></Card>
      <Card><CardHeader><CardTitle>Your submissions</CardTitle></CardHeader><CardContent className="leading-relaxed">You represent that submitted information is accurate to the best of your knowledge and that the linked source may be reviewed. Submission does not guarantee publication.</CardContent></Card>
      <Card><CardHeader><CardTitle>Accounts</CardTitle></CardHeader><CardContent className="leading-relaxed">You are responsible for access to your linked identity provider. The service may remove abusive accounts or content. There is currently no paid practitioner plan.</CardContent></Card>
    </main>
  );
}
