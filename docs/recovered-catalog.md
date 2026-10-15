# Restored October catalog additions

Five catalog entries and their retained assets were copied without changing their contents from the preserved October 14 source snapshot. The original recovery candidate contained 83 AI SRE products, 34 observability products, and 26 companies. The integrated Open Lens release also preserves PRs #52–#56 and #58: 88 AI SRE products, 34 observability products, and 81 companies.

## Current source checks

The October 15 check reopened the official product documentation for all five, plus AWS directed actions and Autoheal deployment options. The source links in each company record retain their original October 14 check dates. Identity mapping is not capability verification; every product remains editorially unreviewed.

- Autoheal: https://autoheal.ai/use-cases/incident-response and https://autoheal.ai/product
- AWS: https://aws.amazon.com/devops-agent/ and https://docs.aws.amazon.com/devopsagent/latest/userguide/working-with-devops-agent-working-with-directed-actions.html
- Coralogix: https://coralogix.com/docs/user-guides/olly/
- New Relic: https://docs.newrelic.com/docs/agentic-ai/autopilot/overview/
- Google Cloud: https://docs.cloud.google.com/cloud-assist/investigations

All five retained preview images decode as 1152 × 720 pixels and were visually inspected. They are vendor/product research previews, not screenshots of this Watchlist implementation. All SVG files parse as XML; the AWS mark matches the official architecture icon archive byte-for-byte. Asset origins are recorded in public/logos/sources.tsv.

## Retained asset hashes

| Path | SHA256 |
| --- | --- |
| public/screenshots/autoheal.jpg | d6954dd11ed055f80f7d35f93e80eb9531a4e84974e62947794ee51d0de08275 |
| public/logos/autoheal.svg | c8e9a1a90f1b0f1b25f2ff5c2542a9892d00a28df3a9e279be6263a3ac45eaf8 |
| public/screenshots/aws-devops-agent.jpg | 3616498d5a6597df427428f7884d41de0f249552dbf1017912d629b085aa130a |
| public/logos/aws-devops-agent.svg | 11c3744d8f78cf4fe3fb2cbc6cce63020495ee6ad95c684b9d49806f69d98f7c |
| public/screenshots/coralogix-olly.jpg | 68da03589a011bc0067e6ff6ed5bf347c8c5cc56f2d847a03cf1edf516af9db0 |
| public/logos/coralogix-olly.svg | 3d11451dc41c2975e48bd9d0cb3ca61edbb8d5c85f020547343a5f63e384852d |
| public/screenshots/gemini-cloud-assist-investigations.jpg | 5fb2a1ac45a36803d44c3f2e9a361ec978c124a6b553e25d94a0a6fed7eda9fd |
| public/logos/gemini-cloud-assist-investigations.svg | bd00c57cfd1bee2618cc4267e510520e0ee20daf41085e7d983bd92e74d6cbbf |
| public/screenshots/new-relic-autopilot.jpg | 94003bc7e2e07424027af5184b43d1b3f13b56741a0444648b30a1f5afbe6f55 |

## Required deployment gate for save/follow workflows

The YAML catalog drives public pages, but saved products and followed companies use
foreign-key references in PostgreSQL. A successful build or table-only readiness
response does not prove those new references exist. The five additions need the
same catalog-reference synchronization gate as any other catalog change.

An authorized production operator must use the **final merged release tree**, not
this branch's older count if other additions have since merged:

1. Review the no-write plan with `npm run sync:catalog-refs` (this candidate expects
   81 companies and 122 product references, including 34 observability products).
2. Before promoting application traffic, run the additive prepare transaction with
   the already-approved target database: `npm run sync:catalog-refs -- --prepare
   --production --confirm-production-sync=SYNC_CATALOG_REFS`. This checks staged
   compatibility without deactivating references needed by the previous release.
3. After promoting the matching application release, finalize the active set with
   `npm run sync:catalog-refs -- --apply --production
   --confirm-production-sync=SYNC_CATALOG_REFS`, then require
   `npm run verify:catalog-refs` to pass against that same database.
4. Check signed-in save/unsave and follow/unfollow for the new products/companies
   using an authorized test account before declaring the release complete.

These are operator instructions, not permission to write a production database.
No synchronization or live signed-in workflow was executed for this candidate.
The existing parity tests cover missing/stale references; `/api/ready` alone is
not an adequate gate. A Vercel application build does not run this sync itself.
