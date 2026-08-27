import { describe, expect, it } from "vitest";
import { rankCandidates, scoreCandidate, type Candidate, type ElementFingerprint } from "./scorer";

const baseline: ElementFingerprint = {
  role: undefined,
  text: "Zoo",
  ariaLabel: undefined,
  tag: "button",
  domPath: "div > div:nth-of-type(1) > button",
  siblingText: ["Castle", "Nature & trails", "Zoo"],
};

describe("scoreCandidate", () => {
  it("scores an identical element as a perfect match", () => {
    const candidate: Candidate = { ...baseline, selector: baseline.domPath };
    expect(scoreCandidate(baseline, candidate).score).toBeCloseTo(1, 5);
  });

  it("scores a renamed-but-structurally-identical element highly", () => {
    const candidate: Candidate = {
      ...baseline,
      text: "Zoos",
      domPath: "div > div:nth-of-type(1) > button:nth-of-type(3)",
      selector: "div > div:nth-of-type(1) > button:nth-of-type(3)",
    };
    const { score } = scoreCandidate(baseline, candidate);
    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThan(1);
  });

  it("scores an unrelated element low", () => {
    const candidate: Candidate = {
      tag: "a",
      role: "link",
      text: "Visit website",
      ariaLabel: undefined,
      domPath: "div > a",
      siblingText: [],
      selector: "div > a",
    };
    expect(scoreCandidate(baseline, candidate).score).toBeLessThan(0.3);
  });
});

describe("rankCandidates", () => {
  it("ranks the best match first", () => {
    const exact: Candidate = { ...baseline, selector: "exact" };
    const unrelated: Candidate = {
      tag: "a",
      role: "link",
      text: "Visit website",
      domPath: "div > a",
      siblingText: [],
      selector: "unrelated",
    };
    const ranked = rankCandidates(baseline, [unrelated, exact]);
    expect(ranked[0].candidate.selector).toBe("exact");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
