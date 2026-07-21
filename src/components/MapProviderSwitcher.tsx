import { useTranslation } from "react-i18next";
import { useAppStore, type MapProvider } from "../store/useAppStore";

const PROVIDERS: MapProvider[] = ["google", "maplibre"];

export function MapProviderSwitcher() {
  const { t } = useTranslation();
  const mapProvider = useAppStore((s) => s.mapProvider);
  const setMapProvider = useAppStore((s) => s.setMapProvider);

  return (
    <div className="flex gap-1 rounded-full bg-white/10 p-1">
      {PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => setMapProvider(provider)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
            mapProvider === provider
              ? "bg-brand-mint text-brand-header"
              : "text-brand-header-text/80 hover:bg-white/10"
          }`}
        >
          {t(`mapProvider.${provider}`)}
        </button>
      ))}
    </div>
  );
}
