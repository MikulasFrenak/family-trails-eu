import { useTranslation } from "react-i18next";
import { useAppStore, type Language } from "../store/useAppStore";

export function useLanguageChange(): (lang: Language) => void {
  const { i18n } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    void i18n.changeLanguage(lang).then(() => window.location.reload());
  };
}
