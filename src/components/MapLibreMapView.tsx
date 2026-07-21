import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapLoadFallback } from "./MapLoadFallback";
import { MarkerLayerMapLibre } from "./MarkerLayerMapLibre";
import { ZoomControlMapLibre } from "./ZoomControlMapLibre";
import { FilterControl } from "./FilterControl";
import { MIN_ZOOM, MAX_ZOOM, SLOVAKIA_BOUNDS_MAPLIBRE, MAP_BOUNDS_PADDING } from "../lib/mapConstants";
import { MAPLIBRE_PROVIDERS, DEFAULT_MAPLIBRE_PROVIDER_ID } from "../lib/mapLibreProviders";

// Generous on purpose, same reasoning as GoogleMapView's LOAD_TIMEOUT_MS —
// kept as a separate constant (not imported from there) since the two map
// views are deliberately independent implementations.
const LOAD_TIMEOUT_MS = 15000;

// Only TomTom exists today (see src/lib/mapLibreProviders.ts) — no provider
// picker inside MapLibre itself yet, that's a later phase per PLAN.md §8.
const provider = MAPLIBRE_PROVIDERS[DEFAULT_MAPLIBRE_PROVIDER_ID];

export function MapLibreMapView() {
  const apiKey = import.meta.env[provider.apiKeyEnvVar] as string | undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // 'auth' = missing/invalid key or a style-load error (retry won't help);
  // 'timeout' = the map just didn't finish loading in time — offer a retry,
  // same two-state shape as GoogleMapView's failure handling.
  const [failure, setFailure] = useState<null | "auth" | "timeout">(null);
  const [attempt, setAttempt] = useState(0);

  const handleRetry = useCallback(() => {
    setFailure(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    let cancelled = false;
    let instance: maplibregl.Map | undefined;
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

    // buildStyle fetches TomTom's style JSON and patches in the "sources"
    // block it doesn't include on its own (see mapLibreProviders.ts) — the
    // map can't be constructed until that resolves.
    provider
      .buildStyle(apiKey)
      .then((style) => {
        if (cancelled || !containerRef.current) return;

        instance = new maplibregl.Map({
          container: containerRef.current,
          // Cast, not a precisely-known type name — see the same pattern
          // (and reasoning) in MarkerLayerMapLibre.tsx.
          style: style as never,
          bounds: SLOVAKIA_BOUNDS_MAPLIBRE,
          fitBoundsOptions: { padding: MAP_BOUNDS_PADDING },
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
        });

        instance.on("load", () => {
          loaded = true;
          disarm();
          if (!cancelled) setMap(instance ?? null);
        });
        // A bad/unauthorized key surfaces here (a tile request failing),
        // same bucket as Google's gm_authFailure — retrying won't help
        // without a valid, entitled key, so this goes to the non-retryable
        // fallback.
        instance.on("error", () => {
          if (!loaded && !cancelled) setFailure("auth");
        });

        arm();
      })
      .catch(() => {
        // Style fetch itself failed (bad key, network, TomTom outage) —
        // same non-retryable bucket as an in-map error.
        if (!cancelled) setFailure("auth");
      });

    document.addEventListener("visibilitychange", arm);

    return () => {
      cancelled = true;
      disarm();
      document.removeEventListener("visibilitychange", arm);
      instance?.remove();
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
      {map && (
        <>
          <MarkerLayerMapLibre map={map} />
          <ZoomControlMapLibre map={map} />
          <FilterControl />
        </>
      )}
    </div>
  );
}
