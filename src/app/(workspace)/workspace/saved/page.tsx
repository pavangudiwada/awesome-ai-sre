import type { Metadata } from "next";
import Link from "next/link";
import { BookmarkIcon } from "lucide-react";

import { saveProductAction } from "@/actions/workflows";
import {
  SavedProductsIntro,
  WorkspaceEmptyState,
  WorkspaceProductRow,
  WorkspaceShell,
} from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { getAllProductSummaryMap } from "@/lib/presentation/catalog";
import { getWorkspaceSavedProducts } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Saved products", robots: { index: false } };

export default async function SavedProductsPage() {
  const rows = await getWorkspaceSavedProducts();
  const products = getAllProductSummaryMap();
  const savedProducts = rows.flatMap((row) => {
    const product = products.get(row.product_slug);
    return product ? [{ row, product }] : [];
  });

  return (
    <WorkspaceShell
      activeSection="saved"
      title="Saved products"
      description="A broad bookmark list for products you want to revisit. Saving never follows a company."
    >
      <div className="flex flex-col gap-5">
        <SavedProductsIntro count={savedProducts.length} />
        {savedProducts.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {savedProducts.map(({ product, row }) => (
              <WorkspaceProductRow
                key={product.slug}
                product={product}
                contextLabel={`Saved ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(row.created_at))}`}
                actions={
                  <form action={saveProductAction}>
                    <input type="hidden" name="productSlug" value={product.slug} />
                    <input type="hidden" name="saved" value="false" />
                    <input type="hidden" name="returnTo" value="/workspace/saved" />
                    <Button type="submit" variant="outline">Remove</Button>
                  </form>
                }
              />
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            icon={<BookmarkIcon />}
            title="No saved products yet"
            description="Use Save on a product card to build a broad research list."
            action={<Button asChild><Link href="/tools">Browse products</Link></Button>}
          />
        )}
      </div>
    </WorkspaceShell>
  );
}
