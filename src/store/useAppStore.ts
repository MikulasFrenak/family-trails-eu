import { create } from "zustand";
import i18next from "../i18n";

export type Country = "CZ" | "SK";
export type Language = "en" | "cz" | "sk";
export type MapStyleId = "playful" | "nature";
export type MapTypeId = "terrain" | "roadmap" | "satellite";
export type MapProvider = "google" | "maplibre";

function getInitialLanguage(): Language {
  const resolved = i18next.resolvedLanguage;
  return resolved === "en" || resolved === "cz" || resolved === "sk" ? resolved : "en";
}

const MAP_PROVIDER_STORAGE_KEY = "family-trails:mapProvider";

function getInitialMapProvider(): MapProvider {
  try {
    const stored = localStorage.getItem(MAP_PROVIDER_STORAGE_KEY);
    return stored === "google" || stored === "maplibre" ? stored : "google";
  } catch {
    return "google";
  }
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
  mapProvider: getInitialMapProvider(),
  mapStyle: "nature",
  mapTypeId: "terrain",
  activeCategories: [],
  selectedPoiId: null,
  showRoads: false,
  showPlaceLabels: false,
  showMountainLabels: false,
  showWaterLabels: false,
  setCountry: (country) => set({ country }),
  setLanguage: (language) => set({ language }),
  setMapProvider: (mapProvider) => {
    try {
      localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, mapProvider);
    } catch {
    }
    set({ mapProvider });
  },
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
