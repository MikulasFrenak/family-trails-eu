import type { Locator, Page } from "@playwright/test";
import type { Candidate, ElementFingerprint } from "./scorer";

// page.evaluate() only serializes the function body given to it, so both extractors below must be self-contained (no outer-scope references).

function extractFingerprintFields(el: Element): ElementFingerprint {
  function buildShortDomPath(node: Element): string {
    const parts: string[] = [];
    let current: Element | null = node;
    let depth = 0;
    while (current && depth < 4) {
      const parent: Element | null = current.parentElement;
      let part = current.tagName.toLowerCase();
      if (parent) {
        const siblingsOfType = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
        if (siblingsOfType.length > 1) {
          part += `:nth-of-type(${siblingsOfType.indexOf(current) + 1})`;
        }
      }
      parts.unshift(part);
      current = parent;
      depth++;
    }
    return parts.join(" > ");
  }

  return {
    role: el.getAttribute("role") ?? undefined,
    text: el.textContent?.trim().slice(0, 80) ?? undefined,
    ariaLabel: el.getAttribute("aria-label") ?? undefined,
    tag: el.tagName.toLowerCase(),
    domPath: buildShortDomPath(el),
    siblingText: Array.from(el.parentElement?.children ?? [])
      .map((s) => s.textContent?.trim().slice(0, 40))
      .filter((t): t is string => Boolean(t)),
  };
}

export async function captureFingerprint(locator: Locator): Promise<ElementFingerprint> {
  return locator.evaluate(extractFingerprintFields);
}

export async function generateCandidates(page: Page, tag: string): Promise<Candidate[]> {
  return page.evaluate(
    ({ tag: targetTag }) => {
      function buildShortDomPath(node: Element): string {
        const parts: string[] = [];
        let current: Element | null = node;
        let depth = 0;
        while (current && depth < 4) {
          const parent: Element | null = current.parentElement;
          let part = current.tagName.toLowerCase();
          if (parent) {
            const siblingsOfType = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
            if (siblingsOfType.length > 1) {
              part += `:nth-of-type(${siblingsOfType.indexOf(current) + 1})`;
            }
          }
          parts.unshift(part);
          current = parent;
          depth++;
        }
        return parts.join(" > ");
      }

      const isVisible = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
      };

      return Array.from(document.querySelectorAll(targetTag))
        .filter(isVisible)
        .slice(0, 100)
        .map((el, i) => {
          // domPath is shape-based and can collide across unrelated subtrees (e.g. Google
          // Maps' own controls), so it's unsafe to reuse as a literal re-location selector.
          const markerAttr = "data-heal-candidate";
          el.setAttribute(markerAttr, String(i));
          return {
            role: el.getAttribute("role") ?? undefined,
            text: el.textContent?.trim().slice(0, 80) ?? undefined,
            ariaLabel: el.getAttribute("aria-label") ?? undefined,
            tag: el.tagName.toLowerCase(),
            domPath: buildShortDomPath(el),
            siblingText: Array.from(el.parentElement?.children ?? [])
              .map((s) => s.textContent?.trim().slice(0, 40))
              .filter((t): t is string => Boolean(t)),
            selector: `[${markerAttr}="${i}"]`,
          };
        });
    },
    { tag },
  );
}
