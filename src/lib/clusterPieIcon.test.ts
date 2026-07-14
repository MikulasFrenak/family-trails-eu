import { describe, expect, it } from "vitest";
import { buildClusterPieIcon } from "./clusterPieIcon";

function decode(dataUri: string): string {
  expect(dataUri.startsWith("data:image/svg+xml;charset=UTF-8,")).toBe(true);
  return decodeURIComponent(dataUri.replace("data:image/svg+xml;charset=UTF-8,", ""));
}

describe("buildClusterPieIcon", () => {
  it("renders a single-segment cluster as a plain circle, not a pie slice", () => {
    const svg = decode(buildClusterPieIcon([{ color: "#f2545b", count: 5 }], 40));

    expect(svg).toContain('<circle cx="20" cy="20" r="18" fill="#f2545b" />');
    expect(svg).not.toContain("<path");
  });

  it("renders one path slice per segment for a multi-category cluster", () => {
    const svg = decode(
      buildClusterPieIcon(
        [
          { color: "#f2545b", count: 3 },
          { color: "#4c7de0", count: 1 },
        ],
        40,
      ),
    );

    expect(svg.match(/<path/g)).toHaveLength(2);
    expect(svg).toContain('fill="#f2545b"');
    expect(svg).toContain('fill="#4c7de0"');
  });

  it("falls back to a default color when the only segment has no color (defensive)", () => {
    const svg = decode(buildClusterPieIcon([], 40));
    expect(svg).toContain('fill="#144a34"');
  });

  it("treats an all-zero-count cluster as one full segment instead of dividing by zero", () => {
    // total would be 0 without the `|| 1` fallback in the source, which would
    // produce NaN angles and a malformed path — this guards that regression.
    const svg = decode(
      buildClusterPieIcon(
        [
          { color: "#f2545b", count: 0 },
          { color: "#4c7de0", count: 0 },
        ],
        40,
      ),
    );

    expect(svg).not.toContain("NaN");
  });

  it("scales the geometry to the requested size", () => {
    const small = decode(buildClusterPieIcon([{ color: "#f2545b", count: 1 }], 20));
    const large = decode(buildClusterPieIcon([{ color: "#f2545b", count: 1 }], 60));

    expect(small).toContain('width="20" height="20"');
    expect(large).toContain('width="60" height="60"');
  });
});
