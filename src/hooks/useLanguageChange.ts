import { useTranslation } from "react-i18next";
import { useAppStore, type Language } from "../store/useAppStore";

// Shared by LanguageSwitcher (desktop) and MapLayerSettings (mobile) — both
// need the exact same "change language" behavior, so it lives in one place.
export function useLanguageChange(): (lang: Language) => void {
  const { i18n } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    // Google Maps only reads its `language` param when the script first
    // loads and can't hot-swap it afterwards, so a full reload is the only
    // way to actually re-localize the map tiles/labels.
    void i18n.changeLanguage(lang).then(() => window.location.reload());
  };
}
