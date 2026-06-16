# Agent Handoff — AI SRE Watchlist

## What This Is

Vite + React SPA marketplace for AI SRE tools. Live at `npm run dev` on port 5173 (or any port).

Key docs:
- `docs/agent-context/design.md` — color system, typography, component specs (source of truth for visuals)
- `docs/agent-context/implementation.md` — product direction, routes, phases

---

## Tech Stack (Current)

| Layer | What |
|-------|------|
| Build | Vite 5 + `vite.config.mjs` (must be `.mjs`, not `.js` — ESM required for `@tailwindcss/vite`) |
| UI | React 18, React Router v6, single `src/App.jsx` |
| Styling | Tailwind v4 (`@import "tailwindcss"` in `src/styles.css`) + existing hand-rolled CSS (~1500 lines) |
| Components | shadcn/UI just initialized — **only `button.jsx` installed so far** |
| Data | 74 YAML files in `tools/operate/*.yaml`, loaded at runtime via `js-yaml` |
| Observability data | `src/data/observability.js` (static JS) |
| Resources data | `src/data/resources.js` (static JS) |

### shadcn Config
- Style: `radix-nova`, preset code `b2fA`
- Base: `radix` (not `base`)
- TypeScript: **No** — all files are `.jsx` / `.js`
- Icon library: `lucide`
- `cn()` utility: `src/lib/utils.js`
- Components go in: `src/components/ui/`
- Install components: `npx shadcn@latest add <component>`

### Vite/React versions
- `vite@5.4.21` — do NOT upgrade to v6/v7/v8 without checking peer deps
- `@vitejs/plugin-react@4` — v5/v6 require vite 8, will break
- `@tailwindcss/vite@4.3.x` — installed, wired in `vite.config.mjs`

---

## Routes

```
/                     → ToolDirectoryPage (AI SRE tools homepage)
/tools                → ToolDirectoryPage
/tools/:slug          → ToolProfilePage
/observability        → ObservabilityPage
/observability/:slug  → ObservabilityDetailPage
/resources            → ResourcesPage
/resources/:slug      → ResourceDetailPage
/best/:slug           → BestToolsPage
/alternatives/:slug   → AlternativesPage
/account/saved        → SavedToolsPage
```

---

## What Was Done This Session

1. **Agent skill files cleaned up** — `.agents/skills/ai-sre-watchlist/SKILL.md`, `add-operate-company`, `tagging-a-company` all updated to match current validator schema and design
2. **Stale files deleted** — 4x `create-fp-tasks*.sh`, `EXECUTIVE-SUMMARY.md`
3. **Nav** — Added "AI SRE Tools" as first nav tab (active on `/` and `/tools`)
4. **Filters removed** — Evidence filter and Profile status filter removed from sidebar
5. **"Screenshot" badge removed** from `toEvidenceTags()`
6. **Observability cards** — Now use same `ToolCard` component as AI SRE tools (via `obsToTool()` normalizer)
7. **Profile pages** — All sections now render inline (no hidden tabs). Tabs jump/scroll to sections via `IntersectionObserver` for active state tracking
8. **shadcn initialized** — Tailwind v4 + shadcn radix-nova installed and working

---

## What's NOT Done Yet — Next Priority

### 1. Profile page layout is still bad (HIGHEST PRIORITY)

The `.fact-strip` (Category, Deployment, Pricing, Open source, Last checked) renders as an ugly horizontal bar below the profile header. It should move into the sidebar as a "Key facts" section styled like `option2.png` (right side of the image).

**What to do:**
- Remove `<FactStrip>` from `ProfileHeader` component (lines ~1246-1290 in `App.jsx`)
- Add a Key facts `<dl>` list to the sidebar in `ToolProfilePage` and `ObservabilityDetailPage`
- CSS for key facts: label on left (muted), value on right (bold), separated by rows

**Reference:** Look at `docs/agent-context/profile-functional-reference.png` — the right sidebar panel shows exactly what this should look like.

