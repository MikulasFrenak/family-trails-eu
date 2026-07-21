import { create } from "zustand";
import i18next from "../i18n";

export type Country = "CZ" | "SK";
export type Language = "en" | "cz" | "sk";
export type MapStyleId = "playful" | "nature";
export type MapTypeId = "terrain" | "roadmap" | "satellite";
// Which map engine renders MapView — "google" (the clean, unmodified Google
// Maps implementation) or "maplibre" (vector tiles, pluggable tile provider,
// currently TomTom only). mapStyle (playful/nature) is Google-only and is
// ignored when mapProvider is "maplibre".
export type MapProvider = "google" | "maplibre";

// i18next's browser-language detection resolves synchronously (no backend,
// resources are bundled) — read it here so the very first render already
// has the right language, instead of correcting it a tick later via effect.
function getInitialLanguage(): Language {
  const resolved = i18next.resolvedLanguage;
  return resolved === "en" || resolved === "cz" || resolved === "sk" ? resolved : "en";
}

interface AppState {
  country: Country;
  language: Language;
  mapProvider: MapProvider;
  mapStyle: MapStyleId;
  mapTypeId: MapTypeId;
  activeCategories: string[];
  selectedPoiId: string | null;
  showRoads: boolean;
  showPlaceLabels: boolean;
  showMountainLabels: boolean;
  showWaterLabels: boolean;
  setCountry: (country: Country) => void;
  setLanguage: (language: Language) => void;
  setMapProvider: (mapProvider: MapProvider) => void;
  setMapStyle: (mapStyle: MapStyleId) => void;
  setMapTypeId: (mapTypeId: MapTypeId) => void;
  toggleCategory: (categoryId: string) => void;
  selectPoi: (poiId: string | null) => void;
  setShowRoads: (show: boolean) => void;
  setShowPlaceLabels: (show: boolean) => void;
  setShowMountainLabels: (show: boolean) => void;
  setShowWaterLabels: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  country: "CZ",
  language: getInitialLanguage(),
  // Google stays the default — MapLibre/TomTom is an opt-in, learning-focused
  // switcher (see PLAN.md §8), not a replacement for the primary experience.
  mapProvider: "google",
  mapStyle: "playful",
  mapTypeId: "terrain",
  activeCategories: [],
  selectedPoiId: null,
  showRoads: false,
  showPlaceLabels: false,
  showMountainLabels: false,
  showWaterLabels: false,
  setCountry: (country) => set({ country }),
  setLanguage: (language) => set({ language }),
  setMapProvider: (mapProvider) => set({ mapProvider }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setMapTypeId: (mapTypeId) => set({ mapTypeId }),
  toggleCategory: (categoryId) =>
    set((state) => ({
      activeCategories: state.activeCategories.includes(categoryId)
        ? state.activeCategories.filter((id) => id !== categoryId)
        : [...state.activeCategories, categoryId],
    })),
  selectPoi: (poiId) => set({ selectedPoiId: poiId }),
  setShowRoads: (showRoads) => set({ showRoads }),
  setShowPlaceLabels: (showPlaceLabels) => set({ showPlaceLabels }),
  setShowMountainLabels: (showMountainLabels) => set({ showMountainLabels }),
  setShowWaterLabels: (showWaterLabels) => set({ showWaterLabels }),
}));
