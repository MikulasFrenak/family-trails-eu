import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import cz from "./locales/cz.json";
import sk from "./locales/sk.json";

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      cz: { translation: cz },
      sk: { translation: sk },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "cz", "sk"],
    interpolation: { escapeValue: false },
    detection: {
      // Browsers report Czech as the ISO code "cs", but our resource/store
      // key is "cz" — remap so browser auto-detection actually finds it.
      convertDetectedLanguage: (lng) => (lng.toLowerCase().startsWith("cs") ? "cz" : lng),
    },
  });

export default i18next;
