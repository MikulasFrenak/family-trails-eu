import { useTranslation } from "react-i18next";
import { useAppStore, type MapStyleId } from "../store/useAppStore";

const STYLES: MapStyleId[] = ["playful", "nature"];

export function StyleSwitcher() {
  const { t } = useTranslation();
  const mapStyle = useAppStore((s) => s.mapStyle);
  const setMapStyle = useAppStore((s) => s.setMapStyle);

  return (
    <div className="flex gap-1 rounded-full bg-white/10 p-1">
      {STYLES.map((style) => (
        <button
          key={style}
          type="button"
          onClick={() => setMapStyle(style)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
            mapStyle === style
              ? "bg-brand-mint text-brand-header"
              : "text-brand-header-text/80 hover:bg-white/10"
          }`}
        >
          {t(`mapStyle.${style}`)}
        </button>
      ))}
    </div>
  );
}
