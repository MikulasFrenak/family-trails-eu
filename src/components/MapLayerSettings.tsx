import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, type MapTypeId } from "../store/useAppStore";

const MAP_TYPES: MapTypeId[] = ["terrain", "roadmap", "satellite"];

export function MapLayerSettings() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mapTypeId = useAppStore((s) => s.mapTypeId);
  const setMapTypeId = useAppStore((s) => s.setMapTypeId);
  const showRoads = useAppStore((s) => s.showRoads);
  const showPlaceLabels = useAppStore((s) => s.showPlaceLabels);
  const showMountainLabels = useAppStore((s) => s.showMountainLabels);
  const showWaterLabels = useAppStore((s) => s.showWaterLabels);
  const setShowRoads = useAppStore((s) => s.setShowRoads);
  const setShowPlaceLabels = useAppStore((s) => s.setShowPlaceLabels);
  const setShowMountainLabels = useAppStore((s) => s.setShowMountainLabels);
  const setShowWaterLabels = useAppStore((s) => s.setShowWaterLabels);
  const isSatellite = mapTypeId === "satellite";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("mapLayers.title")}
        onClick={() => setOpen((v) => !v)}
        className={`relative z-40 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open ? "bg-brand-mint text-brand-header" : "text-brand-header-text/80 hover:bg-white/10"
        }`}
      >
        <SlidersIcon className="h-5 w-5" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl bg-brand-paper-raised p-2 text-brand-ink shadow-xl ring-1 ring-brand-mint-line">
            <p className="px-2 pb-1 pt-1 font-display text-sm font-semibold">{t("mapLayers.mapView")}</p>
            <div className="flex gap-1 px-2 pb-2">
              {MAP_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMapTypeId(type)}
                  className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${
                    mapTypeId === type
                      ? "bg-brand-forest text-white"
                      : "bg-brand-mint-line/60 text-brand-ink-soft hover:bg-brand-mint-line"
                  }`}
                >
                  {t(`mapLayers.${type}`)}
                </button>
              ))}
            </div>

            <p className="px-2 pb-1 pt-2 font-display text-sm font-semibold">{t("mapLayers.title")}</p>
            {isSatellite && (
              <p className="px-2 pb-2 text-xs text-brand-ink-soft">{t("mapLayers.satelliteNote")}</p>
            )}
            <div className={isSatellite ? "pointer-events-none opacity-40" : undefined}>
              <ToggleRow label={t("mapLayers.roads")} checked={showRoads} onChange={setShowRoads} />
              <ToggleRow
                label={t("mapLayers.placeNames")}
                checked={showPlaceLabels}
                onChange={setShowPlaceLabels}
              />
              <ToggleRow
                label={t("mapLayers.mountains")}
                checked={showMountainLabels}
                onChange={setShowMountainLabels}
              />
              <ToggleRow
                label={t("mapLayers.rivers")}
                checked={showWaterLabels}
                onChange={setShowWaterLabels}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left text-sm transition-colors hover:bg-brand-mint-line/60"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-forest" : "bg-brand-mint-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="14" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="16" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
