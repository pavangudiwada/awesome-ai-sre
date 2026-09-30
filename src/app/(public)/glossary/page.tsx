import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GlossaryDirectory } from "@/components/glossary/glossary-directory";
export const metadata: Metadata = {
  title: "AI SRE, SRE and DevOps glossary",
  description: "Plain-language operational definitions with primary sources, related terms, and catalog research links.",
  alternates: { canonical: "/glossary" },
};
export default function GlossaryPage() {
  return <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
    <header className="flex max-w-3xl flex-col gap-3">
      <Link href="/resources" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Practitioner resources</Link>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">AI SRE, SRE &amp; DevOps glossary</h1>
      <p className="text-lg leading-relaxed text-muted-foreground">Understand the language behind reliability work. Find a definition, follow related concepts, and connect it to your product research.</p>
      <p className="text-sm leading-relaxed text-muted-foreground">Definitions are editorial summaries of primary documentation. AI SRE is a working category, not a certification or a guarantee of autonomous operation. Catalog links are research paths, not endorsements.</p>
    </header>
    <Suspense fallback={<p role="status">Loading glossary…</p>}><GlossaryDirectory /></Suspense>
  </main>;
}
