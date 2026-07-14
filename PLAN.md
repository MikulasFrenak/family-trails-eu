# Family Trails EU — Project Plan

Interactive, kid/family-friendly map of things to do in CZ and SK (castles, historical sites, nature spots, ZOOs, family parks), built with React + Google Maps JS, deployed on Cloudflare Pages. Later showcased from `review-spa` and extended to PL/HU.

This plan follows the `ai-delivery-playbook` lifecycle: **Requirements → Architecture → Implementation → Verification → Release**, executed via its capabilities (`create-task`, `implement-task`, `verify-browser`, `commit`, `pr-update`, `code-doc`, `public-repo-check`).

---

## 1. Requirements

**Core user story:** a parent picks CZ or SK (or gets it from browser locale), sees a friendly-styled map full of category markers (castle, museum, nature, ZOO, family park, historical building), filters by category, taps a marker for a kid-friendly description, and can also just search any place via standard Google Maps search.

**MVP scope:**
- Countries: CZ, SK (data). PL, HU are architecture-ready but not populated.
- Languages: EN (fallback), SK, CZ — detected from browser, switchable manually. Switching also re-localizes the Google Map itself (place names, not just UI chrome).
- Map styles: 2 custom Google Maps JSON styles ("Playful," "Nature") — **done**, see §2.
- Custom category markers (not default pins) — pin-shaped SVG icons with per-category glyphs and colors, clustered with a pie-chart cluster renderer at low zoom — **done**.
- Curated POI dataset (manually curated + AI-research-sourced JSON, cross-checked against Wikipedia/official sites), not a live DB, for MVP — **done**, 47 entries (16 CZ, 31 SK).
- Google Places search box — **deferred**, not yet built (see §4 Phase 5).
- Standard Maps controls — **deliberately minimized instead of kept**: Google's default UI (zoom, street view, map-type tabs, fullscreen, default POI pins) is fully disabled in favor of a small custom zoom control and a custom layer-settings panel (§2). Street view, fullscreen, and "my location" were dropped as not valuable for this use case.

**Explicitly out of scope for MVP:** user accounts, reviews/ratings, admin CMS UI, PL/HU content, native apps. (User accounts, likes, user-submitted POIs, and observability are now sketched as a post-MVP backlog — see §7.)

---

## 2. Architecture

### Stack
- **React 19 + TypeScript + Vite** — fast dev loop, easy Cloudflare Pages build.
- **Google Maps JavaScript API** via `@vis.gl/react-google-maps` (actively maintained Google-backed wrapper; avoids the abandoned `@react-google-maps/api` maintenance risk).
- **react-i18next** + `i18next-browser-languagedetector` for EN/SK/CZ.
- **Zustand** for light global state (country, language, map style, map type, category filters, layer-visibility toggles, selected POI) — avoids Context re-render sprawl for something this size.
- **Cloudflare Pages** for hosting the static build; Pages Functions only if/when a light API is needed (not required for MVP web-only).
- **@googlemaps/markerclusterer** (Google-maintained) for marker clustering — paired with a hand-rolled pie-chart cluster icon renderer (`src/lib/clusterPieIcon.ts`) so a cluster badge shows the category mix inside it, not just a count.

### Data layer (curated, AI-research-sourced)
```
/data
  /poi
    cz.json           # 16 entries
    sk.json           # 31 entries
  categories.json      # shared taxonomy + icon mapping + color + emoji
  schema.md            # documents the shape below
```
Entries were sourced via web research (WebSearch/Wikipedia/official sites), not invented — coordinates cross-checked against at least one authoritative source per place. One real lesson from that process: even "verified" coordinates need a spot-check against a second source before trusting them, since an automated correction pass can itself introduce a wrong value with high confidence.

