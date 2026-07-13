import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Editorial policy", alternates: { canonical: "/editorial-policy" } };

export default function EditorialPolicyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">Editorial independence</p>
        <h1 className="text-4xl font-semibold tracking-tight">How products and updates enter the Watchlist</h1>
        <p className="text-lg text-muted-foreground">The practitioner experience is the product. Company participation cannot silently rewrite it.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle>Inclusion</CardTitle></CardHeader><CardContent className="leading-relaxed">A product must have a genuine AI layer relevant to incident response, reliability, observability, AIOps, runbooks, or adjacent evaluation work.</CardContent></Card>
        <Card><CardHeader><CardTitle>Company submissions</CardTitle></CardHeader><CardContent className="leading-relaxed">Corrections and updates require a source, are stored privately, and are reviewed before any public change.</CardContent></Card>
        <Card><CardHeader><CardTitle>Commercial separation</CardTitle></CardHeader><CardContent className="leading-relaxed">There are no paid rankings, sponsored “winner” labels, or hidden changes to evidence state. Future commercial placements must be labeled.</CardContent></Card>
        <Card><CardHeader><CardTitle>Practitioner privacy</CardTitle></CardHeader><CardContent className="leading-relaxed">Notes, saved products, and evaluation membership are excluded from company analytics. Company follows are reported only in privacy-protected aggregate.</CardContent></Card>
      </div>
      <Alert><AlertTitle>Corrections are welcome; direct publishing is not</AlertTitle><AlertDescription>Company access is currently limited to reviewed correction and update forms. There is no claim-profile dashboard in this version.</AlertDescription></Alert>
    </main>
  );
}
