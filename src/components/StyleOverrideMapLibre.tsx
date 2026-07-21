import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { useAppStore } from "../store/useAppStore";
import { applyMapLibreLayerVisibility, applyMapLibreStyleOverrides } from "../lib/mapLibreStyleOverrides";

// Renders nothing — recolors the already-loaded TomTom style in place to
// match whichever playful/nature palette is selected, and applies the
// road/place/mountain/water label toggles from MapLayerSettings. See
// mapLibreStyleOverrides.ts for why this is a runtime layer classifier
// instead of a static styles.json / a hand-listed set of layer ids the way
// Google's variants and stylers work.
export function StyleOverrideMapLibre({ map }: { map: maplibregl.Map }) {
  const mapStyle = useAppStore((s) => s.mapStyle);
  const showRoads = useAppStore((s) => s.showRoads);
  const showPlaceLabels = useAppStore((s) => s.showPlaceLabels);
  const showMountainLabels = useAppStore((s) => s.showMountainLabels);
  const showWaterLabels = useAppStore((s) => s.showWaterLabels);

  useEffect(() => {
    applyMapLibreStyleOverrides(map, mapStyle);
  }, [map, mapStyle]);

  useEffect(() => {
    applyMapLibreLayerVisibility(map, { showRoads, showPlaceLabels, showMountainLabels, showWaterLabels });
  }, [map, showRoads, showPlaceLabels, showMountainLabels, showWaterLabels]);

  return null;
}
