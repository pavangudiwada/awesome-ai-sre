# AI SRE Watchlist product and interface specification

## Product promise

AI SRE Watchlist helps an SRE/platform lead research products, inspect source-linked claims, keep private notes, and run a structured incident-response pilot evaluation. It is a practitioner product first and a future company intelligence/media business second.

The product must feel calm, exact, and editorially independent. It must not look like an AI-generated directory, a vendor brochure, or a generic admin template.

## Trust model

- Public: catalog facts, evidence state, sources, methodology, resources, and reviewed updates.
- Private: saves, notes, evaluations, candidates, decisions, update-read state, and practitioner profile.
- Aggregate: public profile/update/outbound engagement and company follow totals; suppress company reports below 10 distinct daily pseudonyms.
- Forbidden: exposing individual visitors, saves, notes, evaluations, search text, email, or user IDs to companies.
- Unknown is a first-class state. Absence of reviewed evidence must never be converted into confidence.

## Visual system

The codebase uses the official shadcn/ui `radix-nova` preset with the neutral theme and Geist. The supplied historical UI is content/layout reference only.

- Canvas: white/neutral shadcn background.
- Hierarchy: strong ink typography, muted supporting copy, subtle borders, minimal shadow.
- Radius, focus rings, colors, and control variants come from shadcn tokens.
- Page composition uses Tailwind layout utilities only.
- No gradients, ornamental glass effects, arbitrary brand colors, or custom component CSS.
- No public filter/sidebar rail. Category selection is horizontal; advanced filters open an official Sheet.

### Required component mapping

| Need | Official composition |
| --- | --- |
| Desktop primary navigation | `NavigationMenu` |
| Mobile navigation and filters | `Sheet` |
| Account actions | `DropdownMenu` |
| Bell updates | `Popover` desktop, `Sheet` mobile |
| Search | `Field` + `InputGroup` |
| Categories | `ToggleGroup` |
| Sorting | `Field` + `Select` + `SelectGroup` |
| Product/resource/profile containers | complete `Card` composition |
| Evidence, sources, updates, workflow benefits | `ItemGroup` + `Item` |
| Callouts and editorial constraints | `Alert` |
| Empty/loading states | `Empty` / `Skeleton` |
| Forms | `FieldGroup`, `FieldSet`, `Field`, `Input`, `Textarea`, `Select` |
| Tabular evaluation data and MDX tables | `Table` |
| Feedback | Sonner |
| Breadcrumbs | `Breadcrumb` |

## Information architecture

- `/`: product entry point, search, initial cohort, practitioner resources, workflow education.
- `/tools`: searchable/filterable AI reliability directory.
- `/tools/[slug]`: detailed product profile and gated personal workflow.
- `/companies/[slug]`: distinct company follow surface, products, public sources, reviewed updates.
- `/observability` and `/observability/[slug]`: telemetry landscape with the same quality/workflow model.
- `/resources` and `/resources/[slug]`: substantive practitioner guides, scorecards, reports, and checklists.
- `/updates` and `/updates/[slug]`: editorially reviewed feed; honest Empty state before publication.
- `/sign-in`: benefit-led split-screen passwordless authentication.
- `/workspace/saved`, `/workspace/notes`, `/workspace/evaluations`, `/workspace/following`: private practitioner workflow.
- `/settings`: minimal practitioner context.
- `/submit/correction` and `/submit/update`: reviewed contribution forms.
- `/methodology`, `/editorial-policy`, `/privacy`, `/terms`: trust and policy pages.

Do not add thin SEO routes, direct vendor dashboards, practitioner billing, or a company opt-in UI until separately specified.

## Key interaction contracts

### Save

- Subject: product.
- Meaning: private bookmark for later research.
- UI: bookmark action on cards/profile.
- Never implies company follow, evaluation candidacy, or company consent.

### Follow

- Subject: company.
- Meaning: receive Watchlist-reviewed updates for that company.
- UI: company profile action; Bell delivery after a real update exists.
- Empty Bell has no unread badge and no invented notification.

### Evaluation

- Subject: named research decision.
- Fields: name, goal, requirements, risks, decision, ordered product candidates.
- Products enter only through an explicit add-to-evaluation action.

### Note

- One auto-saved private note per practitioner/product.
- Autosave is visible and failures use Sonner.

### Company opt-in

- Separate immutable consent record with one-way revocation.
- Schema only in this version; no practitioner UI.

## Page-quality requirements

### Header

- Official NavigationMenu at desktop.
- Official Sheet at mobile.
- Search, Bell, and account/sign-in remain available without crowding.
- Active route is visible and semantic.

### Product cards

- Fixed 8:5 screenshot area with deterministic fallback.
- Logo/avatar fallback; no broken-image chrome.
- Name, company, concise summary, at most three useful badges.
- Save is top-right and unmistakably separate from View profile.
- Use `Evidence review pending`, not vague missing-date filler.

### Profiles

- Semantic H1, overview, facts, capabilities, evidence, and source list.
- Public evidence must appear before the private workflow gate.
- Website/source outbound links and product-share actions are tracked only as aggregate public events.
- A product-share event records only the product slug. Never record the destination, channel, share text, copied URL, user identity, notes, or search content.
- Pricing and unsupported details remain `Unknown`.

### Authentication

- Desktop: balanced split screen; benefits left, auth Card right.
- Mobile: stacked without overflow.
- Google, GitHub, magic link; no password fields.
- Explain privacy and public/private boundary next to the action.

## Responsive and accessibility acceptance

- 390px minimum tested viewport with no horizontal overflow.
- Primary/mobile actions at least 44px.
- Visible keyboard focus through official components.
- Icon-only buttons have accessible names.
- Dialog/Sheet/Popover surfaces have semantic titles/descriptions.
- Images have useful alt text and decode to non-zero dimensions.
- Motion respects reduced-motion preferences.
- No color-only status meaning.
