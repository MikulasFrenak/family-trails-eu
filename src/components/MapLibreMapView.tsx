import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapLoadFallback } from "./MapLoadFallback";
import { MapLoadingOverlay } from "./MapLoadingOverlay";
import { MarkerLayerMapLibre } from "./MarkerLayerMapLibre";
import { ZoomControlMapLibre } from "./ZoomControlMapLibre";
import { FilterControl } from "./FilterControl";
import { StyleOverrideMapLibre } from "./StyleOverrideMapLibre";
import { MIN_ZOOM, MAX_ZOOM, SLOVAKIA_BOUNDS_MAPLIBRE, MAP_BOUNDS_PADDING } from "../lib/mapConstants";
import { MAPLIBRE_PROVIDERS, DEFAULT_MAPLIBRE_PROVIDER_ID } from "../lib/mapLibreProviders";
import { ensureMapLibreHillshade } from "../lib/mapLibreHillshade";
import { applyMapLibreLayerVisibility, applyMapLibreStyleOverrides } from "../lib/mapLibreStyleOverrides";
import { useAppStore } from "../store/useAppStore";

const LOAD_TIMEOUT_MS = 15000;

const provider = MAPLIBRE_PROVIDERS[DEFAULT_MAPLIBRE_PROVIDER_ID];

export function MapLibreMapView() {
  const apiKey = import.meta.env[provider.apiKeyEnvVar] as string | undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [failure, setFailure] = useState<null | "auth" | "timeout">(null);
  const [attempt, setAttempt] = useState(0);

  const handleRetry = useCallback(() => {
    setFailure(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    let cancelled = false;
    let loaded = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
    };
    const arm = () => {
      disarm();
      if (!loaded && document.visibilityState === "visible") {
        timeout = setTimeout(() => setFailure("timeout"), LOAD_TIMEOUT_MS);
      }
    };

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: provider.styleUrl(apiKey),
      bounds: SLOVAKIA_BOUNDS_MAPLIBRE,
      fitBoundsOptions: { padding: MAP_BOUNDS_PADDING },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    instance.on("style.load", () => {
      const state = useAppStore.getState();
      applyMapLibreStyleOverrides(instance, state.mapStyle);
      applyMapLibreLayerVisibility(instance, {
        showRoads: state.showRoads,
        showPlaceLabels: state.showPlaceLabels,
        showMountainLabels: state.showMountainLabels,
        showWaterLabels: state.showWaterLabels,
      });
    });

    instance.on("load", () => {
      loaded = true;
      disarm();
      ensureMapLibreHillshade(instance, apiKey);
      if (!cancelled) setMap(instance);
    });
    instance.on("error", (e) => {
      if (loaded || cancelled) return;
      const status = (e as { error?: { status?: number } }).error?.status;
      setFailure(status === 401 || status === 403 ? "auth" : "timeout");
    });

    arm();
    document.addEventListener("visibilitychange", arm);

    return () => {
      cancelled = true;
      disarm();
      document.removeEventListener("visibilitychange", arm);
      instance.remove();
      setMap(null);
    };
  }, [apiKey, attempt]);

  if (!apiKey || failure === "auth") {
    return <MapLoadFallback />;
  }

  if (failure === "timeout") {
    return <MapLoadFallback onRetry={handleRetry} />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!map && <MapLoadingOverlay />}
      {map && (
        <>
          <StyleOverrideMapLibre map={map} />
          <MarkerLayerMapLibre map={map} />
          <ZoomControlMapLibre map={map} />
          <FilterControl />
        </>
      )}
    </div>
  );
}
