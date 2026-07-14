import { useTranslation } from "react-i18next";

export function MapLoadFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-paper p-8">
      <div className="max-w-sm rounded-3xl bg-brand-paper-raised p-8 text-center shadow-xl ring-1 ring-brand-mint-line">
        <span className="text-5xl" aria-hidden="true">
          🗺️🌲🏰
        </span>
        <h2 className="mt-3 font-display text-lg font-semibold text-brand-ink">
          {t("mapLoadFallback.title")}
        </h2>
        <p className="mt-2 text-sm text-brand-ink-soft">{t("mapLoadFallback.message")}</p>
      </div>
    </div>
  );
}
