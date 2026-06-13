---
version: alpha
name: AI SRE Watchlist Marketplace
description: Elegant, evidence-led marketplace design system for AI SRE, observability, incident response, AIOps, OpenTelemetry, runbook, on-call, and reliability engineering tools.
colors:
  primary: "#0B1220"
  on-primary: "#FFFFFF"
  primary-hover: "#172033"
  secondary: "#4B5563"
  tertiary: "#245BFF"
  tertiary-hover: "#1D4ED8"
  accent: "#0F766E"
  accent-soft: "#CCFBF1"
  warning: "#B45309"
  warning-soft: "#FEF3C7"
  success: "#047857"
  success-soft: "#D1FAE5"
  error: "#B42318"
  error-soft: "#FEE4E2"
  background: "#F7F8FA"
  surface: "#FFFFFF"
  surface-soft: "#F2F4F7"
  surface-raised: "#FFFFFF"
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  text: "#0F172A"
  text-muted: "#64748B"
  text-soft: "#94A3B8"
  focus-ring: "#2563EB"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: -0.03em
  display-md:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: 750
    lineHeight: 1.06
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: 0em
  metadata:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0em
spacing:
  none: 0px
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  gutter: 24px
  page-x: 40px
  page-x-mobile: 16px
  content-max: 1180px
  card-min: 280px
  card-max: 350px
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text}"
  button-tertiary:
    backgroundColor: transparent
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 8px
    height: 40px
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px
    height: 38px
  chip-filter-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px
    height: 38px
  chip-evidence:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px
    height: 26px
  chip-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px
    height: 26px
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
    height: 56px
  card-tool:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 16px
  card-profile-section:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 24px
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 16px
  nav-tab:
    backgroundColor: transparent
    textColor: "{colors.text-muted}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.none}"
    padding: 12px
  nav-tab-active:
    backgroundColor: transparent
    textColor: "{colors.text}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.none}"
    padding: 12px
---

# AI SRE Watchlist Marketplace

## Overview

The AI SRE Watchlist is an elegant, functional marketplace for discovering and evaluating AI SRE, observability, incident response, AIOps, OpenTelemetry, runbook, on-call, and reliability engineering tools.

The design should feel like a high-trust technical marketplace: clean, current, structured, searchable, and evidence-led. It should not feel like a generic awesome-list, a decorative SaaS landing page, or a vendor marketing brochure. The strongest visual reference is a polished marketplace grid with the functional density of an SRE decision tool.

The UI should communicate:

- Curated expertise.
- Engineering credibility.
- Practical comparison.
- Current and verifiable information.
- Calm confidence rather than hype.

The primary audience is SREs, platform engineers, engineering leaders, founders, and technical buyers. The interface should support long-session research, quick lookup, saved tools, alternatives, comparisons, and detailed company/tool profiles.

The best implementation direction is:

- Use the clean marketplace look from the first generated mockup.
- Add the filters, evidence, integrations, and profile-depth from the second generated mockup.
- Avoid the more editorial/community feel from the third generated mockup as the primary direction.

Reference mockups:

```txt
/Users/pavan/.codex/generated_images/019e9c23-aa86-7b31-b3b4-08178a166f8e/ig_06c60e67e68db687016a23e89066388191950a7855817bb4ba.png
/Users/pavan/.codex/generated_images/019e9c23-aa86-7b31-b3b4-08178a166f8e/ig_06c60e67e68db687016a23e919ffd88191a8b55a2f8dc912c3.png
```

## Colors

The palette is a high-contrast neutral system with one primary ink color, one trust-building blue interaction color, and restrained semantic accents for evidence, risk, and status.

