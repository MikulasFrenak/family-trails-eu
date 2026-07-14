import { useAppStore, type Language } from "../store/useAppStore";
import { useLanguageChange } from "../hooks/useLanguageChange";

const LANGUAGES: Language[] = ["en", "cz", "sk"];

export function LanguageSwitcher() {
  const language = useAppStore((s) => s.language);
  const handleChange = useLanguageChange();

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
