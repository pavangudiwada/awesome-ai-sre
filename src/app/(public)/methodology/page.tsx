import type { Metadata } from "next";
import { CheckCircle2Icon, CircleAlertIcon, FileQuestionIcon, MegaphoneIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Evidence methodology",
  description: "How AI SRE Watchlist separates sources, vendor claims, observations, and unknowns.",
  alternates: { canonical: "/methodology" },
};

const states = [
  { label: "Documented", icon: CheckCircle2Icon, description: "Supported by a linked primary source and checked by the Watchlist." },
  { label: "Vendor-claimed", icon: MegaphoneIcon, description: "The company explicitly states this, but the Watchlist has not independently reproduced it." },
  { label: "Observed", icon: CircleAlertIcon, description: "Recorded during a disclosed hands-on test with scope and date." },
  { label: "Unknown", icon: FileQuestionIcon, description: "No adequate reviewed source is attached. Absence is never converted into a negative claim." },
];

export default function MethodologyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">Trust model</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Evidence before confidence</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Profiles are research aids, not rankings. Every material claim should expose its source, evidence state, and review date.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {states.map(({ label, icon: Icon, description }) => (
          <Card key={label}>
            <CardHeader>
              <Icon aria-hidden="true" />
              <CardTitle>{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Source priority</CardTitle>
          <CardDescription>Sources are not interchangeable.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-3 pl-5 leading-relaxed">
            <li>Official documentation, repositories, security pages, and release notes.</li>
            <li>First-party announcements, with promotional language labeled as a vendor claim.</li>
            <li>Approved practitioner interviews and disclosed Watchlist testing.</li>
            <li>Independent reporting used only when a primary source cannot answer the question.</li>
          </ol>
        </CardContent>
      </Card>
      <Alert>
        <FileQuestionIcon />
        <AlertTitle>What the Watchlist does not infer</AlertTitle>
        <AlertDescription>
          Pricing, integrations, security posture, product availability, customer outcomes, and “verified” status remain unknown unless a reviewed source supports them. A company profile mapping is identity work, not endorsement.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader><CardTitle>Corrections and conflicts</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 leading-relaxed">
          <p>Corrections require a source and enter a private review queue. Company submissions never publish directly.</p>
          <p>Conflicting sources remain visible as a conflict until the discrepancy is resolved. Review dates change only after a real review.</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">No paid rankings</Badge>
            <Badge variant="outline">No inferred verification</Badge>
            <Badge variant="outline">No hidden public evidence</Badge>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
