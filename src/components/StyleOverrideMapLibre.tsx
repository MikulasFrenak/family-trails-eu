import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { useAppStore } from "../store/useAppStore";
import { applyMapLibreLayerVisibility, applyMapLibreStyleOverrides } from "../lib/mapLibreStyleOverrides";

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
