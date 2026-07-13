import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon } from "lucide-react";

import { followCompanyAction } from "@/actions/workflows";
import {
  FollowingCompanyCard,
  WorkspaceEmptyState,
  WorkspaceShell,
} from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { getCompanies, getProductsByCompanySlug } from "@/lib/catalog";
import { getWorkspaceFollowing } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Following", robots: { index: false } };

export default async function FollowingPage() {
  const follows = await getWorkspaceFollowing();
  const companies = new Map(getCompanies().map((company) => [company.slug, company]));
  const visible = follows.flatMap((follow) => {
    const company = companies.get(follow.company_slug);
    return company ? [company] : [];
  });
  return (
    <WorkspaceShell
      activeSection="following"
      title="Following companies"
      description="Company-level update subscriptions. Following is separate from saving or evaluating products."
    >
      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((company) => {
            const product = getProductsByCompanySlug(company.slug)[0];
            return (
              <FollowingCompanyCard
                key={company.slug}
                name={company.name}
                href={`/companies/${company.slug}`}
                logoSrc={product?.logo}
                summary={product?.summary}
                actions={
                  <form action={followCompanyAction}>
                    <input type="hidden" name="companySlug" value={company.slug} />
                    <input type="hidden" name="followed" value="false" />
                    <input type="hidden" name="returnTo" value="/workspace/following" />
                    <Button type="submit" variant="outline">Unfollow</Button>
                  </form>
                }
              />
            );
          })}
        </div>
      ) : (
        <WorkspaceEmptyState
          icon={<Building2Icon />}
          title="No companies followed yet"
          description="Follow a company only when you want reviewed updates from it."
          action={<Button asChild><Link href="/tools">Browse products</Link></Button>}
        />
      )}
    </WorkspaceShell>
  );
}
