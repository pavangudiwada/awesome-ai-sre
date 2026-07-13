# AI SRE Watchlist agent notes

This file is the repository-level source of truth imported by `AGENTS.md`.

## Product boundary

- The first customer is an SRE/platform lead evaluating an AI incident-response pilot.
- Practitioners use the product for free. Do not add practitioner payments or paywalls.
- Public evidence and methodology stay public. Authentication gates only personal workflow.
- `Save product`, `Follow company`, `Evaluation candidate`, and `Company opt-in` are different domain concepts. Never merge them in UI, naming, analytics, or schema.
- Notes, saves, and evaluations are private. Company-facing analytics are aggregate-only and suppress cohorts below 10 distinct daily visitors.
- Product-share analytics records only that a public product was shared. Never attach the destination, channel, share text, URL, user identity, notes, or search content.
- Company changes are submissions for editorial review. There is no direct vendor publishing or company dashboard.
- Payments and vendor monetization are deferred until there is real practitioner traffic.

## Current stack

- Next.js 16 App Router, React 19, strict TypeScript.
- Tailwind CSS 4 and official shadcn/ui `radix-nova` components.
- Official neutral shadcn theme and Geist typography.
- Supabase Postgres + Auth with `@supabase/ssr`.
- Drizzle ORM for typed schema/server-side operator and aggregate queries.
- Zod at every external input boundary.
- Vitest + Testing Library, Playwright desktop Chromium + 390px WebKit.

## UI rules

- Use the installed component in `src/components/ui` before writing visible primitives.
- Run `npx shadcn@latest info --json` and `npx shadcn@latest docs <component>` before adding or changing a shadcn pattern.
- Public navigation uses `NavigationMenu`; mobile navigation and filters use `Sheet`.
- Forms use `FieldGroup`, `Field`, `FieldSet`, and grouped `SelectItem` composition.
- Use `Card`, `Item`, `Alert`, `Empty`, `Badge`, `Table`, `Separator`, `Skeleton`, and Sonner instead of hand-styled equivalents.
- Tailwind is for layout. Use semantic shadcn tokens; do not introduce raw palette classes, inline styles, component CSS files, or a public sidebar.
- `src/app/globals.css` is the only CSS file and should remain the shadcn preset/token file.
- Preserve 44px primary/mobile actions, keyboard focus, semantic headings, accessible overlay titles, and no horizontal overflow at 390px.
- Never display `Verified` from legacy `claimed` data. Only reviewed evidence can create a visible evidence state.

`npm run check:ui` enforces the durable subset of these rules, including no raw interactive primitives, raw breadcrumbs, raw separators, palette classes, inline style props, legacy sidebar imports, or fake verified labels.

## Catalog sources

- AI SRE products: `tools/operate/*.yaml`.
- Curated companies: `tools/companies/*.yaml`.
- Early research cohort: `tools/companies/_early-18.yaml`.
- Observability catalog: `tools/observe/*.yaml`.
- Owned editorial content: `content/**/*.mdx`.
- Catalog loaders under `src/lib/catalog` are strict Zod boundaries. Do not import YAML directly into UI.
- Public catalog content stays file-backed for reviewability and SEO. Supabase stores small catalog reference rows used by private workflows and analytics foreign keys.

When adding or changing a company/product:

1. Use the `add-operate-company` skill for `tools/operate` edits.
2. Prefer official documentation, repositories, security pages, and first-party announcements.
3. Do not infer pricing, deployment, integrations, customer outcomes, or evidence status.
4. Add real logo/screenshot sources when available and update `public/logos/sources.tsv`.
5. Run `npm run validate:catalog`, `npm run validate:tools`, `npm run audit:assets -- --max-warnings=4`, and `npm run generate:readme` when counts change.
6. Sync catalog references locally with `npm run sync:catalog-refs`; use `npm run sync:catalog-refs -- --linked` only after the linked Supabase project is confirmed.

## Database and auth

- Never edit an applied migration. Create migrations with `npx supabase migration new <name>`.
- All exposed public tables use RLS. Private analytics live in the unexposed `private` schema with no anon/auth privileges.
- Auth supports Google, GitHub, and email magic links. Do not add passwords.
- Proxy/session verification uses `getClaims`, not cookie-only `getSession` trust.
- Save/follow server actions carry a signed, short-lived pending intent through auth; notes and evaluations do not.
- Production requires exact Supabase redirect URLs for the canonical domain plus intentional preview/local patterns.

## Commands

```bash
npm run dev
npm run check
npm run check:release
npm run test:e2e
npm run validate:catalog
npm run audit:assets -- --max-warnings=4
npm run sync:catalog-refs -- --dry-run
npm run sync:published-updates -- --dry-run
npm run analytics:company-report
npx supabase db reset --local --no-seed
npx supabase db lint --local --schema public,private --level warning --fail-on error
npx supabase db advisors --local
```

## Verification expectations

- A build is not visual proof. Inspect the rendered desktop and 390px mobile result.
- For screenshot-backed surfaces, verify non-zero `naturalWidth` and `naturalHeight`.
- Test Save vs Follow, Bell empty/unread behavior, sign-in split layout, auth redirects, source visibility, correction submissions, and private workspace routes.
- Do not publish or deploy from an unlinked/unverified Vercel checkout.
