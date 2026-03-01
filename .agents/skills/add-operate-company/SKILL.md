---
name: add-operate-company
description: Add or update company entries in `tools/operate/*.yaml` for the Awesome AI SRE Tools repository. Use when a user asks to add new companies, fix company metadata, correct links, or ensure entries follow the required schema and README automation workflow.
---

# Add Operate Company

Add or update company files under `tools/operate/` and keep the generated README consistent.

## Workflow

1. Identify the target company list and expected names.
2. For each company, create or update exactly one file at `tools/operate/<slug>.yaml`.
3. Follow the required schema shown in `references/company-template.yaml`.
4. Keep `deployment` values as one or more of: `saas`, `on-prem`, `hybrid`.
5. Keep `features` to at most 3 items.
6. Include `links` whenever available. Prefer official company links.
7. Run repository validation and README generation.
8. Report any unresolved link uncertainty explicitly.

## File Rules

- Use lowercase kebab-case filenames.
- Keep one company per file.
- Keep `name` exactly as the company brand styling provided by user.
- Keep content concise and factual.
- Do not add comments to company YAML files.

## Required Commands

Run these after edits:

```bash
node scripts/validate-tools.js
node generate-readme.js
```

Optional link reachability check:

```bash
node scripts/validate-tools.js --check-links
```

If validation fails, fix errors before finishing.

## Reference

Use `references/company-template.yaml` for exact structure.
