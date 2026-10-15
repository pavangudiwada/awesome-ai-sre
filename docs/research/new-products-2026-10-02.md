# New product research — 2026-10-02

Two additions, checked against both catalog families and the open PR #52–54 stack. This batch is based on #54 and preserves its five unresolved company identities. All capability statements are first-party descriptions, not independent tests; both products remain editorially unreviewed.

## ilert AI SRE

- [Current product page](https://www.ilert.com/product/ilert-ai-sre) describes engineer-initiated investigation and proposed findings. Its governance section explicitly marks L1 investigate-and-propose as GA; L2 approved execution and L3 bounded autonomy are not enabled. The record does not promise automatic remediation or automatic alert-triggered investigation.
- [September 14 GA announcement](https://www.ilert.com/blog/ilert-ai-sre-is-generally-available) establishes availability on paid plans and trials, the former Responder name, supported investigation entry points, telemetry/change context, and evidence-linked hypotheses. It uses broader approval wording than the product page; the record follows the narrower current product boundary.
- [Company page](https://www.ilert.com/about-us) establishes ilert as the provider. The AI SRE module is not a second company or a separate Responder entry.

## empirik

- [Product page](https://empirik.ai/product) establishes infrastructure-change analysis, dependency/blast-radius context, state drift, policy-governed workflows, SaaS, and customer VPC availability.
- [September 1 announcement](https://empirik.ai/blog/introducing-empirik-the-autonomous-infrastructure-engineer) establishes the launch and prevention-oriented scope. Customer outcomes and funding are not used as product-performance evidence.
- [Security page](https://empirik.ai/security-and-trust) explicitly distinguishes private SaaS from a customer-managed VPC. The current deployment enum has no VPC value and the UI calls `on-prem` “On-premises,” so the structured filter lists only the confirmed SaaS option and the summary preserves the VPC option. The infrastructure it observes is not confused with where the product runs.
- [Commercial terms](https://empirik.ai/terms-and-conditions) support the non-open-source classification. The official product footer supplies the LinkedIn destination.
- AIOps is the existing broad category that fits. No incident-response category, general-availability date, independent safety claim, or unrestricted autonomous execution is inferred. The current presentation maps Deployment to “Runbooks,” which would mislabel this product; no taxonomy/UI change is bundled into this addition.

## Assets and provenance

Both 1152 × 720 previews are 8:5 captures of the official product pages in the cloud browser on 2026-10-02, with cookie overlays dismissed. They are vendor website previews, not independently operated product sessions. Official vector logos are recorded in `public/logos/sources.tsv`: empirik's linked SVG and ilert's inline navigation SVG. No logos or product screens were generated.

## Validation

Validation results are recorded in the pull request. No merge, release, production database sync, or changes to the earlier draft branches are included.
