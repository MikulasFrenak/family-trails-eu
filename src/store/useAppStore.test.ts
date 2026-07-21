import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

const initialState = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(initialState, true);
});

describe("useAppStore", () => {
  it("starts with no active category filters and CZ as the default country", () => {
    const state = useAppStore.getState();
    expect(state.activeCategories).toEqual([]);
    expect(state.country).toBe("CZ");
    expect(state.language).toMatch(/^(en|cz|sk)$/);
  });

  it("defaults to the google map provider", () => {
    expect(useAppStore.getState().mapProvider).toBe("google");
  });

  describe("toggleCategory", () => {
    it("adds a category that isn't active yet", () => {
      useAppStore.getState().toggleCategory("zoo");
      expect(useAppStore.getState().activeCategories).toEqual(["zoo"]);
    });

    it("removes a category that's already active, without touching others", () => {
      useAppStore.getState().toggleCategory("zoo");
      useAppStore.getState().toggleCategory("castle");
      useAppStore.getState().toggleCategory("zoo");

      expect(useAppStore.getState().activeCategories).toEqual(["castle"]);
    });

    it("supports toggling the same category on and off repeatedly", () => {
      const { toggleCategory } = useAppStore.getState();
      toggleCategory("nature");
      toggleCategory("nature");
      toggleCategory("nature");

      expect(useAppStore.getState().activeCategories).toEqual(["nature"]);
    });
  });

  describe("simple setters", () => {
    it("setMapStyle updates mapStyle only", () => {
      useAppStore.getState().setMapStyle("nature");
      const state = useAppStore.getState();
      expect(state.mapStyle).toBe("nature");
      expect(state.mapTypeId).toBe("terrain"); // untouched
    });

    it("setMapTypeId updates mapTypeId only", () => {
      useAppStore.getState().setMapTypeId("satellite");
      expect(useAppStore.getState().mapTypeId).toBe("satellite");
    });

    it("setMapProvider updates mapProvider only", () => {
      useAppStore.getState().setMapProvider("maplibre");
      const state = useAppStore.getState();
      expect(state.mapProvider).toBe("maplibre");
      expect(state.mapStyle).toBe("playful"); // untouched
    });

    it("selectPoi sets and clears the selected POI id", () => {
      useAppStore.getState().selectPoi("cz-krivoklat");
      expect(useAppStore.getState().selectedPoiId).toBe("cz-krivoklat");

      useAppStore.getState().selectPoi(null);
      expect(useAppStore.getState().selectedPoiId).toBeNull();
    });

    it("layer-visibility setters are independent of each other", () => {
      useAppStore.getState().setShowRoads(true);
      const state = useAppStore.getState();
      expect(state.showRoads).toBe(true);
      expect(state.showPlaceLabels).toBe(false);
      expect(state.showMountainLabels).toBe(false);
      expect(state.showWaterLabels).toBe(false);
    });
  });
});
