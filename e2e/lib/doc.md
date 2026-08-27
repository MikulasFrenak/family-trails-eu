# Self-healing selectors

Scaffolding that lets a Playwright locator survive a selector rename without going red, by re-locating the target element from a committed DOM fingerprint instead of failing outright. Wired into `e2e/category-filter.spec.ts` (key `category-filter.zoo-chip`) and `e2e/language-switcher.spec.ts` (keys `language-switcher.heading`, `.cz-button`, `.en-button`).

## Scope boundary

This covers **selector drift only** — a locator breaking because the element's text/class/structure changed while the element itself is still there. It does not address timing/async flakiness, which is a separate and larger source of flaky tests. Don't read a green run here as "flakiness solved."

## How it works

- `scorer.ts` — pure, deterministic weighted-similarity scoring (role/text/ariaLabel/domPath/siblingText) between a stored fingerprint and current-DOM candidates. Unit-tested via Vitest (`scorer.test.ts`), per this repo's existing "Vitest for pure logic" convention.
- `fingerprint.ts` — browser-side extraction (via `page.evaluate`) of an element's fingerprint, and candidate generation over same-tag, visible elements on the page.
- `healingLocator.ts` — orchestration: resolve the primary selector; on success, refresh the committed fingerprint for that key; on failure, score current-DOM candidates against the last known-good fingerprint.

## The gate

- **≥90% confidence**: auto-patch to the winning candidate (a uniquely-tagged `[data-heal-candidate="N"]` selector, not the raw shape-based `domPath` — that string can collide with unrelated elements elsewhere on the page, e.g. Google Maps' own UI controls). An audit entry is appended to `e2e/.healing-audit/audit-log.jsonl` (gitignored, local/CI-run-scoped) and a `console.warn` is emitted, which surfaces in the CI job summary via the "Surface self-healing audit trail" step in `.github/workflows/test.yml`.
- **<90% confidence**: the test fails with a human-readable report of the top 3 candidates and their scores — never a silent guess.

## Fingerprints are committed, audit logs are not

`e2e/fingerprints/*.json` is the reference baseline healing scores against on a fresh CI checkout, so it's committed to git — analogous to a visual-regression baseline. It refreshes automatically on every passing local/CI run. `e2e/.healing-audit/` is an ephemeral per-run trail and is gitignored.

## Known limitation

Candidate generation queries the whole page for same-tag, visible elements — for a low-selectivity fingerprint (short text, no distinguishing siblings) on a page with many similar elements, this can still produce weak-but-passing-threshold matches. Keep new locators through `healingLocator` narrow and deliberate rather than blanket-converting every locator in the suite at once.
