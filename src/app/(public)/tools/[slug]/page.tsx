import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  CalendarDaysIcon,
  CheckSquare2Icon,
  CloudIcon,
  Code2Icon,
  ExternalLinkIcon,
  FileCheck2Icon,
  FileQuestionIcon,
  FileTextIcon,
  LibraryIcon,
  MessageCircleQuestionIcon,
  PencilLineIcon,
  ScanSearchIcon,
  TagsIcon,
} from "lucide-react";

import { saveProductAction } from "@/actions/workflows";
import {
  PublicProfileView,
  TrackedOutboundLink,
} from "@/components/analytics/public-events";
import {
  BrandMark,
  EvidenceExplorer,
  OfficialResourcesCard,
  ProductSectionNav,
  ProfileProductActions,
  ProfileSharingCard,
  WatchlistBreadcrumb,
} from "@/components/watchlist";
import { ConnectedProductNoteEditor } from "@/components/workflow/product-note-editor";
import { LockedWorkflowPreview } from "@/components/workflow/locked-workflow-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  getCompanyBySlug,
  getProductBySlug,
  getProducts,
} from "@/lib/catalog";
import {
  companySources,
  evidenceReviewLabel,
  productBadges,
  productEvidenceClaims,
  productResourceLinks,
  sourceLinkedCapabilityClaim,
} from "@/lib/presentation/catalog";
import { getProductWorkflowState } from "@/lib/workflows/queries";

// The profile includes the signed-in visitor's saved products and private note.
export const dynamic = "force-dynamic";

const catalogDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const capabilityIcons = [
  ScanSearchIcon,
  MessageCircleQuestionIcon,
  CheckSquare2Icon,
] as const;

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/tools/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: `/tools/${product.slug}`,
      type: "website",
      images: product.screenshot
        ? [{ url: product.screenshot }]
        : product.logo
          ? [{ url: product.logo }]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.summary,
      images: product.screenshot ? [product.screenshot] : product.logo ? [product.logo] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const company = product.companySlug
    ? getCompanyBySlug(product.companySlug)
    : undefined;
  const workflow = await getProductWorkflowState(product.slug, product.companySlug);
  const canonicalUrl = new URL(
    `/tools/${product.slug}`,
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aisrewatchlist.com",
  ).href;
  const resources = productResourceLinks(product);
  const sources = company ? companySources(company) : [];
  const claims = productEvidenceClaims(product, company);
  const badges = productBadges(product);
  const categoryLabel = badges
    .filter((badge) => badge.label !== "Open source")
    .map((badge) => badge.label)
    .join(" / ") || "Unknown";
  const lastChecked = [...claims]
    .map((claim) => claim.lastCheckedLabel)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const summaryFacts = [
    { label: "Category", value: categoryLabel, icon: TagsIcon },
    {
      label: "Deployment",
      value: product.deployment.length ? product.deployment.join(" / ") : "Unknown",
      icon: CloudIcon,
    },
    { label: "Open source", value: product.openSource ? "Yes" : "No", icon: Code2Icon },
    { label: "Pricing", value: "Unknown", icon: BadgeDollarSignIcon },
  ];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PublicProfileView subject={{ kind: "product", slug: product.slug }} />
      <WatchlistBreadcrumb
        parentHref="/tools"
        parentLabel="Tools"
        currentLabel={product.name}
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <BrandMark
                  name={product.name}
                  src={product.logo}
                  size="profile"
                  className="size-16 sm:size-20"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
                    {product.name}
                  </h1>
                  {company ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      By{" "}
                      <Link href={`/companies/${company.slug}`} className="hover:underline">
                        {company.name}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                {product.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Badge key={badge.label} variant={badge.tone ?? "secondary"}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-52">
              <Button asChild className="h-11 w-full">
                <TrackedOutboundLink
                  href={product.url}
                  target="_blank"
                  rel="noreferrer"
                  subject={{ kind: "product", slug: product.slug }}
                >
                  Visit website
                  <ExternalLinkIcon data-icon="inline-end" />
                </TrackedOutboundLink>
              </Button>
              <ProfileProductActions
                productSlug={product.slug}
                productName={product.name}
                saved={workflow.saved}
                saveAction={saveProductAction}
                evaluationHref={`/workspace/evaluations/new?product=${product.slug}`}
                orientation="vertical"
              />
            </div>
          </header>

          <ProductSectionNav
            evidenceCount={claims.length}
            sourceCount={sources.length}
          />

          <section id="summary" className="scroll-mt-36">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Evaluation summary</CardTitle>
                <CardDescription>
                  The operational details available for an initial product screen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ItemGroup className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {summaryFacts.map(({ label, value, icon: Icon }) => (
                    <Item key={label} variant="muted" className="items-start">
                      <ItemMedia variant="icon">
                        <Icon aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>{label}</ItemDescription>
                        <ItemTitle className="line-clamp-none">{value}</ItemTitle>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>
          </section>

          <section id="capabilities" className="scroll-mt-36">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-xl font-medium tracking-tight">Documented capabilities</h2>
              <p className="text-sm text-muted-foreground">
                Capability language comes from cataloged first-party material and is not performance testing.
              </p>
            </div>
            {product.features.length ? (
              <ItemGroup className="gap-2">
                {product.features.map((feature, index) => {
                  const Icon = capabilityIcons[index] ?? FileTextIcon;
                  const linkedClaim = sourceLinkedCapabilityClaim(feature, claims);
                  return (
                    <Item key={feature} variant="outline" className="items-start">
                      <ItemMedia variant="icon">
                        <Icon aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="line-clamp-none leading-relaxed">
                          {feature}
                        </ItemTitle>
                        <ItemDescription className="line-clamp-none">
                          Review the linked evidence below before relying on this capability in a pilot.
                        </ItemDescription>
                        {linkedClaim ? (
                          <Badge variant="outline">First-party source</Badge>
                        ) : null}
                      </ItemContent>
                    </Item>
                  );
                })}
              </ItemGroup>
            ) : (
              <Alert>
                <FileQuestionIcon />
                <AlertTitle>Capability review pending</AlertTitle>
                <AlertDescription>
                  No reviewed capability list is attached to this profile yet.
                </AlertDescription>
              </Alert>
            )}
          </section>

          <section id="evidence" className="scroll-mt-36">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-xl font-medium tracking-tight">Evidence</h2>
              <p className="text-sm text-muted-foreground">
                Expand a claim to see its interpretation, source count, and review date.
              </p>
            </div>
            <EvidenceExplorer claims={claims} productSlug={product.slug} />
          </section>

          <section id="sources" className="scroll-mt-36">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-xl font-medium tracking-tight">Sources</h2>
              <p className="text-sm text-muted-foreground">
                Primary documentation and first-party pages used for this profile.
              </p>
            </div>
            {sources.length ? (
              <ItemGroup aria-label="Profile sources" className="gap-2">
                {sources.map((source) => (
                  <Item key={source.id} asChild variant="outline" className="min-h-16">
                    <TrackedOutboundLink
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      subject={{ kind: "product", slug: product.slug }}
                    >
                      <ItemMedia variant="icon">
                        <FileTextIcon aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{source.title}</ItemTitle>
                        <ItemDescription>
                          {[source.publisher, source.sourceType, source.accessedAtLabel]
                            .filter(Boolean)
                            .join(" · ")}
                        </ItemDescription>
                      </ItemContent>
                      <ItemMedia variant="icon">
                        <ArrowUpRightIcon aria-hidden="true" />
                      </ItemMedia>
                    </TrackedOutboundLink>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <Alert>
                <LibraryIcon />
                <AlertTitle>No public sources listed</AlertTitle>
                <AlertDescription>
                  Source collection for this profile is still in progress.
                </AlertDescription>
              </Alert>
            )}
          </section>

          {workflow.signedIn ? (
            <ConnectedProductNoteEditor
              productSlug={product.slug}
              productName={product.name}
              initialValue={workflow.note}
            />
          ) : (
            <LockedWorkflowPreview returnTo={`/tools/${product.slug}`} compact />
          )}
        </article>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-1 xl:[&>[data-slot=card]]:shrink-0">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Evaluation actions</CardTitle>
              <CardDescription>
                Add this product to a private evaluation or save it for later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileProductActions
                productSlug={product.slug}
                productName={product.name}
                saved={workflow.saved}
                saveAction={saveProductAction}
                evaluationHref={`/workspace/evaluations/new?product=${product.slug}`}
                orientation="vertical"
                evaluationFirst
                evaluationVariant="default"
                evaluationAriaLabel={`Add ${product.name} to evaluation from the profile sidebar`}
                saveAriaLabel={`Save ${product.name} from the profile sidebar`}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Your notes and evaluations stay private.
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick facts</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemGroup className="gap-2">
                <QuickFact icon={TagsIcon} label="Category" value={categoryLabel} />
                <QuickFact
                  icon={FileCheck2Icon}
                  label="Evidence review"
                  value={evidenceReviewLabel(claims)}
                />
                <QuickFact
                  icon={CalendarDaysIcon}
                  label="Added"
                  value={formatCatalogDate(product.dateAdded)}
                />
                <QuickFact
                  icon={FileTextIcon}
                  label="Last checked"
                  value={lastChecked ? formatCatalogDate(lastChecked) : "Not reviewed"}
                />
              </ItemGroup>
            </CardContent>
          </Card>

          <OfficialResourcesCard
            productName={product.name}
            productSlug={product.slug}
            resources={resources}
          />
          <ProfileSharingCard
            productName={product.name}
            productSlug={product.slug}
            canonicalUrl={canonicalUrl}
          />
          <ProductResearchActions
            productSlug={product.slug}
            companySlug={company?.slug}
          />
        </aside>
      </div>
    </main>
  );
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TagsIcon;
  label: string;
  value: string;
}) {
  return (
    <Item size="xs">
      <ItemMedia variant="icon">
        <Icon aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemDescription>{label}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <span className="max-w-36 text-right text-sm font-medium">{value}</span>
      </ItemActions>
    </Item>
  );
}

function formatCatalogDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? value : catalogDateFormatter.format(date);
}

function ProductResearchActions({
  productSlug,
  companySlug,
}: {
  productSlug: string;
  companySlug?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Research actions</CardTitle>
        <CardDescription>Corrections and company follows stay separate.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant="outline" className="h-11 justify-start">
          <Link href={`/submit/correction?product=${productSlug}`}>
            <PencilLineIcon data-icon="inline-start" />
            Submit a correction
          </Link>
        </Button>
        {companySlug ? (
          <Button asChild variant="outline" className="h-11 justify-start">
            <Link href={`/companies/${companySlug}`}>
              View company and follow updates
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
