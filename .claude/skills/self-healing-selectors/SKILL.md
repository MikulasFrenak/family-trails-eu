---
name: self-healing-selectors
disable-model-invocation: true
description: Scaffolds self-healing selector infrastructure (DOM fingerprinting, candidate scoring, confidence threshold, human-review fallback) into an E2E/UI test suite — Playwright, Cypress, or Selenium — and wires it into CI. Use when selector drift after a UI change is a recurring source of broken tests. NEVER auto-invoke — only run when user explicitly types /self-healing-selectors.
---

# self-healing-selectors — Scaffold Selector-Drift Healing into an E2E Suite

## Overview

Scaffolds the architecture from [`docs/test-maintenance.md`](../docs/test-maintenance.md) into a target repo's actual E2E/UI test suite: capture a DOM fingerprint on a passing run, score candidates against it when a locator fails, auto-patch above a confidence threshold with an audit trail, report to a human below it.

**Scope boundary — read this before starting.** Selector healing addresses roughly a quarter to a third of flaky-test causes; async/timing issues are the larger share. This skill scaffolds selector healing only. Don't let the result get pitched or documented as "fixes flaky tests" — see `docs/test-maintenance.md`'s Timing healing and Quarantine sections for the rest, which this skill does not set up.

---

## Guardrails

- **Never auto-patch a low/medium-confidence heal.** Report the top candidates and the scoring rationale to a human instead. A test that stays red is a known problem; a test that silently starts checking the wrong element is an unknown one — worse than the flaky test it replaced, because it hides a real regression.
- **Every auto-patch above threshold leaves an audit trail** — a diff, a PR comment, a structured log entry. Never a silent change with no trace, even on a project's own feature branch.
- **Keep candidate payloads small.** Send the scoring backend the fingerprint and a short candidate list, not a full-page DOM dump — cheaper, faster, and reduces what leaves the process if the backend is an external LLM call.
- **Check for an existing harness first (Step 1)** — don't scaffold a second, competing healing mechanism into a repo that already has one.
- **Don't silently choose the scoring backend** — Step 2 requires an explicit choice (LLM vs. deterministic), not a default picked without asking, since it has real cost/privacy trade-offs (see Step 2).

---

## Workflow

### Step 1: Detect the Test Framework and Existing Setup

Identify the E2E framework from the target repo's dependencies and config (Playwright: `playwright.config.ts`; Cypress: `cypress.config.ts`; Selenium: driver setup in the test harness). If ambiguous or the project uses something else, ask: _"Which E2E framework is this suite built on, and is there a specific spec/directory to scope this to, or the whole suite?"_

Grep for an existing healing mechanism (search for "heal", "fingerprint", a `healLocator`-shaped function) before proceeding — if one exists, stop and ask whether to extend it instead of adding a second one.

### Step 2: Pick the Scoring Backend — Ask, Don't Assume

Two real options, both shipping in production elsewhere (see `docs/test-maintenance.md`'s Prior art):

- **LLM-scored** (e.g. via the Claude API, following this project's existing API-client conventions if one is already configured) — better at "renamed the class but it's obviously the same button" reasoning, at the cost of an API call per heal and sending fingerprint/candidate data to an external model.
- **Deterministic tree-diff** (e.g. a weighted Longest Common Subsequence over DOM attributes, the approach [Healenium](https://github.com/healenium/healenium) uses) — no external call, no per-heal latency/cost, no data leaving the process, at the cost of being weaker on cases that need semantic reasoning rather than structural similarity.

Ask the user which fits their constraints (cost, latency, whether DOM content can leave the process) rather than defaulting silently.

### Step 3: Scaffold Fingerprint Capture

Add a capture helper for the detected framework that records, alongside a passing assertion: semantic role, visible text (truncated), `aria-label`, tag name, a short structural path (not a brittle full XPath), and 1–2 sibling text snippets.

Playwright reference shape:

```ts
export interface ElementFingerprint {
  role?: string;
  text?: string;
  ariaLabel?: string;
  tag: string;
  domPath: string; // short structural path, e.g. "form > div:nth-of-type(2) > button"
  siblingText?: string[];
}

export async function captureFingerprint(page: Page, selector: string): Promise<ElementFingerprint> {
  return page.locator(selector).evaluate((el) => ({
    role: el.getAttribute("role") ?? undefined,
    text: el.textContent?.trim().slice(0, 80),
    ariaLabel: el.getAttribute("aria-label") ?? undefined,
    tag: el.tagName.toLowerCase(),
    domPath: buildShortDomPath(el),
    siblingText: Array.from(el.parentElement?.children ?? [])
      .map((s) => s.textContent?.trim().slice(0, 40))
      .filter((t): t is string => Boolean(t)),
  }));
}
```

For Cypress, fingerprint capture runs via `cy.document()` or a custom command, since assertions run in-browser but a scoring call needs to happen out of process — see `docs/test-maintenance.md` for why. For Selenium, capture via the driver's element/attribute APIs equivalently.

Start narrow — wire capture into one flaky spec/suite first, not every locator in the project at once.

### Step 4: Scaffold the Heal-on-Failure Path

Intercept the framework's own locator-failure signal (Playwright `TimeoutError`/strict-mode violation, Cypress command failure via `cy.task()` for the out-of-process scoring call, Selenium `NoSuchElementException`) before it fails the assertion outright. Generate candidates from the current DOM that share tag/role/approximate position with the stored fingerprint, then call the Step 2 scoring backend for a ranked list with a confidence score and short rationale per candidate.

### Step 5: Enforce the Confidence Threshold

Ask the user what threshold to use if not specified; default to a conservative 90% if they have no preference. Wire the two branches from the Guardrails above — auto-patch + audit trail above threshold, human report below it — as the actual gate, not an afterthought bolted on later.

### Step 6: Wire into CI

Add the healer as a pass between "E2E test fails" and "pipeline marked red" in the project's real CI config (detect GitHub Actions / GitLab CI / other from the repo — don't assume). Confirm explicitly that only an *unconfident* miss fails the build; a confident heal should let the pipeline stay green (with its audit trail visible in the PR), not just suppress the failure silently.

### Step 7: Document the Scope Boundary

In the scaffolded harness's own docs (a `doc.md` via [`/code-doc`](./code-doc.md), or the PR description), state plainly that this covers selector drift only. Link `docs/test-maintenance.md`'s Timing healing and Quarantine sections so the team doesn't read "self-healing tests" as "flakiness solved" — the same distinction this skill's own Overview draws.

### Step 8: Confirm

Summarize for the user: which framework was targeted, which scoring backend was chosen and why, the confidence threshold in effect, and where the audit trail lands (PR comments, a log, both). Point to `/code-doc` for documenting the new harness module if it wasn't already covered in Step 7.