```jsx
// Target sidebar structure
<aside className="profile-sidebar">
  <section className="content-card">
    <p className="eyebrow">Key facts</p>
    <dl className="key-facts">
      <div><dt>Category</dt><dd>{tool.primaryCategory}</dd></div>
      <div><dt>Deployment</dt><dd>{tool.deployment.join(", ")}</dd></div>
      <div><dt>Pricing</dt><dd>{tool.pricingModel}</dd></div>
      <div><dt>Open source</dt><dd>{tool.openSource ? "Yes" : "No"}</dd></div>
      <div><dt>Last checked</dt><dd>{toLocaleDate(...)}</dd></div>
    </dl>
  </section>
  ...
</aside>
```

### 2. Migrate app to use shadcn components

The whole app still uses hand-rolled CSS. shadcn is installed but unused (except `button.jsx`). The migration plan:

| Hand-rolled | Replace with shadcn |
|-------------|-------------------|
| `.tool-card` | `Card` + `CardContent` |
| `.chip`, `.chip-row__item` | `Badge` |
| `.tab-button` | `Tabs` + `TabsList` + `TabsTrigger` |
| Filter `<select>` | `Select` |
| Save button | `Button variant="outline"` |
| `.content-card` | `Card` |
| Profile fact rows | `Separator` between rows |

**Do this section by section** — don't rewrite the whole file at once.

### 3. Make tool-tabs sticky

The tab strip on profile pages should stick below the header while scrolling:
```css
.tool-tabs {
  position: sticky;
  top: 64px; /* header height */
  z-index: 20;
}
```

### 4. Fix link-grid styling

`.link-grid a` currently inherits button styling (bordered box). Should be clean inline links:
```css
.link-grid a {
  border: none;
  background: none;
  height: auto;
  padding: 0;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  display: inline;
}
```

---

## Key Functions in App.jsx

| Function | Purpose |
|----------|---------|
| `obsToTool(item)` | Converts observability item → tool-compatible shape for `ToolCard` |
| `loadCompanies()` | Loads all 74 tool YAMLs at build time via `import.meta.glob` |
| `toEvidenceTags(entry)` | Derives evidence badges from YAML fields |
| `inferCategories(tags, openSource, summary)` | Maps YAML tags → display categories |
| `filterToolsByState(tools, filters)` | Main filter function for tool directory |
| `ToolCard({ tool, profileTo })` | Card component — `profileTo` overrides the link path |
| `ToolLogo({ tool, size })` | Logo with favicon fallback chain |
| `ProfileHeader({ tool, backPath, backLabel })` | Profile page header — accepts custom breadcrumb path |

---

## Tool YAML Schema (74 files in tools/operate/)

Required fields: `name`, `slug`, `url`, `summary`, `deployment` (saas/on-prem/hybrid), `opensource` (bool), `tags`, `dateAdded`

Allowed tags: `Incident Response`, `Observability`, `AIOps`, `IDP`, `IaC`, `FinOps`, `Security`, `Deployment`

Validate: `node scripts/validate-tools.js`
Regenerate README: `node generate-readme.js`

---

## Design Tokens (from DESIGN.md)

```
--primary:     #0B1220  (dark ink — buttons, active states)
--accent:      #245BFF  (blue — links, focus)
--background:  #F7F8FA  (page canvas)
--surface:     #FFFFFF  (cards, panels)
--border:      #E2E8F0
--text:        #0F172A
--text-muted:  #64748B
--radius:      8px cards, 12px inputs, full for chips
```

Fonts: Inter (all UI), JetBrains Mono (metadata/timestamps only)

---

## Gotchas

- `vite.config.mjs` must stay `.mjs` — `@tailwindcss/vite` is ESM-only
- `@vitejs/plugin-react` must stay at v4 — v5/v6 require vite 8
- shadcn components are `.jsx` not `.tsx` (project has `tsx: false`)
- `ToolCard` has a `profileTo` prop — use it when linking observability cards to `/observability/:slug`
- The `useMemo` in `ToolProfilePage` is before the early return (intentional, handles null tool)
- `KNOWN_BAD_LOCAL_LOGOS` set at top of App.jsx — logos that fail locally
- Tool YAMLs use HTML entities in summaries (decoded by `decodeText()`)
