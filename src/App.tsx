import { useTranslation } from "react-i18next";
import { MapView } from "./components/MapView";
import { CategoryFilter } from "./components/CategoryFilter";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { StyleSwitcher } from "./components/StyleSwitcher";
import { MapProviderSwitcher } from "./components/MapProviderSwitcher";
import { POIDetailPanel } from "./components/POIDetailPanel";
import { MapLayerSettings } from "./components/MapLayerSettings";
import { useIsMobile } from "./hooks/useIsMobile";
import { useIsCompact } from "./hooks/useIsCompact";

export default function App() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();

  return (
    <div className="flex h-screen w-screen flex-col bg-brand-paper">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-brand-header px-3 py-2 shadow-md sm:px-5 sm:py-3">
        <h1 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-header-text sm:text-xl">
          <CompassLogo className="h-7 w-7 sm:h-8 sm:w-8" />
          {t("app.title")}
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isMobile && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Three switcher groups plus the title don't fit one header
                  line below md (768px) — moves into MapLayerSettings'
                  dropdown in that 640–767px gap instead of wrapping the
                  header (see useIsCompact). */}
              {!isCompact && <MapProviderSwitcher />}
              <StyleSwitcher />
              <LanguageSwitcher />
            </div>
          )}
          <MapLayerSettings />
        </div>
      </header>
      {!isMobile && <CategoryFilter />}
      <main className="relative flex-1">
        <MapView />
        <POIDetailPanel />
      </main>
    </div>
  );
}

// Replaces the 🧭 emoji with a badge matching the marker icon system: a
// circle badge + a two-tone compass needle, same drop-shadow convention as
// the map pins in src/assets/markers/.
function CompassLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <filter id="compassShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0e1f17" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill="#ffffff" stroke="#c9e7d5" strokeWidth="1.5" filter="url(#compassShadow)" />
      <path d="M16 5 12.5 16 19.5 16Z" fill="#f2545b" />
      <path d="M16 27 12.5 16 19.5 16Z" fill="#a8b5ae" />
      <circle cx="16" cy="16" r="1.8" fill="#1f6d4c" />
    </svg>
  );
}
