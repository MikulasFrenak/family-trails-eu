import { useAppStore } from "../store/useAppStore";
import { GoogleMapView } from "./GoogleMapView";
import { MapLibreMapView } from "./MapLibreMapView";

export function MapView() {
  const mapProvider = useAppStore((s) => s.mapProvider);
  return mapProvider === "maplibre" ? <MapLibreMapView /> : <GoogleMapView />;
}
