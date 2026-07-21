import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { useAppStore } from "../store/useAppStore";
import { applyMapLibreStyleOverrides } from "../lib/mapLibreStyleOverrides";

// Renders nothing — recolors the already-loaded TomTom style in place to
// match whichever playful/nature palette is selected (see
// mapLibreStyleOverrides.ts for why this is a runtime layer classifier
// instead of a static styles.json the way Google's variants work).
export function StyleOverrideMapLibre({ map }: { map: maplibregl.Map }) {
  const mapStyle = useAppStore((s) => s.mapStyle);

  useEffect(() => {
    applyMapLibreStyleOverrides(map, mapStyle);
  }, [map, mapStyle]);

  return null;
}
