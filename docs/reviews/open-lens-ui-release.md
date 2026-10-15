# Open Lens interface release

This UI-only release starts from main `90e90d41` and preserves its catalog and database contracts. The separate integrated catalog release remains in PR #59.

## Visible changes

- Open Lens header/footer/sign-in artwork, Geist typography, semantic light/dark colors, and application icons
- GitHub stars and LinkedIn beside search; a shared responsive search row on mobile
- Resources dropdown containing All resources, Glossary, and Companies
- Compact title/subtitle update notice, with a 44px close target and browser-local per-update dismissal
- Ctrl K or ⌘ K on desktop command search, selected for the platform; navigation-only workspace search does not claim a shortcut
- Public source-linked news, latest-12 bell feed, and public SEO improvements

## Release boundary

The catalog remains 78 AI SRE products, 34 observability products, 21 companies and 112 product references. No catalog, schema, database client, production reference-sync, auth/action implementation, operator or dependency change is required.

The independent main snapshot and this candidate produced the same no-write catalog-reference plan SHA-256: `b478f812939623dcb3510a0dc377afa9f896862b59d89fc14fcb1eff326e06c8`. News records without an existing company identity use their public display names and source links rather than inventing catalog references.

## Verification

Local validation passed 313 tests across 64 files, lint, TypeScript, UI consistency, catalog/assets checks, production build with 162 pages, and tracing of 101 YAML/11 MDX sources in 43 manifests. Exact-head CI, authenticated workflows and desktop/mobile screenshot review are the final merge gates; current results and actual captures are recorded in PR #60.

The automatic README refresh removes an obsolete September “Recent Additions” section; it does not change catalog entries. The signature-tampering test changes a decoded signature byte deterministically instead of a base64url padding digit; verification implementation is unchanged.
