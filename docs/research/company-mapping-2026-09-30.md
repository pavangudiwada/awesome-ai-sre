# Company mapping research — 2026-09-30, completed 2026-10-02

Issue #50 follow-up, based on PR #53. 47 of the remaining 52 unmapped products now have explicit first-party-backed company mappings. Original source checkedAt dates are 2026-09-30; Vigiles was checked on 2026-10-02. This confirms vendor identity only; legacy claimed data never becomes reviewed capability evidence. Product content, slugs and availability assertions remain unchanged.

## Resolved mappings

| Product slug | Company identity | Official identity evidence |
| --- | --- | --- |
| alertd | AlertD (alertd) | [Official product website](https://www.alertd.ai/) |
| aurora | Arvo AI (arvo-ai) | [Official product website](https://www.aurorasre.ai) |
| autonomops-ai | AutonomOps AI (autonomops-ai) | [Official vendor identity source](https://autonomops.ai/terms/) |
| bacca-ai | Bacca.ai (bacca-ai) | [Official product website](https://www.bacca.ai) |
| beeps | Beeps (beeps) | [Official product website](https://beeps.dev:443/) |
| bigpanda | BigPanda (bigpanda) | [Official vendor identity source](https://docs.bigpanda.io/) |
| cloudgeni | Cloudgeni (cloudgeni) | [Official product website](https://cloudgeni.ai) |
| cloudship-ai | CloudShip AI (cloudship-ai) | [Official vendor identity source](https://www.cloudshipai.com/about) |
| cokpit | Cokpit (cokpit) | [Official product website](https://cokpit.ai) |
| cutover | Cutover (cutover) | [Official product website](https://cutover.com/) |
| dagknows-inc | DagKnows (dagknows) | [Official product website](https://dagknows.ai) |
| deductive-ai | Elastic (elastic) | [Official product website](https://www.elastic.co/observability); [Completed acquisition of Deductive AI](https://ir.elastic.co/News--Events/news/news-details/2026/Elastic-Completes-Acquisition-of-Deductive-AI/default.aspx) |
| deeptrace | Deeptrace (deeptrace) | [Official product website](https://deeptrace.com) |
| edge-delta | Edge Delta (edge-delta) | [Official product website](https://edgedelta.com/) |
| harness-ai-sre | Harness (harness) | [Official vendor identity source](https://www.harness.io/products/ai-sre) |
| incidentfox | IncidentFox (incidentfox) | [Official product website](https://www.incidentfox.ai) |
| knoxops | Knox (knox) | [Official product website](https://knoxops.app/) |
| lens-k8s-ide | Mirantis (mirantis) | [Official vendor identity source](https://lenshq.io/products/lens-k8s-ide/) |
| lightrun | Lightrun (lightrun) | [Official vendor identity source](https://docs.lightrun.com/) |
| logz-io | Logz.io (logz-io) | [Official product website](https://logz.io) |
| metoro | Metoro (metoro) | [Official product website](https://metoro.io) |
| mezmo | Mezmo (mezmo) | [Official product website](https://www.mezmo.com) |
| nofire-ai | NOFire AI (nofire-ai) | [Official product website](https://www.nofire.ai) |
| nudgebee | NudgeBee (nudgebee) | [Official product website](https://www.nudgebee.com) |
| obot | Obot AI (obot-ai) | [Official vendor identity source](https://obot.ai/about-us/) |
| observe-inc | Snowflake (snowflake) | [Observe by Snowflake official product website](https://www.observeinc.com); [Official vendor identity source](https://www.snowflake.com/en/product/observe/) |
| ops0 | ops0 (ops0) | [Official product website](https://ops0.com/) |
| opsy | Opsy (opsy) | [Official product website](https://opsy.sh) |
| phoebe | Phoebe Technology Limited (phoebe-technology) | [Legacy Phoebe domain redirects to Coral](https://phoebe.ai); [Official vendor identity source](https://withcoral.com/terms) |
| prodrescue-ai | ProdRescue AI (prodrescue-ai) | [Official product website](https://www.prodrescueai.com) |
| robinrelay | RobinRelay (robinrelay) | [Official product website](https://www.robinrelay.ai/) |
| rubixkube | RubixKube (rubixkube) | [Official product website](https://rubixkube.ai) |
| runllm | RunLLM, Inc. (runllm) | [Official vendor identity source](https://herald.dev/) |
| scoutflo | Scoutflo (scoutflo) | [Official product website](https://scoutflo.com) |
| sherlocks-ai | Sherlocks.ai (sherlocks-ai) | [Official product website](https://www.sherlocks.ai/) |
| sixta | SIXTA (sixta) | [Official product website](https://www.sixta.ai/) |
| skyflo-ai | Skyflo.ai (skyflo-ai) | [Official product website](https://skyflo.ai) |
| sre-ai | SRE.ai (sre-ai) | [Official product website](https://www.sre.ai) |
| stackgen | StackGen (stackgen) | [Official product website](https://stackgen.com) |
| stakpak | Stakpak (stakpak) | [Official product website](https://stakpak.dev/) |
| starsling | StarSling (starsling) | [Official product website](https://starsling.dev/) |
| steadwing | Steadwing (steadwing) | [Official product website](https://www.steadwing.com) |
| tierzero-ai | TierZero AI (tierzero-ai) | [Official product website](https://www.tierzero.ai) |
| tracer-cloud | Tracer (tracer-cloud) | [Official product website](https://www.tracer.cloud) |
| vibranium-labs | Vibranium Labs (vibranium-labs) | [Official product website](https://vibraniumlabs.ai) |
| wild-moose | Wild Moose (wild-moose) | [Official product website](https://www.wildmoose.ai) |

| vigiles | Vigiles Pte. Ltd. (vigiles) | [Official terms, section 8](https://vigileshq.com/terms); [Official about page](https://vigileshq.com/about) — checked 2026-10-02 |

## Identity decisions

- Deductive AI joins the existing Elastic record. Elastic’s first-party investor announcement explicitly states completion on August 24, 2026. The web retrieval returned the primary announcement; direct shell retrieval returned 403, so this is not recorded as shell-reachable. The linked Elastic blog describes an agreement and is insufficient by itself to prove completion. Deductive stays listed as its own product.
- Aurora’s official footer identifies Arvo AI. Lens identifies Mirantis in its official product footer. Observe identifies itself as Observe by Snowflake; the Snowflake product page corroborates the relationship. OpenObserve remains a separate vendor.
- RunLLM redirects to Herald, whose footer still identifies RunLLM, Inc. The curated RunLLM product is preserved, with the company website pointing to its actual redirect destination.
- Phoebe redirects to Coral. Coral’s official terms and privacy policy explicitly name Phoebe Technology Limited trading as Coral. This establishes the legal identity without asserting that the legacy AI SRE product is retired or still available.
- Stakpak’s website says it is joining Vercel. No completed ownership statement from Vercel was verified in this pass. Its branded provider remains Stakpak; do not equate an announcement with a completed acquisition.
- Vigiles now has explicit first-party ownership evidence in its terms and about page. The original homepage 403 remains an observed access failure; web retrieval of the official terms identifies the provider and intellectual-property owner. Its product claimed:false is unchanged.
- BigPanda homepage returned 403. Its official documentation returned 200 and explicitly identifies BigPanda. Lightrun homepage had a TLS protocol failure; official documentation returned 200 and identifies Lightrun, Inc. No block was bypassed.
- Cloudgeni, Scoutflo and Knox homepage HTML contained only an application shell. Their rendered official sites were read in the isolated in-app browser and provided branded provider identity. No founder/legal entity was inferred.

## Remaining five warnings

| Product | Observed evidence | Why mapping remains unresolved |
| --- | --- | --- |
| Ingero | Original homepage fetch failed TLS and the old repository returned 404. The subsequent packet identifies current GPU inference positioning and an Apache-2 GPU estimator repository. | The current source does not establish the catalog’s historical eBPF product or its provider. Retain scope/owner review; do not infer shutdown. |
| K8sGPT | https://github.com/k8sgpt-ai/k8sgpt is accessible and describes the open-source project | A project/maintainer organization does not establish a commercial company. Needs an explicit steward/vendor relationship model rather than an invented owner. |
| kagent | https://kagent.dev identifies a CNCF sandbox project, created at Solo.io and held as a series of LF Projects, LLC | Creation, stewardship and commercial vendor are different relationships. Do not assign Solo.io as the current company without a product-vendor statement. |
| KubeStellar Console | https://github.com/kubestellar/console is accessible and describes the project | Accessible project evidence does not establish a single company provider. Preserve the project and leave commercial ownership unresolved. |
| SRE Bench | https://srebench.com redirects to https://www.srebench.com/ with benchmark content and an organization link | No company/provider identity beyond project branding. Do not present a research benchmark as a verified commercial vendor. |

## Validation and UI

Catalog: 79 products, 34 observability products, 72 companies, zero errors and five retained exact warning identities. Every mapped product appears in exactly one company; Robusta/HolmesGPT and Elastic/Deductive share identities. Removed only the 47 resolved warning identities from the baseline. README generation leaves product content/count unchanged.

Screenshot-grounded correction: adding Deductive initially made Elastic show Deductive’s alphabetically first logo/preview. Company headers and directory cards now select assets only from a product matching the company slug or name, and otherwise use existing initials. This avoids labeling a subsidiary logo as its parent. Company profiles without a matching preview omit the empty hero panel while preserving their product previews below. Regression tests cover both cases and preserve unreviewed evidence status.

## Exception evidence update — 2026-10-02

The supplied first-party packet narrows the remaining five exceptions without inventing companies:

- [K8sGPT governance](https://github.com/k8sgpt-ai/k8sgpt/blob/main/GOVERNANCE.md) describes community, vendor-neutral governance.
- [kagent enterprise](https://kagent.dev/enterprise) and [CNCF project](https://www.cncf.io/projects/kagent/) distinguish LF/CNCF stewardship from Solo.io creation and commercial offerings.
- [KubeStellar Console governance](https://github.com/kubestellar/kubestellar/blob/main/GOVERNANCE-CONSOLE.md) describes the community subproject.
- SRE Bench at srebench.com is not Parity’s sreben.ch; retain identity review and do not conflate them.
- Ingero’s current website/about position it around GPU inference. The old ingero-io/ingero repository is unavailable; [current scan README](https://github.com/ingero-io/scan/blob/main/README.md) describes an Apache-2 GPU estimator, not the catalog’s eBPF product. Scope and owner need review.

These are supplied source-backed research findings, separate from this batch’s independently checked 47 company mappings. Curated product records stay intact.

Final local checks passed: validate:catalog (zero errors, five warnings), validate:tools, generate:readme, strict audit:assets (zero warnings; 113/113 screenshots 8:5), 210 unit tests/51 files, lint, typecheck, check:ui, Webpack production build and production traces. Six production-build browser regressions passed across desktop Chromium and 390px WebKit. Final Elastic, Mirantis and Vigiles screenshots were captured; desktop/mobile examples were inspected. No horizontal overflow or browser errors were observed. Source visibility and Elastic → Deductive → Back were checked. No forced network-error simulation or full accessibility audit was run. Existing PR52/53 remain independent; no merge or release action.
