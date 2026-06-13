Below is a self-contained implementation brief you can hand to another agent.

**Implementation Brief**
Build `The AI SRE Watchlist` into an elegant, functional AI SRE marketplace: a place for SREs, platform engineers, founders, and buyers to discover, compare, save, and evaluate AI SRE, observability, incident response, AIOps, OpenTelemetry, runbook, and reliability tooling.

The product should feel like **Toolfinder for AI SRE**, with the visual elegance of the first mockup and the functional depth of the second mockup.

Reference visuals:
- Option 1 visual base: `docs/agent-context/marketplace-visual-base.png`
- Option 2 functional depth: `docs/agent-context/profile-functional-reference.png`

**Core Product Direction**
This is not just an awesome-list. It should become a structured marketplace where:
- Users discover the best tools/resources for a specific SRE problem.
- Each company/tool gets a rich profile page.
- Users can save tools and searches.
- SEO pages capture growth queries like “Best PagerDuty Alternatives”, “Best incident response AI tools”, and “PagerDuty vs Rootly”.
- Vendors can eventually claim profiles and add releases, case studies, integrations, screenshots, and blog updates.

Build in phases. Do not start with vendor dashboards.

**Recommended MVP**
Implement these first:

1. Marketplace browse page
2. Tool/company profile page
3. Search and filters
4. Save/bookmark tool interaction
5. Basic compare shortlist or saved list
6. SEO page templates for:
   - `/best/[slug]`
   - `/alternatives/[slug]`
   - `/comparisons/[toolA]-vs-[toolB]`
7. Data model that supports future vendor-owned profiles

**Primary Routes**
Use this route structure:

```txt
/
  Marketplace homepage / browse surface

/tools
  Full searchable directory

/tools/[slug]
  Tool/company profile page

/categories/[slug]
  Category landing page, e.g. /categories/incident-response-ai

/best/[slug]
  SEO roundup page, e.g. /best/incident-response-ai-tools

/alternatives/[slug]
  SEO alternatives page, e.g. /alternatives/pagerduty

/comparisons/[toolA]-vs-[toolB]
  SEO comparison page, e.g. /comparisons/pagerduty-vs-rootly

/stacks/[slug]
  Curated stack page, e.g. /stacks/startup-sre-stack

/resources
  Guides, blogs, reports, learning resources

/submit
  Submit a tool/resource

/account/saved
  Saved tools/searches, later auth-gated
```

**Visual Direction**
Use Option 1 as the base:
- Clean white or very light neutral background.
- Strong black/charcoal typography.
- Marketplace-style cards with screenshot preview areas.
- Horizontal category pills.
- Polished header with global search.
- Minimal shadows, subtle borders, 6-8px radius.
- Avoid decorative gradients, purple-heavy SaaS styling, and oversized marketing hero sections.

Add Option 2’s functional details:
- Left-side or collapsible filter panel on `/tools`.
- Evidence badges.
- Integration chips.
- Pricing/deployment metadata.
- Tool detail side panel or full profile page.
- Risk/fit/evidence indicators only where meaningful.

Typography:
- Use Inter or similar for UI.
- Use a mono font only for metadata, version names, integrations, or technical labels.
- Keep body text readable at 14-16px.
- Use restrained font weights, not huge type everywhere.

**Homepage Layout**
The homepage should be a marketplace entry point, not a marketing landing page.

Sections:
1. Header
   - Logo: `AI SRE Watchlist`
   - Nav: Tools, Categories, Best Tools, Alternatives, Comparisons, Stacks, Resources, Submit
   - Search
   - GitHub link
   - Optional account/save icon

2. Hero
   - H1: `Find the AI tools that improve reliability.`
   - Subcopy: `A curated marketplace for AI SRE, observability, incident response, and reliability engineering resources.`
   - Large search input: `Search tools, resources, vendors, OpenTelemetry...`

3. Category pills
   - All
   - AI SRE
   - Observability
   - Incident AI
   - AIOps
   - OpenTelemetry
   - Runbooks
   - On-call
   - OSS
   - Learning

4. Featured / editor picks
   - 4-8 high-quality cards

5. Main marketplace grid
   - Cards with screenshot/logo, title, vendor/source, short description, category, pricing, evidence, integrations, saved button

6. Growth/navigation blocks
   - Best tools
   - Alternatives
   - Comparisons
   - SRE stacks
   - Latest releases/resources

**Tool Card Requirements**
Each card should show enough to help users decide whether to open the profile.

Fields:
```ts
{
  name: string
  slug: string
  logoUrl?: string
  screenshotUrl?: string
  shortDescription: string
  vendorName?: string
  categories: string[]
  tags: string[]
  pricingModel?: "Free" | "Open Source" | "Freemium" | "Paid" | "Enterprise"
  deployment?: "Cloud" | "Self-hosted" | "Hybrid" | "Open source"
  integrations?: string[]
  evidenceBadges?: string[]
  lastCheckedAt?: string
  verified?: boolean
  featured?: boolean
}
```