- **Primary Ink (`primary`, #0B1220):** Used for primary buttons, active filter states, navigation emphasis, and the strongest visual anchors.
- **Tertiary Blue (`tertiary`, #245BFF):** Used for links, focus, active underlines, and sparse interactive emphasis.
- **Teal Accent (`accent`, #0F766E):** Used for verified/evidence-backed states, integration confidence, and calm success.
- **Background (`background`, #F7F8FA):** Used as the page canvas. It should feel quieter than pure white.
- **Surface (`surface`, #FFFFFF):** Used for cards, inputs, panels, and profile sections.
- **Borders (`border`, #E2E8F0):** Used as the primary separator. The design should rely on borders and spacing more than shadows.
- **Muted Text (`text-muted`, #64748B):** Used for metadata, descriptions, captions, and secondary content.

Use color as signal, not decoration. Status colors must always be paired with text, icons, or labels. Do not rely on red/green alone.

## Typography

Use **Inter** for all primary UI text. Use **JetBrains Mono** only for technical metadata, integration handles, version names, source IDs, timestamps, or small machine-like labels.

Typography should be precise, restrained, and readable:

- Display type is used only for the homepage or major page titles.
- Cards use compact headings and readable descriptions.
- Metadata should be small, muted, and scannable.
- Labels should use weight for structure, not uppercase letter spacing.
- Letter spacing should be `0em` except for rare metadata cases.

Do not scale text with viewport width. Use responsive layout changes instead.

Recommended hierarchy:

- `display-lg`: Homepage hero only.
- `headline-lg`: Directory/page headers.
- `headline-md`: Profile section headers.
- `headline-sm`: Tool card names and compact panels.
- `body-md`: Main readable prose.
- `body-sm`: Card descriptions, table rows, filter descriptions.
- `label-md`: Buttons, chips, tabs, controls.
- `metadata`: Last checked dates, evidence sources, integration IDs.

## Layout

The layout uses a fixed maximum content width on desktop and fluid layout on smaller screens.

Desktop:

- Max content width: `1180px`.
- Page horizontal padding: `40px`.
- Directory pages use a two-column layout: filter sidebar plus results.
- Tool grids use fixed-width cards between `280px` and `350px`.
- Marketplace grids should usually show 3-4 columns depending on available width.
- Profile pages use a main content column plus a key facts/sidebar column when space allows.

Mobile:

- Page horizontal padding: `16px`.
- Filters collapse into a drawer or stacked controls.
- Cards become one column.
- Profile sidebars stack below primary profile content.
- Touch targets should be at least `44px`.

Spacing:

- Use the 4/8px rhythm in the token scale.
- Related controls should be grouped tightly.
- Distinct sections should be separated with larger spacing instead of extra cards.
- Avoid putting cards inside cards.
- Avoid floating page sections as decorative containers.

Primary page patterns:

- Homepage: header, hero search, category pills, featured marketplace grid, growth/SEO entry sections.
- Directory: header, visible search, filter sidebar, results grid/list, saved state.
- Profile: profile header, key facts, tabbed sections, integrations, evidence, releases, alternatives.
- SEO pages: direct-answer intro, comparison/list section, methodology/evidence, related pages.

## Elevation & Depth

Depth should be subtle and structural. This design is border-first, not shadow-heavy.

Use hierarchy in this order:

1. Spacing.
2. Typography.
3. Alignment.
4. Borders.
5. Surface tint.
6. Very subtle shadow only for interactive lift or sticky surfaces.

Tool cards may lift slightly on hover, but the effect must be restrained:

- Translate up by 1-2px.
- Strengthen border color.
- Add a soft shadow if needed.

Sticky headers, sidebars, and drawers can use a light shadow or blur, but avoid glassmorphism-heavy effects.

Do not use decorative blobs, heavy gradients, or dramatic glow effects.

## Shapes

The shape language should feel engineered, modern, and calm.

- Cards: `8px` radius.
- Buttons: `8px` radius.
- Inputs/search: `12px` radius.
- Profile panels: `12px` radius.
- Chips: full pill radius.
- Logos: `8px` or `12px`, depending on size.

Avoid oversized rounded cards. Avoid mixing sharp and very rounded containers on the same surface unless the shape has semantic purpose, such as chips.

Cards should feel like marketplace entries, not soft toy-like tiles.

## Components

### Header

The header should be compact and persistent on desktop.

Required items:

- Logo: `AI SRE Watchlist`.
- Navigation: `Tools`, `Categories`, `Best Tools`, `Alternatives`, `Comparisons`, `Stacks`, `Resources`, `Submit`.
- Search entry or search button.
- GitHub link.
- Optional saved/account icon.

The active nav item should use text weight plus an underline or indicator. Do not indicate active state with color alone.

### Search

Search is a first-class component and must be visible on marketplace and directory pages.

Homepage placeholder:

```txt
Search tools, resources, vendors, OpenTelemetry...
```

Directory placeholder:

```txt
Search tools, integrations, use cases, evidence...
```

Search input requirements:

- Height: `56px` on homepage, `44px` to `48px` in compact contexts.
- Icon at leading edge.
- Optional keyboard shortcut chip.
- Clear focus ring.
- Results should search names, descriptions, categories, integrations, tags, and evidence titles.

### Filter Chips

Use horizontal category chips for top-level browsing:

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

Active chips should use `primary` background and `on-primary` text.

### Filter Sidebar

The `/tools` page should include a filter sidebar on desktop and a filter drawer on mobile.

Filter groups:

- Surface/category.
- Deployment.
- Pricing.
- Evidence.
- Integrations.
- Updated.
- Profile status.

Use checkboxes for multi-select filters, segmented controls for simple mutually exclusive filters, and select menus for compact option sets.

Labels should be visible above fields. Do not rely on placeholder-only controls.

### Tool Card

Each tool card must provide enough information to decide whether to open the profile.

Required card elements:

- Screenshot or visual preview.
- Logo.
- Tool name.
- Vendor/source.
- Short description.
- Category chip.
- Pricing/deployment chip.
- Evidence badge when available.
- Last checked date.
- Save/bookmark button.
- `View profile` affordance.

Optional:

- Verified badge.
- OSS badge.
- Integration chips.
- Rating/score only if meaningful and sourced.

The card title or whole card may link to the profile. The save button must be separately operable.

### Profile Header

Tool profile pages should feel like rich company profiles for AI SRE vendors.

Required profile header elements:

- Logo.
- Tool/company name.
- Verified/claimed badge.
- Short positioning statement.
- Primary CTA: `Visit website`.
- Secondary CTAs: `Save`, `Compare`, `Submit correction`.
- External links: website, GitHub, docs, LinkedIn if available.

### Key Facts Panel

Each profile should include a key facts panel:

- Category.
- Deployment.
- Pricing.
- Open-source status.
- Founded.
- Company size if known.
- Headquarters if known.
- Last checked date.
- Claimed/verified status.
- Security/compliance links.

### Profile Tabs

Use these tabs or equivalent sections:

- Overview
- Integrations
- Evidence
- Case Studies
- Releases
- Blog/Updates
- Pricing
- Alternatives
- Similar Tools

The current tab must be indicated by more than color. Use underline, weight, background, or position.

### Integrations

Integrations are a core marketplace differentiator.

Show integrations as logo chips or compact rows grouped by:

- Observability.
- Incident management.
- Cloud.
- Data.
- Communication.
- CI/CD.
- Ticketing.

Each integration may show name, category, URL, and verified state.

### Evidence

Evidence is a first-class component.

Evidence items should include:

- Type.
- Title.
- Source.
- Date if known.
- URL.
- Short summary.

Evidence types:

- Case study.
- Benchmark.
- Security.
- SOC 2.
- Documentation.
- Public roadmap.
- Customer story.
- Independent report.

Place evidence close to decision points. Avoid unsupported marketing claims.

### Releases And Blog Updates

Use a compact feed style:

- Type: release, blog, news.
- Title.
- Date.
- Summary.
- Link.

For MVP, these can be manually curated. Later, vendors may submit or connect feeds.

### Saved Tools

The save button should be a clear toggle interaction.

MVP behavior:

- Save tool to local state or localStorage.
- Immediate visual feedback.
- Saved page or saved drawer if practical.

Later behavior:

- Auth-backed saved tools.
- Saved searches.
- Research shortlists.

### Compare

Do not make compare prominent unless it leads to meaningful comparison.

Useful comparison fields:

- Category.
- Best for.
- Pricing.
- Deployment.
- Open-source status.
- Integrations.
- Evidence.
- Security/compliance.
- Docs/GitHub.
- Similar tools.

Comparison edits should be reversible. Prefer undo over confirmation dialogs.

### SEO Page Cards And Tables

SEO pages should use concise cards, comparison tables, and direct-answer summaries.

Page families:

- `/best/[slug]`
- `/alternatives/[slug]`
- `/comparisons/[toolA]-vs-[toolB]`
- `/stacks/[slug]`

Each page should serve exactly one search intent.

## Do's and Don'ts

- Do use the clean marketplace visual direction from Option 1.
- Do use the filter, evidence, integration, and profile depth from Option 2.
- Do keep search visible and useful.
- Do make integrations and evidence first-class surfaces.
- Do design profile pages as structured company/tool profiles, not marketing landing pages.
- Do pair status colors with labels, icons, or text.
- Do keep cards between `280px` and `350px` wide on desktop.
- Do make mobile filters accessible through a clear drawer or stacked section.
- Do use semantic links such as `View profile`, `Visit website`, and `Submit correction`.
- Do ensure every clickable element has a visible focus state.
- Do keep SEO pages specific to one intent.
- Do use concise, citable, direct-answer copy on alternatives and comparison pages.
- Don't use decorative gradient blobs.
- Don't make the homepage a generic SaaS hero.
- Don't hide primary desktop navigation behind a hamburger menu.
- Don't put cards inside cards.
- Don't rely on color alone for status.
- Don't make the compare feature prominent unless comparison is implemented.
- Don't publish thin SEO pages that only swap tool names.
- Don't let vendor-claimed profiles become unchecked promotional pages.
- Don't use oversized rounded containers for every section.
- Don't add vague UI copy like "powerful", "seamless", or "next-gen" unless supported by evidence.
