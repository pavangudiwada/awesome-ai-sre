import type { Metadata } from "next"

import { CompanyCard } from "@/components/watchlist"
import { getCompanies, getProducts } from "@/lib/catalog"
import type { CatalogProduct } from "@/types/catalog"

export const metadata: Metadata = {
  title: "Companies",
  description: "Browse the companies behind products in the AI SRE Watchlist catalog.",
  alternates: { canonical: "/companies" },
}

export default function CompaniesPage() {
  const companies = [...getCompanies()].sort((left, right) => left.name.localeCompare(right.name))
  const productsByCompany = new Map<string, CatalogProduct[]>()

  for (const product of getProducts()) {
    if (!product.companySlug) continue
    const products = productsByCompany.get(product.companySlug) ?? []
    products.push(product)
    productsByCompany.set(product.companySlug, products)
  }

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm font-medium text-primary">Company directory</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Explore the teams behind the products
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Each profile connects a company to its listed products, official sources, and any Watchlist-reviewed updates. Saving a product and following a company remain separate actions.
        </p>
      </header>

      <section aria-label="Companies in the Watchlist">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.slug}
              company={company}
              products={productsByCompany.get(company.slug) ?? []}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
