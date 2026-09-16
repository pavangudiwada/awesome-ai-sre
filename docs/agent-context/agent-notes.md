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
- Plain PostgreSQL 16 over a server-only `DATABASE_URL`, with Better Auth in
  the `auth` schema. Browser code never receives database credentials or a
  database client.
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

Catalog and asset warnings are regression-gated by exact identities in `config/validation-warning-baseline.json`. Removing an accepted warning needs no baseline change. Add a new identity only when the specific warning is intentionally accepted during review; never trade one removed warning for an unrelated new warning by changing a numeric budget.

## Catalog sources

- AI SRE products: `tools/operate/*.yaml`.
- Curated companies: `tools/companies/*.yaml`.
- Early research cohort: `tools/companies/_early-18.yaml`.
- Observability catalog: `tools/observe/*.yaml`.
- Owned editorial content: `content/**/*.mdx`.
- Catalog loaders under `src/lib/catalog` are strict Zod boundaries. Do not import YAML directly into UI.
- Public catalog content stays file-backed for reviewability and SEO. Plain
  PostgreSQL stores small catalog reference rows used by private workflows and
  analytics foreign keys.
- Current checked baseline: 80 AI SRE products, 34 observability products, and
  18 curated companies. Accepted validation warnings are exact identities in
  `config/validation-warning-baseline.json`; do not replace that guard with a
  count-only allowance.

When adding or changing a company/product:

1. Use the `add-operate-company` skill for `tools/operate` edits.
2. Prefer official documentation, repositories, security pages, and first-party announcements.
3. Do not infer pricing, deployment, integrations, customer outcomes, or evidence status.
4. Add real logo/screenshot sources when available and update `public/logos/sources.tsv`.
5. Run `npm run validate:catalog`, `npm run validate:tools`, `npm run audit:assets -- --max-warnings=4`, and `npm run generate:readme` when counts change.
6. Preview catalog reference changes with `npm run sync:catalog-refs`; apply to a local `DATABASE_URL` only with `npm run sync:catalog-refs -- --apply`.
7. Catalog reference sync runs only through the reviewed VM release procedure.
   Preview with `--dry-run`; apply against the local server-only database only
   after the migration and backup checks pass.

## Database and auth

- Never edit an applied migration. Add ordered SQL files under
  `database/migrations/` and apply them with `npx tsx scripts/migrate-database.ts`.
  The release host needs the native PostgreSQL `psql` client; the runner uses it
  to preserve PL/pgSQL bodies in a single transaction.
- The application is the only database client. Every private workflow query is
  ownership-scoped to the Better Auth session subject; the browser never has a
  Postgres connection or credentials. Private analytics live in the unexposed
  `private` schema.
- Auth supports configured Google and GitHub providers. Email magic links are
  unavailable until both Resend settings are configured; do not imply delivery
  while that provider is disabled. Do not add passwords.
- Better Auth verifies sessions server-side. `TRUST_PROXY=exe` permits only the
  exe proxy's terminal `X-Forwarded-For` address; other deployments use a
  shared fail-closed network bucket.
- Save/follow server actions carry a signed, short-lived pending intent through auth; notes and evaluations do not.
- Production requires exact Better Auth OAuth and magic-link redirect URLs for
  the canonical domain plus intentional preview/local patterns.

## Commands

```bash
npm run dev
npm run check
npm run check:release
npm run test:e2e
npm run validate:catalog
npm run audit:assets -- --max-warnings=4
npm run sync:catalog-refs -- --dry-run
npm run verify:catalog-refs
npm run sync:published-updates -- --dry-run
npm run analytics:company-report
npx tsx scripts/migrate-database.ts
```

## Verification expectations

- A build is not visual proof. Inspect the rendered desktop and 390px mobile result.
- For screenshot-backed surfaces, verify non-zero `naturalWidth` and `naturalHeight`.
- Test Save vs Follow, Bell empty/unread behavior, sign-in split layout, auth redirects, source visibility, correction submissions, and private workspace routes.
- Do not deploy from a dirty checkout. The VM deployer accepts one immutable
  reviewed SHA and verifies health and rollback after cutover.
