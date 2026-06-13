---
name: add-operate-company
description: Add or update company entries in `tools/operate/*.yaml` for the Awesome AI SRE Tools repository. Use when a user asks to add new companies, fix company metadata, correct links, or ensure entries follow the required schema and README automation workflow.
---

# Add Operate Company

Add or update company files under `tools/operate/` and keep the generated README consistent.

## Workflow

1. Identify the target company and expected slug (lowercase kebab-case).
2. Create or update exactly one file at `tools/operate/<slug>.yaml`.
3. Follow the required schema shown in `references/company-template.yaml`.
4. Run validation and README generation after every change.
5. Report any unresolved link uncertainty explicitly.

## File Rules

- Filename must be lowercase kebab-case: `my-company.yaml`
- One company per file
- `slug` in the file must match the filename (without extension)
- Keep `name` exactly as the company's brand styling
- No comments in YAML files

## Required Fields

```
name        string   — display name (exact brand casing)
slug        string   — lowercase kebab-case, matches filename
url         string   — primary website URL (https)
summary     string   — 1-3 sentence factual description
deployment  list     — one or more of: saas, on-prem, hybrid
opensource  boolean  — true or false
tags        list     — at least one tag from the allowed list (see below)
dateAdded   string   — YYYY-MM-DD format
```

## Allowed Tags (exact casing required)

```
Incident Response
Observability
AIOps
IDP
IaC
FinOps
Security
Deployment
```

## Optional Fields

```
screenshot              — must be blank or start with /screenshots/
logo                    — must be blank or start with /logos/
screenshot_last_fetched — YYYY-MM-DD or blank
claimed                 — true/false
features                — list, at most 3 items
linkedin                — URL
github                  — URL
x                       — URL
producthunt             — URL
```

## Required Commands

Run these after edits:

```bash
node scripts/validate-tools.js
node generate-readme.js
```

Optional link check:

```bash
node scripts/validate-tools.js --check-links
```

If validation fails, fix errors before finishing.

## Reference

Use `references/company-template.yaml` for exact structure.
