import type { Metadata } from "next";
import { CheckCircle2Icon } from "lucide-react";

import { EditorialSubmissionForm } from "@/components/submissions/editorial-submission-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCompanies, getObservabilityProducts, getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Submit a company update", robots: { index: false } };

export default async function CompanyUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; company?: string; submitted?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">Reviewed company contribution</p>
        <h1 className="text-4xl font-semibold tracking-tight">Share a source-linked product update</h1>
        <p className="text-muted-foreground">There is no direct publishing or company dashboard in this version.</p>
      </header>
      {params.submitted === "1" ? (
        <Alert><CheckCircle2Icon /><AlertTitle>Update submitted</AlertTitle><AlertDescription>It is awaiting Watchlist review and is not public yet.</AlertDescription></Alert>
      ) : null}
      {params.error ? (
        <Alert variant="destructive"><AlertTitle>Submission paused</AlertTitle><AlertDescription>{params.error}</AlertDescription></Alert>
      ) : null}
      <EditorialSubmissionForm
        type="company_update"
        companies={getCompanies()}
        products={[...getProducts(), ...getObservabilityProducts()]}
        defaultCompany={params.company}
        defaultProduct={params.product}
      />
    </main>
  );
}
