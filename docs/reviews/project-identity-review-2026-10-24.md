# Catalog project identity review — 2026-10-24

## Acceptance clarification for issue #50

A product record resolves an unmapped-provider review in one of two ways: (1) a source-backed mapping to an existing company record, or (2) an explicitly reviewed project identity with dated sources and a visible limitations statement. A project identity is a product/project brand, not a legal-entity claim; it leaves `companySlug` null, does not create a company row, and does not enable company-follow features. The catalog schema rejects a product that declares both a project identity and a company mapping. Public product profiles display the identity, limitations, and dated identity sources together. This makes the uncertainty reviewable rather than hiding it behind a warning exemption.

## Reviewed project identities

- **K8sGPT** — The project's governance repository identifies the community project, and CNCF lists it as a hosted project. This supports the K8sGPT project identity; it does not make K8sGPT a commercial provider. The public profile keeps the project/CNCF sources and the distinction from an operating company.
- **Kagent** — CNCF identifies the Kagent project, while Kagent's enterprise page says the project started at Solo.io and presents Solo Enterprise separately. The profile identifies the open-source project and makes that enterprise distinction visible; it does not map the project to a commercial company.
- **KubeStellar Console** — The KubeStellar repository, its Console directory, and CNCF identify the upstream project. These sources support the upstream project identity, not a commercial provider/operator mapping.
- **Ingero** — The live site and privacy policy call Ingero a project; the former repository is unavailable. The upstream-authored v0.19.0 package README supports only the historical eBPF/MCP scope and Apache-2.0 license. The public profile says this is historical evidence and that current availability/maintenance and the legal operator are not established. It is not a confirmed commercial provider.
- **SRE Bench** — The official site presents SREBench and links to a GitHub organization without public repositories or members. The reviewed sources do not establish the legal operator or benchmark methodology. The public profile states those limits and explicitly avoids conflating unrelated projects with the same name. It is not a confirmed commercial provider.

The source links are stored with each product's `projectIdentity.sources`; all were checked on 2026-10-24. The product/profile wording describes what those sources support, not a broader claim about ownership, maturity, or verification.

## OpenSRE.in addition

OpenSRE.in is a distinct self-hosted AI SRE project, not the similarly named Tracer project. Its official site and repository identify the project and describe the web, Slack, and Teams interfaces, episodic memory, Neo4j topology, and Apache-2.0 license. The repository says direct Anthropic calls are the default and LiteLLM is optional. Accordingly, the public profile does not promise that data never leaves the deployment. The official repository provides a logo, but no actual UI screenshot was available among its public assets reviewed; the promotional artwork was not presented as a screenshot.

The two exact screenshot warnings for `opensre-in` are therefore retained in `config/validation-warning-baseline.json`: the catalog has no screenshot path and the asset audit has no screenshot file. They are accepted only for this specific missing screenshot, not as a numeric warning budget.
