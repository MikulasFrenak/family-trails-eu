import { forwardRef, useEffect, useRef, useState } from "react";
import categoriesData from "../../data/categories.json";
import { useAppStore, type Language } from "../store/useAppStore";
import type { Category } from "../types/poi";
import { CATEGORY_ICONS } from "../lib/categoryIcons";

const CATEGORIES = categoriesData as unknown as Category[];
const GAP_PX = 8;
const MORE_BUTTON_PX = 44;

export function CategoryFilter() {
  const language = useAppStore((s) => s.language);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const toggleCategory = useAppStore((s) => s.toggleCategory);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [visibleCount, setVisibleCount] = useState(CATEGORIES.length);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalculate = () => {
      const containerWidth = container.clientWidth;
      let used = 0;
      let count = CATEGORIES.length;

      for (let i = 0; i < CATEGORIES.length; i++) {
        const width = measureRefs.current[i]?.offsetWidth ?? 0;
        const gap = i > 0 ? GAP_PX : 0;
        const isLast = i === CATEGORIES.length - 1;
        const budget = containerWidth - (isLast ? 0 : MORE_BUTTON_PX + GAP_PX);
        if (used + gap + width > budget) {
          count = i;
          break;
        }
        used += gap + width;
      }
      setVisibleCount(count);
    };

    const resizeObserver = new ResizeObserver(recalculate);
    resizeObserver.observe(container);
    recalculate();
    return () => resizeObserver.disconnect();
  }, [language]);

  const overflowCategories = CATEGORIES.slice(visibleCount);

  return (
    <div className="relative bg-brand-paper-raised px-4 py-3 shadow-sm">
      {/* Invisible clone, always fully rendered, used only to measure each
          chip's natural width so we know how many fit before overflowing. */}
      <div
        className="pointer-events-none invisible absolute inset-x-4 top-3 flex items-center gap-2"
        aria-hidden="true"
      >
        {CATEGORIES.map((category, i) => (
          <CategoryChip
            key={category.id}
            ref={(el) => {
              measureRefs.current[i] = el;
            }}
            category={category}
            language={language}
            active={false}
            onClick={() => {}}
          />
        ))}
      </div>

      <div ref={containerRef} className="flex items-center gap-2">
        {CATEGORIES.slice(0, visibleCount).map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            language={language}
            active={activeCategories.includes(category.id)}
            onClick={() => toggleCategory(category.id)}
          />
        ))}
        {overflowCategories.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="More categories"
              onClick={() => setMoreOpen((v) => !v)}
              className={`relative z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold transition-colors ${
                moreOpen
                  ? "border-brand-forest bg-brand-forest text-white"
                  : "border-brand-mint-line text-brand-ink-soft hover:border-brand-forest"
              }`}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-2 w-60 max-w-[80vw] rounded-2xl bg-brand-paper-raised p-2 shadow-xl ring-1 ring-brand-mint-line">
                  {overflowCategories.map((category) => {
                    const active = activeCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left font-display text-sm font-medium transition-colors ${
                          active ? "text-white" : "text-brand-ink hover:bg-brand-mint-line/60"
                        }`}
                        style={{ backgroundColor: active ? category.color : undefined }}
                      >
                        <img src={CATEGORY_ICONS[category.id]} alt="" className="h-5 w-auto" />
                        {category.label[language] ?? category.label.en}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CategoryChip = forwardRef<
  HTMLButtonElement,
  { category: Category; language: Language; active: boolean; onClick: () => void }
>(({ category, language, active, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-display text-sm font-medium transition-all ${
      active ? "-translate-y-0.5 text-white shadow-md" : "text-brand-ink-soft hover:-translate-y-0.5"
    }`}
    style={{
      backgroundColor: active ? category.color : "transparent",
      borderColor: category.color,
    }}
  >
    <img src={CATEGORY_ICONS[category.id]} alt="" className="h-5 w-auto" />
    {category.label[language] ?? category.label.en}
  </button>
));
CategoryChip.displayName = "CategoryChip";
