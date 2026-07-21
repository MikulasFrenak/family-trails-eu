import { useTranslation } from "react-i18next";

// Shown while the MapLibre/TomTom instance is mounting — from the moment the
// container exists until "load" fires and MapLibreMapView sets `map`. Purely
// cosmetic (the style.load handler in MapLibreMapView already wins the color
// race against TomTom's default green/tan style — see that file's comment),
// but even with correct colors applied instantly, tiles still take a beat to
// fetch, so this covers "empty/half-drawn map" with something intentional
// instead of a bare gray container flashing in.
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
