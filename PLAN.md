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
- Detection: register `window.gm_authFailure` before the Maps script loads (fires on billing/quota/auth rejection at load time) **and** a tile-load watchdog — if the map hasn't fired `tilesloaded` within 15s of *visible* time, treat it as a timeout. The watchdog only counts while `document.visibilityState === "visible"` (re-arms on `visibilitychange`), because background tabs and lazy iframe embeds legitimately postpone tile loading — the original 6s since-mount version fired falsely in exactly those cases ("map randomly doesn't load, refresh fixes it").
- Failure kinds are split: `auth` (quota/key — dead-end message, retry wouldn't help) vs `timeout` (transient — different message + a "Try again" button that remounts the `APIProvider` via a React key).
- Fallback content: text-only — a friendly centered message, no screenshot asset to maintain. No error telemetry/reporting service — simple, matching the scale of the project.

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

---

## 8. Map provider abstraction — TomTom/MapLibre research (Phase 8, not started)

**Goal:** stop the map from ever showing a dead "quota exceeded" screen. Today, when Google Maps hits its hard-capped free quota, `MapLoadFallback` shows a text-only dead end (§2 Quota-exceeded fallback). The idea: add a second, independent map provider (MapLibre GL JS + a vector-tile source) so a Google failure can fail over to a still-functional map instead of a dead end — and/or offer it as a manual, user-visible switcher. This section is **research only** — no implementation decision made yet, per this playbook's Research Before Implementing convention.

### Why this is worth considering

- The current hard $0 Google Maps quota cap is the direct cause of the existing fallback UX — a second provider with more headroom turns "map sometimes doesn't work" into "map always works, sometimes on a different provider."
- Reduces single-vendor dependency on Google specifically for a public, $0-budget hobby project.
- MapLibre is fully open source — fits this project's and the wider playbook's "tech-agnostic, no vendor lock-in" story.

### Provider comparison (researched — see sources)

| | Google Maps (current) | TomTom (MapLibre-based) | MapTiler / Stadia Maps (MapLibre, OSM data) |
|---|---|---|---|
| Free tier | Hard $0 quota cap set manually — low headroom, the actual cause of today's fallback UX | 50,000 tile requests/day + 2,500 non-tile requests/day (pricing revised July 2026 — re-check before committing) | MapTiler: 100k free tile loads. Stadia: free tier for **non-commercial use only** — needs a careful read of what "non-commercial" covers for a portfolio site that supports a freelance pitch |
| Styling | Proprietary Google style-JSON array — today's `playful.json`/`nature.json` are hand-authored in this format | **MapLibre Style Spec** — TomTom's own JS SDK is built directly on MapLibre GL JS, so this is a first-class fit, and styles can be built visually in TomTom's Map Maker instead of hand-written JSON | Same MapLibre Style Spec |
| Clustering | `@googlemaps/markerclusterer` + imperative `google.maps.Marker` objects (today's approach, incl. the custom pie-chart `Renderer` in `MarkerLayer.tsx`) | Native GeoJSON-source clustering (`cluster: true`, GPU-rendered) for the common case; **HTML markers** for a fully custom cluster render (needed to keep the pie-chart look) | Same MapLibre approach |
| Data | Google's own road/POI/imagery data | TomTom's own data | OpenStreetMap community data — coverage/detail varies by region, worth spot-checking CZ/SK rural areas specifically before relying on it |

### Key finding: markers/clustering can't be literally shared code — but the "brain" can

The original assumption ("clusters and markers could be shared") is only partly true. MapLibre's rendering model is fundamentally different from Google's: Google uses imperative `Marker` objects plus a separate clusterer library; MapLibre clusters via a GeoJSON source property or via HTML DOM markers when custom rendering (like the pie chart) is needed — there's no shared marker object type to reuse directly.

What **is** genuinely shareable, provider-agnostically:
- POI filtering logic (`visiblePois` computation in `MarkerLayer.tsx`)
- The pie-chart icon math itself (`src/lib/clusterPieIcon.ts` — pure SVG/canvas generation, no Google types involved)
- Category color/order config (`categories.json`-derived lookups)

What needs a **separate implementation per provider**:
- The actual marker/cluster rendering glue (`google.maps.Marker` + `MarkerClusterer` vs MapLibre GeoJSON source + HTML cluster markers)
- Load-failure detection (`gm_authFailure` + `tilesloaded` watchdog is Google-specific; MapLibre has its own `error`/`load` events — needs its own research pass before implementing)
- Map style format entirely (Google style-JSON vs MapLibre Style Spec — not automatically convertible; the TomTom parity of `playful.json`/`nature.json` is real design work, not a mechanical port)

### Architecture options considered

1. **Full provider-abstraction interface** — a `MapProvider` interface with a Google adapter and a MapLibre adapter behind it, switcher picks the implementation. Cleanest long-term, most upfront work, and premature if a 3rd provider never actually gets added.
2. **Pragmatic component swap (recommended for a v1)** — `MapView` branches on a store flag (or an automatic failure signal) and renders either the existing Google map subtree or a new MapLibre subtree. Both subtrees import the same shared bits (POI filtering, pie-chart math, category config) but own their own rendering glue. Less code than option 1, ships faster, easy to refactor toward a real interface later if it earns it.
3. **MapLibre-only migration (drop Google entirely)** — simplest end state, but this wasn't the ask (the ask was a switcher/second layer alongside Google, not a full migration) and loses Google's familiar, well-known map look as the default.

**Recommendation:** Option 2 for a v1 — matches the actual ask (switchable, not a rip-and-replace) and avoids over-engineering an interface before there's a second real reason to need one.

### What would need to change (file-level, current names)

- `MapView.tsx` — branch on provider (manual toggle and/or automatic failover on `gm_authFailure`/timeout) instead of always rendering the Google subtree
- New `MapViewMapLibre.tsx` (naming TBD) — MapLibre GL JS pointed at a TomTom style/tile URL + key, with its own bounds/zoom/style-switch handling and its own load-failure detection (separate research needed — MapLibre's failure signals aren't the same as Google's)
- New `MarkerLayerMapLibre.tsx` — GeoJSON source of `ALL_POIS`, clustering via MapLibre's native support or HTML markers (to keep the pie-chart look), reusing `clusterPieIcon.ts`'s math and the category config, but with new render glue
- New TomTom/MapLibre style JSON for style parity with `playful.json`/`nature.json` — build visually via TomTom Map Maker rather than hand-writing MapLibre Style Spec JSON from scratch
- `useAppStore.ts` — new provider-related state (active provider, and/or an auto-failover flag)
- A provider switcher UI (new control, or folded into the existing `MapLayerSettings` panel)
- `.env.local` / Cloudflare Pages build vars — new `VITE_TOMTOM_API_KEY`
- `AGENTS.md` — new stack-decision entry once an approach is actually chosen

### Open questions to settle before this becomes an implementation task

1. Auto-failover only (silent switch on Google failure), a user-visible manual switcher, or both?
2. Does the TomTom style need full `playful`/`nature` visual parity for v1, or is one acceptable-looking default TomTom style enough for a fallback tier (only needs to look intentional, not pixel-match Google)?
3. TomTom's exact commercial-use terms for this specific use case (portfolio site, supports a freelance pitch, not direct map-view sales) — re-verify against TomTom's current terms before committing, not just the headline free-tier numbers above.
4. Does MapLibre stay a fallback-only tier long-term, or could it eventually become the default (with Google demoted to a switch-to option)?

### Sources (researched during this pass — re-verify before implementing, pricing/terms change)

- [TomTom Pricing](https://docs.tomtom.com/pricing)
- [TomTom Maps SDK for JavaScript — Overview](https://docs.tomtom.com/maps-sdk-js/introduction/overview)
- [MapLibre GL JS — Optimising Performance for Large GeoJSON Datasets](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/)
- [Clustering with MapLibre GL JS — Stadia Maps Docs](https://docs.stadiamaps.com/tutorials/clustering-styling-points-with-maplibre/)
- [Display HTML clusters with custom properties — MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/examples/display-html-clusters-with-custom-properties/)

**Next step:** not an implementation task yet. Settle the 4 open questions above, then run `/create-task` for a scoped v1 (recommend starting with Option 2 + manual switcher only, defer auto-failover and full style parity to a follow-up).
