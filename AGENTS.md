# family-trails-eu — Agent Guide

Agent guide for this repo, adapted from [`ai-delivery-playbook`](https://github.com/MikulasFrenak/ai-delivery-playbook). Any AI coding tool (Claude Code, Codex, Copilot, Cursor, Aider) should read this before exploring code or writing a plan.

See `PLAN.md` at repo root for the full product/architecture plan. This file is process/conventions only.

---

## Repo Layout

```
/src
  /components     # MapView, CategoryFilter, LanguageSwitcher, POIDetailPanel, MarkerLayer,
                   # StyleSwitcher, ZoomControl, MapLayerSettings, MapLoadFallback, FilterControl
  /mapStyles      # playful.json, nature.json — hand-authored Google Maps style arrays
  /assets/markers # custom SVG category pin icons (reused in filter chips + POI badge)
  /i18n           # react-i18next config + en/cz/sk dictionaries
  /store          # Zustand store (useAppStore.ts)
  /hooks          # useIsMobile.ts (matchMedia guard), useLanguageChange.ts (shared change-language
                   # + reload logic — used by LanguageSwitcher and MapLayerSettings, don't re-duplicate it)
  /lib            # categoryIcons.ts, clusterPieIcon.ts, mapConstants.ts — small shared helpers
  /data           # pois.ts — loads + flattens /data/poi/*.json for the app
  /types          # poi.ts — shared Poi/Category types
  test-setup.ts   # Vitest setup — polyfills window.matchMedia (jsdom doesn't implement it at all)
  *.test.ts       # colocated with the file under test, not in a separate /tests tree
/data
  /poi            # cz.json (16), sk.json (31) — curated, web-research-sourced POI data
  categories.json  # taxonomy + color + emoji + icon mapping
  schema.md
/scripts
  validate-poi.ts # CI validation for /data/poi/*.json
```

`SearchBox` is sketched in `PLAN.md` but not yet built (Phase 5, deferred). Standalone project, single package — no monorepo package map needed.

---

## Stack Decisions

- React 19 + TypeScript + Vite
- Google Maps JavaScript API via `@vis.gl/react-google-maps`, clustering via `@googlemaps/markerclusterer`
- `react-i18next` + `i18next-browser-languagedetector`
- Zustand for global state (country, language, map style, map type, category filters, layer-visibility toggles)
- Cloudflare Pages for hosting
- Vitest (jsdom) for unit tests — pure logic/hooks only, see `PLAN.md` §2 Testing

**Styling approach: Tailwind.** Chosen over CSS Modules and styled-components — both Tailwind and CSS Modules compile to static CSS with no runtime cost, but Tailwind wins on DX for a marker-heavy map UI (consistent spacing/sizing utilities across `MapView`/`CategoryFilter`/`POIDetailPanel` without hand-writing many small `.module.css` files). styled-components/inline styles were ruled out: `MarkerLayer` re-renders on filter/category changes, and runtime CSS-in-JS or inline style objects add per-render overhead that scales with marker count. Don't let a second approach creep in once picked.

---

## Branching & Commits

Personal project, not ticket-tracked:

```
feature/short-kebab-desc   # new functionality
bugfix/short-kebab-desc    # broken behaviour / failing tests
chore/short-kebab-desc     # deps, refactor, config
trivial/short-kebab-desc   # tooling, docs, config
```

Commit format:
```
Summary (imperative, max 72 chars)

- What changed and why
- Non-obvious decisions
```

`main` is never committed to directly. Squash-merge PRs, auto-delete source branch after merge.

---

## Capabilities

Copied/adapted from the playbook as needed — see `ai-delivery-playbook/skills/` for the reference implementations. Copy a skill into `.claude/skills/` (Claude Code) when you're ready to use it here:

| Capability | When to use |
|---|---|
| `create-task` | Plan a piece of work before touching code |
| `implement-task` | Full implementation flow: plan → code → test → docs → commit |
| `verify-browser` | Verify a change in the live browser (Chrome DevTools MCP) |
| `commit` | Generate commit message, run quality gate, commit, offer PR |
| `pr-update` | Append latest commit's changes to an open PR description |
| `code-doc` | Create/update a `doc.md` for a component/module after changes |
| `public-repo-check` | **Run before every push** — this repo is public from day one; catches leaked API keys, personal paths |

## MCP Invocation Policy

Never call any MCP tool automatically — only when explicitly requested or as part of a capability's documented flow.

## Research Before Implementing

For any non-trivial task: search for current best practices first, identify 2–3 approaches with trade-offs, recommend one and check it against this file's conventions, then wait for explicit go-ahead before writing code.

---

## Public Repo Hygiene

This repo is public. Never commit:
- The Google Maps API key or any secret (key lives in Cloudflare Pages env vars as `VITE_GOOGLE_MAPS_API_KEY`, never in source)
- Personal file-system paths or personal email addresses
- Any cloud/tenant/project ID beyond what's needed to run the app

Run `/public-repo-check` before every push.

---

## Setup

1. Google Cloud project with Maps JavaScript API + Places API enabled, key restricted by HTTP referrer to the deployed domain(s) — done via a hard daily quota cap rather than a spend budget (budgets only alert, quotas actually prevent charges).
2. Deployed on Cloudflare (Workers-with-static-assets, git-connected — auto-deploys on push to `main`); `VITE_GOOGLE_MAPS_API_KEY` is a **build-time** env var there, not a runtime secret — Vite bakes `import.meta.env.VITE_*` into the bundle at build, so it must be set in the project's build-environment-variables settings (not "Variables and Secrets", which is Worker-runtime-only and won't affect the build).
3. `npm install`, then put the real key in `.env.local` (gitignored, never commit it) as `VITE_GOOGLE_MAPS_API_KEY=...`, then `npm run dev`.
4. `npm run validate-poi` checks `/data/poi/*.json` against `data/schema.md`; `npm run build` runs a full typecheck + production build; `npm run test` runs the Vitest suite once, `npm run test:watch` for watch mode.
