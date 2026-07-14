import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { getPoiById } from "../data/pois";
import categoriesData from "../../data/categories.json";
import type { Category } from "../types/poi";
import { CATEGORY_ICONS } from "../lib/categoryIcons";

const CATEGORIES = categoriesData as unknown as Category[];

export function POIDetailPanel() {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const selectedPoiId = useAppStore((s) => s.selectedPoiId);
  const selectPoi = useAppStore((s) => s.selectPoi);

  if (!selectedPoiId) return null;
  const poi = getPoiById(selectedPoiId);
  if (!poi) return null;
  const category = CATEGORIES.find((c) => c.id === poi.category);

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 max-h-[65vh] max-w-md overflow-y-auto rounded-3xl bg-brand-paper-raised p-4 shadow-xl ring-1 ring-brand-mint-line sm:bottom-4 sm:left-4 sm:right-auto sm:p-5">
      <button
        type="button"
        onClick={() => selectPoi(null)}
        className="float-right rounded-full px-2 py-1 text-sm font-semibold text-brand-ink-soft hover:bg-brand-mint-line hover:text-brand-ink"
      >
        {t("poiDetail.close")}
      </button>
      {category && (
        <span
          className="mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-semibold text-white"
          style={{ backgroundColor: category.color }}
        >
          <img src={CATEGORY_ICONS[category.id]} alt="" className="h-4 w-auto" />
          {category.label[language] ?? category.label.en}
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-brand-ink">
        {poi.name[language] ?? poi.name.en}
      </h3>
      <p className="mt-1 text-sm text-brand-ink-soft">
        {poi.description[language] ?? poi.description.en}
      </p>
      {poi.kidFriendly && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-mint-line px-3 py-1 text-xs font-semibold text-brand-ink">
          <span aria-hidden="true">🧒</span>
          {t("poiDetail.kidFriendlyFrom", { age: poi.kidFriendly.minAge })}
        </p>
      )}
      {poi.externalUrl && (
        <a
          href={poi.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-sm font-semibold text-brand-forest hover:underline"
        >
          {t("poiDetail.visitWebsite")} →
        </a>
      )}
    </div>
  );
}
