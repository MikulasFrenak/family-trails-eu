import { create } from "zustand";
import i18next from "../i18n";

export type Country = "CZ" | "SK";
export type Language = "en" | "cz" | "sk";
export type MapStyleId = "playful" | "nature";
export type MapTypeId = "terrain" | "roadmap" | "satellite";
// Which map engine renders MapView — "google" (the clean, unmodified Google
// Maps implementation) or "maplibre" (vector tiles, pluggable tile provider,
// currently TomTom only). mapStyle (playful/nature) and the road/label
// toggles below apply to both: Google reads them via src/mapStyles/*.json
// and HIDE_*_STYLE stylers, MapLibre via runtime overrides in
// src/lib/mapLibreStyleOverrides.ts (see StyleOverrideMapLibre). mapTypeId
// (terrain/roadmap/satellite) is the one Google-only field — MapLibre has no
// equivalent concept.
export type MapProvider = "google" | "maplibre";

// i18next's browser-language detection resolves synchronously (no backend,
// resources are bundled) — read it here so the very first render already
// has the right language, instead of correcting it a tick later via effect.
function getInitialLanguage(): Language {
  const resolved = i18next.resolvedLanguage;
  return resolved === "en" || resolved === "cz" || resolved === "sk" ? resolved : "en";
}

// Same pattern as getInitialLanguage above: read synchronously at store
// creation so the very first render already shows the provider the user
// last picked, instead of always flashing "google" for a tick. Deliberately
// a plain localStorage read/write rather than zustand's `persist` middleware
// — only this one field should survive a reload (country/activeCategories
// etc. resetting on refresh is fine/expected), and `persist` would need an
// explicit partialize to avoid persisting the whole store by default.
const MAP_PROVIDER_STORAGE_KEY = "family-trails:mapProvider";

function getInitialMapProvider(): MapProvider {
  try {
    const stored = localStorage.getItem(MAP_PROVIDER_STORAGE_KEY);
    return stored === "google" || stored === "maplibre" ? stored : "google";
  } catch {
    // Private browsing / storage disabled — fall back to the default rather
    // than letting a SecurityError take down the whole store.
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
  // Google stays the *first-ever* default — MapLibre/TomTom is an opt-in,
  // learning-focused switcher (see PLAN.md §8) — but once someone picks a
  // provider, that choice sticks across reloads (see getInitialMapProvider).
  mapProvider: getInitialMapProvider(),
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
  setMapProvider: (mapProvider) => {
    try {
      localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, mapProvider);
    } catch {
      // Same private-browsing/storage-disabled case as the read above —
      // the in-memory switch below still works for this session either way.
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
