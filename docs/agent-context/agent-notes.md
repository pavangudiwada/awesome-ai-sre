# awesome-ai-sre dev notes

## Stack
- Vite 5 + React 18 + Tailwind v4 + shadcn radix-nova (JS, no TypeScript)
- `npm run dev` to start dev server
- `npm run build` to build

## When adding a new tool (tools/operate/)

1. Create `tools/operate/<slug>.yaml` from `tools/operate/_template.yaml`
2. Run logo fetch: `node scripts/fetch-project-logos.js`
3. Run screenshot fetch: `node scripts/fetch-images.js`
4. Validate: `node scripts/validate-tools.js`
5. Regenerate README: `node generate-readme.js`

## When adding observability tools (src/data/observability.js)

1. Add entry to `OBSERVABILITY_TOOLS` array in `src/data/observability.js`
2. Run screenshot fetch: `node scripts/fetch-obs-screenshots.mjs`
   - Skips tools that already have screenshots
   - Auto-patches `observability.js` with `screenshot:` fields

## Logo quality checks

- SVG preferred over PNG
- PNG logos under ~5KB are likely favicons — re-run logo script or manually provide better source
- `public/logos/sources.tsv` tracks fetch sources (regenerated each logo script run)
- Default behavior: `fetch:logos` skips existing logos. Use `fetch:logos:force` to re-fetch all.
- Missing logos: `comm -23 <(ls tools/operate/*.yaml | xargs -I{} basename {} .yaml | grep -v _template | sort) <(ls public/logos/ | sed 's/\.[^.]*$//' | sort)`
- The script filters bad candidates: `/customers/`, `/adopters/`, third-party brand filenames (slack, docker, k8s, etc.), GitHub infrastructure hosts. Page-scraped SVGs are excluded entirely — only common logo paths, favicon link tags, GitHub org avatars, and Clearbit are used.
- If a tool has no logo after running the script, it likely needs a manual `logo_url` field in the YAML or a manually placed file in `public/logos/<slug>.svg`.

## Scripts reference

| Script | Purpose |
|--------|---------|
| `node scripts/fetch-project-logos.js` | Fetch logos for all operate tools |
| `node scripts/fetch-images.js` | Fetch screenshots for operate tools (skips fresh ones) |
| `node scripts/fetch-obs-screenshots.mjs` | Fetch screenshots for observability tools |
| `node scripts/validate-tools.js` | Validate YAML schema |
| `node generate-readme.js` | Regenerate README from tools |

## Key files

- `src/data/observability.js` — observability tools data
- `tools/operate/*.yaml` — AI SRE tools
- `public/logos/` — tool logos
- `public/screenshots/` — tool screenshots
