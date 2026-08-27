import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { captureFingerprint, generateCandidates } from "./fingerprint";
import { rankCandidates, type ElementFingerprint } from "./scorer";

const CONFIDENCE_THRESHOLD = 0.9;
const FINGERPRINT_DIR = join(process.cwd(), "e2e", "fingerprints");
const AUDIT_LOG = join(process.cwd(), "e2e", ".healing-audit", "audit-log.jsonl");

function fingerprintPath(key: string): string {
  return join(FINGERPRINT_DIR, `${key}.json`);
}

function readStoredFingerprint(key: string): ElementFingerprint | null {
  const path = fingerprintPath(key);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeStoredFingerprint(key: string, fingerprint: ElementFingerprint): void {
  mkdirSync(FINGERPRINT_DIR, { recursive: true });
  writeFileSync(fingerprintPath(key), JSON.stringify(fingerprint, null, 2) + "\n");
}

function appendAuditEntry(entry: Record<string, unknown>): void {
  mkdirSync(dirname(AUDIT_LOG), { recursive: true });
  appendFileSync(AUDIT_LOG, JSON.stringify(entry) + "\n");
}

// On failure, scores current DOM against the fingerprint stored for `key`; below threshold it fails loudly rather than guessing.
export async function healingLocator(page: Page, key: string, selector: string): Promise<Locator> {
  const locator = page.locator(selector);
  try {
    await locator.first().waitFor({ state: "attached", timeout: 3000 });
    writeStoredFingerprint(key, await captureFingerprint(locator.first()));
    return locator;
  } catch (err) {
    return healOrThrow(page, key, selector, err as Error);
  }
}

async function healOrThrow(page: Page, key: string, selector: string, originalError: Error): Promise<Locator> {
  const fingerprint = readStoredFingerprint(key);
  if (!fingerprint) throw originalError;

  const candidates = await generateCandidates(page, fingerprint.tag);
  const ranked = rankCandidates(fingerprint, candidates);
  const top = ranked[0];

  appendAuditEntry({
    timestamp: new Date().toISOString(),
    key,
    originalSelector: selector,
    error: originalError.message.split("\n")[0],
    healed: Boolean(top && top.score >= CONFIDENCE_THRESHOLD),
    topCandidates: ranked.slice(0, 3).map((r) => ({
      selector: r.candidate.selector,
      score: Number(r.score.toFixed(3)),
      rationale: r.rationale,
    })),
  });

  if (top && top.score >= CONFIDENCE_THRESHOLD) {
    console.warn(
      `[self-healing] "${key}" auto-patched: ${selector} -> ${top.candidate.selector} ` +
        `(confidence ${(top.score * 100).toFixed(0)}%, ${top.rationale}). See e2e/.healing-audit/audit-log.jsonl.`,
    );
    return page.locator(top.candidate.selector);
  }

  const report = ranked
    .slice(0, 3)
    .map((r, i) => `  ${i + 1}. ${r.candidate.selector} (${(r.score * 100).toFixed(0)}%) — ${r.rationale}`)
    .join("\n");
  throw new Error(
    `[self-healing] "${key}" locator "${selector}" failed and no candidate met the ` +
      `${CONFIDENCE_THRESHOLD * 100}% confidence threshold.\nTop candidates:\n${report}\n` +
      `Original error: ${originalError.message.split("\n")[0]}`,
  );
}
