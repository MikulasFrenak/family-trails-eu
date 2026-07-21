import { useState } from "react";
import categoriesData from "../../data/categories.json";
import { useAppStore } from "../store/useAppStore";
import type { Category } from "../types/poi";
import { CATEGORY_ICONS } from "../lib/categoryIcons";
import { useIsMobile } from "../hooks/useIsMobile";

const CATEGORIES = categoriesData as unknown as Category[];

export function FilterControl() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const language = useAppStore((s) => s.language);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const toggleCategory = useAppStore((s) => s.toggleCategory);
  const selectedPoiId = useAppStore((s) => s.selectedPoiId);

  if (!isMobile) return null;

  const hasActiveFilters = activeCategories.length > 0;

  return (
    <div className={`absolute right-3 z-20 ${selectedPoiId ? "bottom-[calc(65vh+0.75rem)]" : "bottom-3"}`}>
      <button
        type="button"
        aria-label="Filter categories"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ring-1 ring-brand-mint-line transition-colors ${
          open ? "bg-brand-mint text-brand-header" : "bg-brand-paper-raised text-brand-forest-deep hover:bg-brand-mint-line"
        }`}
      >
        <FilterIcon className="h-5 w-5" />
        {hasActiveFilters && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-forest ring-2 ring-brand-paper-raised"
          />
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-2xl bg-brand-paper-raised p-2 shadow-xl ring-1 ring-brand-mint-line">
            <p className="px-2 pb-1 pt-1 font-display text-sm font-semibold text-brand-ink">Categories</p>
            <div className="flex flex-col gap-1 p-1">
              {CATEGORIES.map((category) => {
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
          </div>
        </>
      )}
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 5h16l-6 7v6l-4 2v-8z" />
    </svg>
  );
}
