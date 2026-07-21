import { useTranslation } from "react-i18next";

export function MapLoadingOverlay() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-paper">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-mint-line border-t-brand-forest"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-brand-ink-soft">{t("mapLoading")}</p>
      </div>
    </div>
  );
}
