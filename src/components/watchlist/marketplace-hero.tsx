import { NewsletterSignup } from "@/components/newsletter/newsletter-signup"

interface MarketplaceHeroProps {
  title?: string
  description?: string
}

export function MarketplaceHero({
  title = "Find the right tools for reliable systems.",
  description = "Explore source-linked AI SRE, observability, and incident-response tools.",
}: MarketplaceHeroProps) {
  return (
    <section id="newsletter" className="border-b bg-muted/30" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1
              id="marketplace-heading"
              className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
            >
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <NewsletterSignup inline />
          <p className="text-sm text-muted-foreground">
            Useful AI SRE product updates, delivered without the noise.
          </p>
        </div>
      </div>
    </section>
  )
}
