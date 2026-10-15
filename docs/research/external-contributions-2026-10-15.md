# External contribution review: 15 October 2026

## Scope and attribution

The current-main catalog was compared with all 17 external pull requests and
three external issues. Previously accepted suggestions are already present;
Anyshift and emisar were the two missing product suggestions. These are new,
independently sourced catalog records, credited to the original contributors:

- [Anyshift #43](https://github.com/pavangudiwada/awesome-ai-sre/pull/43),
  submitted by [lerenn](https://github.com/lerenn), closed by that author on
  26 August 2026 without a merge
- [emisar #44](https://github.com/pavangudiwada/awesome-ai-sre/pull/44),
  submitted by [AndrewDryga](https://github.com/AndrewDryga), closed by that
  author on 7 September 2026 without a merge

Neither closure is represented as a maintainer rejection. The withdrawn branches
are not reopened or merged. Their obsolete generated README diffs are not reused.
No vendor code or dependencies are imported.

## Anyshift

- [Product](https://www.anyshift.io/) and
  [documentation](https://docs.anyshift.io/pages/overview) support incident
  investigation, alert triage, deployment checks, and a versioned production graph
- [Context interfaces](https://www.anyshift.io/product/context) explicitly list
  MCP, CLI, and SDK
- Primary category: Incident Response; additional tags: AIOps and Observability
- Keep `opensource: false`: a public organization or client integration does not
  establish an open-source license for the hosted product
- Keep SaaS as the catalog deployment. The
  [FAQ](https://docs.anyshift.io/pages/privacy_security/faq) discusses Enterprise
  options including VPC agents; this does not justify a blanket claim that the
  whole platform is self-hosted or air-gapped
- The old submitted GitHub/social destinations are not assumed current. The
  LinkedIn destination is linked from the current first-party site
- The company mapping uses the public Anyshift brand and official company page

## emisar

- [Product](https://emisar.dev/) and [about](https://emisar.dev/about) establish
  scoped agent actions, approval policies, host-side controls, and audit records
- Primary category: Security; additional tag: Deployment. This is an agent
  infrastructure access layer, not a claim of an autonomous RCA product
- Hybrid means a hosted control plane plus customer-host runners. The product FAQ
  explicitly says supported self-hosted and air-gapped control planes are not
  generally available
- [License](https://github.com/AndrewDryga/emisar/blob/main/LICENSE.md) identifies
  Apache-2.0 runner, MCP bridge, and packs, with Business Source License 1.1 for
  the other repository content. Keep `opensource: false` for the whole product
- The vendor mapping is to the emisar project/brand described by founder Andrii
  Dryga; it does not assert a separately incorporated company

## Media and integrity

Official-page previews were captured on 15 October 2026 in the cloud browser and
normalized to 1152 × 720 (8:5). They show public vendor marketing pages, not an
independent product trial or logged-in customer session. Logos were downloaded
from the current first-party pages, with provenance in `public/logos/sources.tsv`.
SVGs contain static vector shapes only: no scripts, event handlers, external
references, or embedded foreign objects. Brand assets remain their owners'
property and are used for catalog identification; no software license grant for
trademarks is inferred. Existing catalog evidence states are unchanged.

## Separate open contribution

[Edge Delta #57](https://github.com/pavangudiwada/awesome-ai-sre/pull/57) changes
only its two-line summary. Its telemetry/AI-teammate and approval-gated remediation
claims are supported by the [official product](https://edgedelta.com/) and
[remediation documentation](https://docs.edgedelta.com/autonomous-remediation/).
It remains separate: fork CI awaits maintainer approval and the Vercel preview
requires contributor authorization. This change does not bypass either gate or
copy that contribution into a replacement.

## Build prerequisite

The current-main production build fails Next.js route-module validation because
`src/app/api/events/route.ts` exports two internal helpers. Apply the same minimal
compatibility fix already present in [PR #52](https://github.com/pavangudiwada/awesome-ai-sre/pull/52):
make `ANALYTICS_EVENT_MAX_BODY_BYTES` and `analyticsNetworkSource` module-private.
Only `POST` remains exported. No implementation, request handling, trusted-proxy
behavior, rate-limit policy, or database behavior changes. Existing handler tests
exercise the public route seam.
