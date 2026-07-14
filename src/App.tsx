import { useTranslation } from "react-i18next";
import { MapView } from "./components/MapView";
import { CategoryFilter } from "./components/CategoryFilter";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { StyleSwitcher } from "./components/StyleSwitcher";
import { POIDetailPanel } from "./components/POIDetailPanel";
import { MapLayerSettings } from "./components/MapLayerSettings";

export default function App() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen w-screen flex-col bg-brand-paper">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-brand-header px-3 py-2 shadow-md sm:px-5 sm:py-3">
        <h1 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-header-text sm:text-xl">
          <span aria-hidden="true">🧭</span>
          {t("app.title")}
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StyleSwitcher />
          <LanguageSwitcher />
          <MapLayerSettings />
        </div>
      </header>
      <CategoryFilter />
      <main className="relative flex-1">
        <MapView />
        <POIDetailPanel />
      </main>
    </div>
  );
}
