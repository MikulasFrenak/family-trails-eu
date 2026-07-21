import { useAppStore } from "../store/useAppStore";
import { GoogleMapView } from "./GoogleMapView";
import { MapLibreMapView } from "./MapLibreMapView";

// Thin switch only — no shared logic lives here on purpose. GoogleMapView
// stays the one clean, unmodified Google Maps implementation; MapLibreMapView
// is the separate vector-tile implementation (TomTom today, more providers
// later per PLAN.md §8). Don't add branching inside either of those files
// for the other provider — extend this switch instead.
export function MapView() {
  const mapProvider = useAppStore((s) => s.mapProvider);
  return mapProvider === "maplibre" ? <MapLibreMapView /> : <GoogleMapView />;
}
