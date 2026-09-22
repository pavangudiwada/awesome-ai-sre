import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { PublicSiteHeader } from "@/components/watchlist/public-site-header";
import type { WatchlistSearchItem } from "@/components/watchlist/watchlist-search";
import { getCompanies, getProducts, getResources } from "@/lib/catalog";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const products = getProducts();
  const productLogoByCompany = new Map(
    products
      .filter((product) => product.companySlug && product.logo)
      .map((product) => [product.companySlug!, product.logo]),
  );
  const searchItems: WatchlistSearchItem[] = [
    ...products.map((product) => ({
      type: "tool" as const,
      label: product.name,
      description: product.summary,
      href: `/tools/${product.slug}`,
      logoSrc: product.logo,
    })),
    ...getCompanies().map((company) => ({
      type: "company" as const,
      label: company.name,
      description: "Company profile and official sources",
      href: `/companies/${company.slug}`,
      logoSrc: productLogoByCompany.get(company.slug),
    })),
    ...getResources().map((resource) => ({
      type: "resource" as const,
      label: resource.metadata.title,
      description: resource.metadata.description,
      href: `/resources/${resource.metadata.slug}`,
    })),
  ];

  return (
    <>
      <PublicSiteHeader searchItems={searchItems} />
      {children}
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div className="flex max-w-xl flex-col gap-2">
            <p className="font-medium">AI SRE Watchlist</p>
            <p className="text-muted-foreground">A public directory for evaluating AI SRE tools.</p>
            <p className="text-muted-foreground">
              Built with ❤️ by{" "}
              <a
                href="https://www.linkedin.com/in/pavangudiwada"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Pavan Gudiwada
              </a>
            </p>
            <a
              href="https://www.linkedin.com/company/112729107/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-md font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/icons/linkedin.svg"
                width={18}
                height={18}
                alt=""
                aria-hidden="true"
              />
              Follow us on LinkedIn
            </a>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="Footer">
            <Link href="/methodology" className="hover:underline">Methodology</Link>
            <Link href="/editorial-policy" className="hover:underline">Editorial policy</Link>
            <Link href="/submit/correction" className="hover:underline">Submit a correction</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