Card UI:
- Preview image at top.
- Logo + name.
- 1-2 line description.
- Category chip.
- Pricing/deployment chip.
- Evidence badge, e.g. `Case study`, `Benchmark`, `SOC 2`, `OSS`, `Public roadmap`.
- Save/bookmark button.
- CTA: `View profile`.

Do not make “Compare” prominent unless the implementation supports meaningful comparison.

**Tool Profile Page**
This is the most important page. Think “LinkedIn/company profile for AI SRE vendors,” but without social posting.

Profile layout:
1. Header section
   - Logo
   - Tool/company name
   - Verified/claimed badge if applicable
   - Short positioning
   - Primary CTA: `Visit website`
   - Secondary: `Save`, `Compare`, `Submit correction`

2. Key facts panel
   - Category
   - Deployment
   - Pricing
   - Open source status
   - Founded
   - Company size if known
   - Last checked
   - Website/GitHub/docs links

3. Tabs
   - Overview
   - Integrations
   - Evidence
   - Case Studies
   - Releases
   - Blog/Updates
   - Pricing
   - Alternatives
   - Similar Tools

4. Overview
   - What it does
   - Best for
   - Who uses it
   - Core capabilities
   - Screenshots

5. Integrations
   - Show integration logos/chips.
   - Group by type: Observability, Incident Management, Cloud, Data, Communication, CI/CD.
   - Examples: Slack, PagerDuty, Datadog, Grafana, Prometheus, OpenTelemetry, Kubernetes, AWS, GCP, Azure, Jira, ServiceNow.

6. Evidence
   - Case studies
   - Benchmarks
   - SOC 2 / security pages
   - Public roadmap
   - Docs links
   - Customer stories
   - Independent reviews
   - Each claim should have source/date if possible.

7. Releases / Blog
   - Vendor can later submit RSS/blog/release feed.
   - For MVP, manually store items.
   - Show title, date, type, summary, link.

8. Alternatives / Similar Tools
   - Link to `/alternatives/[slug]`.
   - Show 4-8 comparable tools.

**Profile Data Model**
Use a structured data source. Start with local JSON/TS/MDX if easiest; design it so it can later move to a database.

```ts
type ToolProfile = {
  id: string
  slug: string
  name: string
  vendorName?: string
  logoUrl?: string
  screenshotUrls: string[]
  websiteUrl?: string
  githubUrl?: string
  docsUrl?: string
  description: string
  longDescription?: string
  categories: string[]
  tags: string[]
  useCases: string[]
  bestFor: string[]
  pricingModel?: string
  deployment?: string[]
  openSource?: boolean
  verified?: boolean
  claimed?: boolean
  lastCheckedAt?: string

  integrations: {
    name: string
    category: string
    url?: string
    verified?: boolean
  }[]

  evidence: {
    type: "case-study" | "benchmark" | "security" | "docs" | "roadmap" | "customer-story" | "report"
    title: string
    url: string
    source?: string
    date?: string
    summary?: string
  }[]

  updates: {
    type: "release" | "blog" | "news"
    title: string
    url: string
    date: string
    summary?: string
  }[]

  alternatives: string[]
  similarTools: string[]
}
```

**Search And Filters**
Search should be global and visible. Filters should live on `/tools` and category pages, not clutter the header.

Filters:
- Surface/category: Incident AI, Observability, AIOps, Runbooks, OpenTelemetry
- Deployment: Cloud, self-hosted, hybrid, OSS
- Pricing: Free, OSS, freemium, paid, enterprise
- Evidence: Case study, benchmark, SOC 2, public roadmap, docs
- Integrations: Slack, PagerDuty, Datadog, Grafana, Prometheus, OpenTelemetry, Kubernetes
- Updated: Last 30/90/180 days
- Company profile: claimed, verified, unclaimed

Search behavior:
- Search name, description, tags, categories, integrations, evidence titles.
- Empty state should suggest related categories.
- Save search can be fake/local in MVP.

**Saved Tools / Compare**
MVP:
- Bookmark/save button on cards and profile pages.
- Store in local state/localStorage if auth is not ready.
- Saved page lists saved tools.

Compare should only be implemented if useful. Good comparison fields:
- Category
- Best for
- Pricing
- Deployment
- Open source
- Integrations
- Evidence
- Security/compliance
- Docs/GitHub
- Similar tools

Avoid a floating “compare shortlist” if it does not lead to a real comparison page.

**SEO Architecture**
Use Toolfinder’s model but adapt to AI SRE.

Page families:
```txt
/best/incident-response-ai-tools
/best/observability-tools-for-startups
/best/opentelemetry-tools
/best/aiops-tools
/best/on-call-management-tools
/best/runbook-automation-tools

/alternatives/pagerduty
/alternatives/datadog
/alternatives/grafana-cloud
/alternatives/new-relic
/alternatives/opsgenie
/alternatives/rootly

/comparisons/pagerduty-vs-rootly
/comparisons/datadog-vs-grafana-cloud
/comparisons/new-relic-vs-datadog
/comparisons/signoz-vs-grafana
/comparisons/opsgenie-vs-pagerduty

/stacks/startup-sre-stack
/stacks/open-source-observability-stack
/stacks/kubernetes-observability-stack
/stacks/incident-response-stack
```