Each POI entry:
```json
{
  "id": "cz-krivoklat",
  "category": "castle",
  "country": "CZ",
  "region": "Central Bohemia",
  "coordinates": { "lat": 50.0356, "lng": 13.8656 },
  "name": { "en": "Křivoklát Castle", "cz": "Hrad Křivoklát", "sk": "Hrad Křivoklát" },
  "description": { "en": "...", "cz": "...", "sk": "..." },
  "kidFriendly": { "minAge": 4, "notes": { "en": "Short tour route, dragon-themed kids trail" } },
  "tags": ["indoor", "guided-tour", "playground-nearby"],
  "image": "/assets/poi/cz-krivoklat.jpg",
  "externalUrl": "https://www.krivoklat.cz"
}
```
Committed to the repo, validated by a small script (`scripts/validate-poi.ts`) run in CI — catches missing translations/coordinates before merge.

### Map styling
- 2 hand-authored JSON style arrays (`/src/mapStyles/playful.json`, `nature.json`), not the Styling Wizard (its gallery is a JS-heavy SPA that isn't scrapeable) — swapped at runtime via `StyleSwitcher`. Both are deliberately built from the app's own brand/category color tokens (not an unrelated invented palette) so the map and UI chrome read as one system: "Playful" reuses category colors (museum-blue water, family-park-pink highways), "Nature" reuses the brand forest/mint palette.
- Terrain/park/landcover features use `hue`+`saturation`+`lightness` stylers rather than flat `color` overrides, so Google's underlying terrain relief shading shows through instead of flat cartoon-colored blobs over large polygons (e.g. big protected-landscape parks).
- All default Google chrome is suppressed: default POI pins/icons, route-number shields, and all label icons are turned off (`labels.icon` / `poi labels` visibility rules) so only our own markers and place-name text show.
- Custom SVG pin markers per category (castle, museum, ZOO, nature/trail, family park, historical building) — teardrop pin shape with a drop shadow and a bold white glyph, colored per `categories.json`, stored in `/src/assets/markers/`. The same icons are reused in the category filter chips and POI detail badge (`src/lib/categoryIcons.ts`) so the filter UI visually matches the map.
- Marker clustering via `@googlemaps/markerclusterer` with a custom pie-chart renderer — a cluster badge is a pie chart of the categories grouped inside it (colored per category) plus the total count, so you can tell what's in a cluster before zooming in. Click-to-zoom is the library's default behavior.
- Map type (Terrain / Flat / Satellite) and 4 label-visibility toggles (roads, town names, mountain names, rivers & lakes names — all default **off** for a clean marker-focused map) live in a custom settings panel (`MapLayerSettings`), since Google's default UI can't be restyled to match the brand.
- Zoom is bounded (6–18) so the map can't zoom out to a useless whole-world view or in past street-level detail; the custom zoom control's +/− buttons disable at those bounds.
- Default view and the zoom control's "recenter" button both use `fitBounds`/`defaultBounds` against a hardcoded `SLOVAKIA_BOUNDS` constant (`src/lib/mapConstants.ts`) — **deliberately Slovakia-only**, confirmed with the user despite it hiding ~all Czech POIs on load (15 of 16 fall outside the box). Don't "fix" this to a CZ+SK combined box without checking — it was flagged by code review and explicitly kept as-is.
- Dark mode follows OS/browser `prefers-color-scheme` automatically (no manual toggle) via CSS custom-property overrides — one deliberate scope cut: the Google Map tiles themselves stay in their light style even when the UI shell goes dark (building an actual dark Google Maps style is separate, bigger scope).

### Mobile / responsive
- `useIsMobile()` (`src/hooks/useIsMobile.ts`) is a JS-level guard via `matchMedia`, not CSS-only responsive hiding — components actually don't mount on the other breakpoint, rather than mounting-and-hiding via Tailwind `hidden sm:*`. Breakpoint is 639px, matching Tailwind's `sm:` (640px) exactly so JS and CSS never disagree. Phone gets the compact UI below; tablet and up render identically to desktop.
- On phone: the header collapses to just the title + one settings icon (`StyleSwitcher`/`LanguageSwitcher` don't render at all); the `CategoryFilter` chip row doesn't render either, replaced by a floating `FilterControl` button (bottom-right, funnel icon, green dot badge when any category filter is active). `MapLayerSettings`' dropdown gains mobile-only "Map style" and "Language" picker sections so those controls are still reachable from one place.
- `FilterControl` shifts upward (`bottom-[calc(65vh+0.75rem)]` instead of `bottom-3`) whenever `POIDetailPanel` is open, since that panel spans full width at the same bottom-right corner on phone (no `sm:right-auto` below 640px) — without this the two overlap.
- `LanguageSwitcher` and `MapLayerSettings`' mobile language picker both need the exact same "change language, then reload" behavior (see i18n note above) — shared via `useLanguageChange()` (`src/hooks/useLanguageChange.ts`) rather than duplicated, after code review found the duplication had already drifted once.

### Search & standard Maps features
- Google Places Autocomplete search box — **not yet built** (Phase 5, deferred; untested integration code without a working search flow felt worse than no code).
- Standard Google UI controls (street view, fullscreen, my-location, default zoom/map-type switcher) are intentionally **not** used — see MVP scope above.

### i18n
- Detect browser language → map to `sk`/`cz`/`en`, default `en` for anything else. Browser detection remaps the ISO code `cs` (how browsers report Czech) to our internal `cz` key, since i18next's `supportedLngs` matching is exact-string, not locale-aware.
- Manual switcher always visible (text toggle SK/CZ/EN, not flags only — CZ/SK flags read as visually similar to some users).
- The Google Map's own labels (place names, road names) are localized too, via `APIProvider`'s `language` prop — but the Maps JS API only reads that once at initial script load and can't hot-swap it, so the language switcher triggers a full page reload when the language actually changes. The very first load is unaffected (no reload) since the language is resolved before the map ever mounts.
- Display font is "Baloo 2" (not the originally-picked "Fredoka") — Fredoka was silently missing glyphs for Czech/Slovak characters like `č`/`ď`, causing mid-word font-fallback glitches in exactly this app's two target languages. Worth remembering when picking display fonts for future CZ/SK-facing work.

### Component sketch
`MapView`, `StyleSwitcher`, `CategoryFilter` (with a dynamic overflow "⋯" menu — measures actual rendered chip widths per language/viewport rather than fixed breakpoints, so it never silently overflows), `LanguageSwitcher`, `POIDetailPanel`, `MarkerLayer`, `MapLoadFallback`, `ZoomControl`, `MapLayerSettings`, `FilterControl` (mobile-only floating equivalent of `CategoryFilter`). `SearchBox` is sketched but not built (Phase 5).

### Testing
- **Vitest** (jsdom environment) — chosen since it shares config with Vite (`vite.config.ts`'s `test` field) rather than needing a separate Jest setup. `npm run test` (single run) / `npm run test:watch`.
- What's covered: pure logic and hooks only — `clusterPieIcon.test.ts` (pie-slice math, degenerate-input handling), `useAppStore.test.ts` (store actions), `useIsMobile.test.ts` (breakpoint boundary, listener cleanup on unmount). No component/integration tests yet.
- `src/test-setup.ts` polyfills `window.matchMedia`, which jsdom doesn't implement at all (throws, not just "always false") — needed for `useIsMobile` and anything that renders it to run under test.
- Everything else (visual/UX correctness, the actual map rendering, responsive layout at real viewport sizes) is verified manually via Playwright screenshots each round, not as a checked-in test suite — matches this project's scale; revisit if the app grows enough to need regression coverage beyond pure logic.

### Quota-exceeded fallback
This is a personal project on a hard-capped free-tier Google Cloud quota (see Phase 0 infra) — the map **will** occasionally be unavailable, and that needs to look intentional, not broken.
- Detection: register `window.gm_authFailure` before the Maps script loads (fires on billing/quota/auth rejection at load time) **and** a load timeout — if the map hasn't fired `tilesloaded` within ~5s, treat it as failed. Either condition swaps `MapView` for `MapLoadFallback`.
- Fallback content: text-only — a friendly centered message (e.g. "🗺️ This is a small personal project on a free tier — today's map quota is used up. Come back tomorrow!"), no screenshot asset to maintain.
- No retry loops, no error telemetry/reporting service — static and simple, matching the scale of the project.

---

## 3. Infra & setup steps (Phase 0)

1. New Google Cloud project → enable **Maps JavaScript API** + **Places API**.
2. New browser API key, **restricted by HTTP referrer** to the Cloudflare Pages domain(s) (prod + preview) — this is the real security boundary since a Maps JS key is always visible client-side; restriction, not secrecy, is what protects it.
3. New Cloudflare Pages project, connected to this GitHub repo, env var for the Maps key set as a Pages build variable (`VITE_GOOGLE_MAPS_API_KEY`), never committed to git.
4. `AGENTS.md`/`CLAUDE.md` in this repo are adapted from `ai-delivery-playbook` (see those files at repo root) — keep them accurate as the stack decisions below get finalized.
5. Run `/public-repo-check` (from the playbook, copy into `.claude/skills/` if using Claude Code) before the first push and before every push thereafter, since this repo is public from day one.

---

## 4. Delivery phases

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Repo scaffold, Google Cloud + Maps key (hard quota cap set), Cloudflare Pages project, AGENTS.md finalized | ✅ Done |
| 1 | MVP skeleton: Vite+React+TS, map renders, one style, dummy markers, `MapLoadFallback` for quota-exceeded state | ✅ Done |
| 2 | CZ + SK curated dataset v1 (aim for ~15–20 solid POIs per country to start) | ✅ Done — 16 CZ + 31 SK, exceeded target |
| 3 | Custom marker icon set, 2nd/3rd map style, POI detail panel UX pass | ✅ Done — 2 styles (not 3), pin-shaped icons, clustering, settings panel went beyond original scope |
| 4 | i18n: EN/SK/CZ, browser detection, switcher | ✅ Done — plus Google Map's own labels now localize too |
| 5 | Places search box + standard map controls | ⬜ Not started — standard controls deliberately dropped instead (see §2) |
| 6 | Cloudflare Pages deploy, custom domain (optional) | ⬜ Not started |
| 7 | Link from `review-spa` as a showcase entry; `public-repo-check` final pass | ⬜ Not started |

Each phase maps to the playbook's `feature-delivery` workflow at the task level: `create-task` → `implement-task` → `verify-browser` → `commit`/`pr-update` → `code-doc`.

---

## 5. Open decisions (settle before/during Phase 0)

- ~~Styling approach~~ — **decided: Tailwind** (see `AGENTS.md`). Both Tailwind and CSS Modules are compile-time/zero-runtime; Tailwind wins on DX for this marker-heavy map UI. styled-components/inline styles ruled out due to runtime re-render cost on `MarkerLayer`.
- ~~Branching/commits~~ — **decided**: `feature/`, `bugfix/`, `chore/`, `trivial/` prefixes, no ticket-ID prefix (see `AGENTS.md`).
- Custom domain for Cloudflare Pages vs default `*.pages.dev` — not blocking, decide at Phase 6.

---

## 6. PL/HU extension path (later)

Data layer is already country-keyed (`/data/poi/pl.json`, `hu.json`) and i18n is already a language-keyed object per POI — adding a country is "add a JSON file + add two locale keys," not a schema change.

---

## 7. Future development backlog (post-MVP, not started)

Captured for later — none of this is designed or scoped yet, just named as a direction. Picking any of these up is a real architecture conversation first, not a straight implementation task, because together they push the project past "static site + curated JSON" (see `AGENTS.md` scope) into needing user accounts and a backend:

- **Sign in / Login** — some auth mechanism (email + password, or "Sign in with Google" OAuth). Needed before any of the below can exist per-user.
- **Like / Dislike POI** — a signed-in user can react to a place; needs somewhere to store that (per-user, per-POI).
- **Add POI** — user-submitted places. Needs a moderation/review step before anything user-submitted lands in the public curated dataset (quality bar established in Phase 2 shouldn't erode).
- **Edit POI** — user-suggested corrections/edits to existing entries. Same moderation concern as Add POI.
- **Observability** — analytics/monitoring/logging once there's a backend and real user actions to observe (not meaningful for the current static MVP beyond basic Cloudflare Pages request logs).

Architecture implication when this gets picked up: needs an auth provider (e.g. Clerk/Supabase Auth/Firebase Auth, or Cloudflare's own stack) and a real backend + database (e.g. Cloudflare Workers + D1, or Supabase) — a genuine scope and cost decision (see the earlier "$0 quota cap" constraint in Phase 0), not a Cloudflare Pages static-only extension.
