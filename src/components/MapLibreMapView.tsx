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

    // Hand MapLibre the style URL directly — it fetches/parses/manages the
    // style itself (standard usage; see mapLibreProviders.ts for why this
    // file doesn't hand-fetch and patch the style anymore).
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: provider.styleUrl(apiKey),
      bounds: SLOVAKIA_BOUNDS_MAPLIBRE,
      fitBoundsOptions: { padding: MAP_BOUNDS_PADDING },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    // Apply our color/visibility overrides as soon as the raw style is
    // parsed ("style.load"), not after StyleOverrideMapLibre mounts via
    // React state on "load". "load" only fires once tiles have actually
    // rendered — by then TomTom's stock basic_main colors (a plain green/tan
    // street style) have already painted at least one visible frame,
    // producing a flash of the wrong style whenever this view mounts (e.g.
    // switching Google -> TomTom). "style.load" fires right after the style
    // JSON + sprite/glyphs are ready but before tile data has arrived, so
    // setting paint/layout properties here lands before the first real
    // paint instead of after it. The reactive effects in
    // StyleOverrideMapLibre still own re-applying on later mapStyle/toggle
    // changes — this is purely about winning the initial race.
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
      // Real shaded-relief terrain, same request that motivated it: Google's
      // "terrain" mapTypeId gives it hillshade texture, MapLibre/TomTom had
      // none — see mapLibreHillshade.ts. Added once per map instance
      // (guarded internally), independent of mapStyle (playful/nature).
      ensureMapLibreHillshade(instance, apiKey);
      if (!cancelled) setMap(instance);
    });
    // MapLibre's "error" event fires for all sorts of non-fatal things too
    // (a single failed tile, a missing sprite icon) — only a real 401/403
    // on the style/tile request itself means the key is bad. Anything else
    // before load finishes goes to the retryable "timeout" bucket instead
    // of the dead-end "auth" one.
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