SEO rules:
- One search intent gets one canonical URL.
- Do not create thin programmatic pages that only swap names.
- Each SEO page must have a distinct answer and real content.
- Add structured data where appropriate:
  - `SoftwareApplication`
  - `Product`
  - `BreadcrumbList`
  - `ItemList`
  - `FAQPage` only if there are real FAQs
- Every profile page needs unique title/meta description.
- Every alternatives page should explain why someone is looking for alternatives, then list tools by fit.

This follows the prior CandleKeep SEO guidance: “best”, “review”, and “vs” queries are distinct commercial-investigation intents (SEO for AI Agents, p. 3), and each intent should map to one URL (SEO for AI Agents, p. 24).

**SEO Page Template: Alternatives**
Example: `/alternatives/pagerduty`

Sections:
1. H1: `Best PagerDuty Alternatives for AI SRE and Incident Response`
2. Short direct answer: who should consider alternatives and why.
3. Quick comparison table.
4. Best alternatives list.
5. When to choose each alternative.
6. Integration comparison.
7. Pricing/deployment notes.
8. Evidence/case study links.
9. FAQ.
10. Links to related comparisons.

**SEO Page Template: Best**
Example: `/best/incident-response-ai-tools`

Sections:
1. H1: `Best Incident Response AI Tools`
2. Direct recommendation summary.
3. Filters or “best for” categories.
4. Ranked/listed tool cards.
5. Methodology.
6. Comparison table.
7. Related categories.
8. FAQ.

**SEO Page Template: Comparison**
Example: `/comparisons/pagerduty-vs-rootly`

Sections:
1. H1: `PagerDuty vs Rootly`
2. Direct differentiator in the first paragraph.
3. Summary table.
4. Best for PagerDuty.
5. Best for Rootly.
6. Feature comparison.
7. Integrations.
8. Pricing/deployment.
9. Evidence/security.
10. Alternatives to both.

For X-vs-Y pages, start with the actual comparison, not generic background (SEO for AI Agents, p. 19).

**Vendor Account Future**
Do not build this first, but keep the data model ready.

Future vendor features:
- Claim profile.
- Edit company overview.
- Add screenshots.
- Add integrations.
- Add case studies.
- Add releases/blog posts.
- Add security/compliance links.
- Submit corrections.
- “Verified by AI SRE Watchlist” status after review.

Important: vendor profile updates should be moderated. Do not let claimed profiles become unchecked marketing pages.

**Monetization Paths**
Potential future revenue:
- Sponsored placement, clearly labeled.
- Vendor profile claim/Pro profile.
- Deal/referral/affiliate links.
- Lead-gen forms.
- Premium research reports.
- Buyer shortlists.
- API/data access.
- Newsletter sponsorships.

But the first goal is user value. Companies will only care after the marketplace has traffic and credibility.

**Implementation Phases**
Phase 1: Visual marketplace redesign
- Implement homepage and `/tools`.
- Add cards, filters, search, category pills.
- Use local data.
- Add save/bookmark locally.
- Make it look polished.

Phase 2: Tool profiles
- Implement `/tools/[slug]`.
- Add profile tabs.
- Add integrations/evidence/releases sections.
- Add related tools.

Phase 3: SEO templates
- Add `/best/[slug]`, `/alternatives/[slug]`, `/comparisons/[slug]`.
- Generate pages from curated content, not empty templates.
- Add metadata and structured data.

Phase 4: Accounts
- Add user auth.
- Saved tools/searches.
- Compare pages.

Phase 5: Vendor workflows
- Vendor claim.
- Profile editing.
- Submission moderation.

**Acceptance Criteria**
The implementation is successful when:
- Homepage feels like an elegant marketplace, not a generic awesome-list.
- Search is visible and useful.
- Cards show enough metadata to decide whether to click.
- Tool profile pages feel rich and credible.
- Integrations and evidence are first-class.
- SEO pages are real content pages, not thin auto-generated shells.
- Mobile layout works: filters collapse, cards remain readable, touch targets are 44px+.
- Accessibility basics are covered: semantic nav, visible focus states, keyboard-operable buttons, color not used alone for status.
- No decorative gradient blobs or generic SaaS hero excess.
- The first build is achievable without implementing full vendor accounts.

**Design Decision**
Use **Option 1 as the visual foundation** and **Option 2 as the information architecture foundation**.

That means:
- Option 1’s clean marketplace grid, white space, and card polish.
- Option 2’s filters, evidence, integrations, profile tabs, and decision-support metadata.
both Open 1 and Option 2 are images present in the folder
