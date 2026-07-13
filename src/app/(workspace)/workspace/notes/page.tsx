import type { Metadata } from "next";
import Link from "next/link";
import { FileTextIcon } from "lucide-react";

import { WorkspaceEmptyState, WorkspaceShell } from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllProductSummaryMap } from "@/lib/presentation/catalog";
import { getWorkspaceNotes } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Private notes", robots: { index: false } };

export default async function NotesPage() {
  const notes = await getWorkspaceNotes();
  const products = getAllProductSummaryMap();
  const visibleNotes = notes.flatMap((note) => {
    const product = products.get(note.product_slug);
    return product ? [{ note, product }] : [];
  });
  return (
    <WorkspaceShell
      activeSection="notes"
      title="Private notes"
      description="One auto-saved note per product. Note contents never enter aggregate company analytics."
    >
      {visibleNotes.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleNotes.map(({ note, product }) => (
            <Card key={product.slug}>
              <CardHeader>
                <CardTitle><Link href={product.href} className="hover:underline">{product.name}</Link></CardTitle>
                <CardDescription>
                  Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(note.updated_at))}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">{note.body || "Empty note"}</p>
                <Button asChild variant="outline" className="w-fit"><Link href={product.href}>Open product note</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <WorkspaceEmptyState
          icon={<FileTextIcon />}
          title="No product notes yet"
          description="Open a product profile and sign in to write a private note."
          action={<Button asChild><Link href="/tools">Browse products</Link></Button>}
        />
      )}
    </WorkspaceShell>
  );
}
