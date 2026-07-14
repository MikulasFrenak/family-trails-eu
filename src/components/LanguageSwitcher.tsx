import { useTranslation } from "react-i18next";
import { useAppStore, type Language } from "../store/useAppStore";

const LANGUAGES: Language[] = ["en", "cz", "sk"];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const handleChange = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    // Google Maps only reads its `language` param when the script first
    // loads and can't hot-swap it afterwards, so a full reload is the only
    // way to actually re-localize the map tiles/labels.
    void i18n.changeLanguage(lang).then(() => window.location.reload());
  };

  return (
    <div className="flex gap-1 rounded-full bg-white/10 p-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => handleChange(lang)}
          className={`rounded-full px-3 py-1 text-sm font-semibold uppercase transition-colors ${
            language === lang
              ? "bg-brand-mint text-brand-header"
              : "text-brand-header-text/80 hover:bg-white/10"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
