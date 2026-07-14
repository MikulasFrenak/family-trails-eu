# family-trails-eu

Interactive, family/kid-friendly map of castles, historical sites, nature spots, ZOOs, and family parks across Czechia and Slovakia (Poland/Hungary planned later). Built with React + Google Maps JavaScript API, deployed on Cloudflare Pages.

See [`PLAN.md`](./PLAN.md) for the full requirements/architecture/delivery plan, and [`AGENTS.md`](./AGENTS.md) for engineering conventions (this repo follows the [`ai-delivery-playbook`](https://github.com/MikulasFrenak/ai-delivery-playbook) methodology).

Status: core map experience is live and working end-to-end against a real Google Maps key. 47 real, web-verified POIs across CZ (16) and SK (31), two custom map styles ("Playful" and "Nature," both built from the app's own brand/category colors), pin markers with pie-chart clustering, category filter with an overflow menu, full EN/SK/CZ i18n (UI **and** the map's own labels), a layers settings panel (roads/town/mountain/river name toggles + terrain/flat/satellite switch), OS-driven dark mode, and a friendly fallback for when the free-tier map quota runs out. Not yet built: Places search box (Phase 5), PL/HU content, and the post-MVP backlog (accounts, likes, user-submitted POIs, observability — see `PLAN.md` §7).
