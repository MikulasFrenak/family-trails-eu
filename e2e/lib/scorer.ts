export interface ElementFingerprint {
  role?: string;
  text?: string;
  ariaLabel?: string;
  tag: string;
  domPath: string;
  siblingText?: string[];
}

export interface Candidate extends ElementFingerprint {
  selector: string;
}

export interface ScoredCandidate {
  candidate: Candidate;
  score: number;
  rationale: string;
}

const WEIGHTS = {
  tag: 0.1,
  role: 0.15,
  text: 0.35,
  ariaLabel: 0.2,
  domPath: 0.1,
  siblingText: 0.1,
} as const;

function lcsLength(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function textSimilarity(a?: string, b?: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  return (2 * lcsLength(a, b)) / (a.length + b.length);
}

function siblingSimilarity(a?: string[], b?: string[]): number {
  if (!a?.length && !b?.length) return 1;
  if (!a?.length || !b?.length) return 0;
  const overlap = a.filter((t) => b.includes(t)).length;
  return overlap / Math.max(a.length, b.length);
}

export function scoreCandidate(fingerprint: ElementFingerprint, candidate: Candidate): ScoredCandidate {
  const parts = [
    { key: "tag", score: fingerprint.tag === candidate.tag ? 1 : 0, weight: WEIGHTS.tag },
    {
      key: "role",
      score: fingerprint.role === candidate.role ? 1 : !fingerprint.role && !candidate.role ? 1 : 0,
      weight: WEIGHTS.role,
    },
    { key: "text", score: textSimilarity(fingerprint.text, candidate.text), weight: WEIGHTS.text },
    { key: "ariaLabel", score: textSimilarity(fingerprint.ariaLabel, candidate.ariaLabel), weight: WEIGHTS.ariaLabel },
    { key: "domPath", score: textSimilarity(fingerprint.domPath, candidate.domPath), weight: WEIGHTS.domPath },
    {
      key: "siblingText",
      score: siblingSimilarity(fingerprint.siblingText, candidate.siblingText),
      weight: WEIGHTS.siblingText,
    },
  ];
  const score = parts.reduce((sum, p) => sum + p.score * p.weight, 0);
  const rationale = parts.map((p) => `${p.key}=${p.score.toFixed(2)}`).join(", ");
  return { candidate, score, rationale };
}

export function rankCandidates(fingerprint: ElementFingerprint, candidates: Candidate[]): ScoredCandidate[] {
  return candidates.map((c) => scoreCandidate(fingerprint, c)).sort((a, b) => b.score - a.score);
}
