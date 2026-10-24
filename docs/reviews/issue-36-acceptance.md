# Issue 36: current v1 acceptance matrix

This matrix follows the current product boundary in `docs/agent-context/agent-notes.md` and `docs/agent-context/design.md`, with runtime status cross-checked against `docs/agent-context/implementation.md`.

| Current v1 acceptance | Current implementation | Regression evidence |
| --- | --- | --- |
| Public catalog facts, sources, and methodology remain available without signing in. | File-backed public catalog and editorial routes; authentication gates personal workflow. | Public route and sign-in coverage in `tests/e2e/trust-workflows.spec.ts`; catalog and evidence content remain covered by catalog validation. |
| Save is a private product bookmark; it is independent of company Follow. | `saved_products` and `company_follows` have separate stores and actions. | `tests/e2e/authenticated-workflows.spec.ts`: pending Save and Follow, save persistence across reauthentication, removal, empty state after reload, and a second practitioner's empty list. |
| Notes are private, one per practitioner and product, and editable after reopening. | Product note autosave is keyed by practitioner and product. | `tests/e2e/authenticated-workflows.spec.ts`: save, edit, reload, cross-practitioner empty state, and blank-note deletion. |
| Evaluations are private decision briefs with explicitly added, ordered product candidates. | PostgreSQL evaluation rows and ordered candidate rows are queried with practitioner ownership. | `tests/e2e/authenticated-workflows.spec.ts`: create, edit, candidate ordering after reload, second-practitioner 404 without private fields, candidate removal, and evaluation deletion. `scripts/test-direct-postgres.ts`: ownership rejection and retained owner candidate. |
| Company opt-in is distinct consent and has no practitioner-facing UI in v1. | Consent schema is separate; the interface is deferred. | Explicitly deferred by `docs/agent-context/design.md`; no opt-in UI acceptance is claimed. |
| Private workflow persistence uses server-owned PostgreSQL authorization with Better Auth sessions. | Runtime uses ordered plain-Postgres migrations and ownership-scoped server queries. | Local direct-Postgres ownership checks and the loopback-only authenticated browser harness. |

## Superseded acceptance language

Historical ADR 9 and earlier issue wording are not the current v1 contract where they describe Supabase/RLS runtime ownership, private evidence, company Follow as product consent, notes attached to evaluations, or a company opt-in UI. The current architecture and product boundary above supersede those descriptions; public evidence remains public, notes remain per product, and opt-in UI remains deferred.

## Proof boundary

Authenticated browser coverage uses the local Better Auth test harness, loopback PostgreSQL, fixture practitioners, and captured one-time sign-in URLs. It verifies the local application flow and ownership behavior. It does not prove real OAuth-provider callbacks, production magic-link email delivery, deployed production configuration, or production database parity.
