import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore, type Language, type MapStyleId } from "../store/useAppStore";
import { MarkerLayer } from "./MarkerLayer";
import { MapLoadFallback } from "./MapLoadFallback";
import { ZoomControl } from "./ZoomControl";
import { FilterControl } from "./FilterControl";
import { GOOGLE_MIN_ZOOM, GOOGLE_MAX_ZOOM, SLOVAKIA_BOUNDS, MAP_BOUNDS_PADDING } from "../lib/mapConstants";
import playfulStyle from "../mapStyles/playful.json";
import natureStyle from "../mapStyles/nature.json";

const MAP_STYLES: Record<MapStyleId, google.maps.MapTypeStyle[]> = {
  playful: playfulStyle as google.maps.MapTypeStyle[],
  nature: natureStyle as google.maps.MapTypeStyle[],
};

const GOOGLE_MAPS_LANGUAGE: Record<Language, string> = {
  en: "en",
  cz: "cs",
  sk: "sk",
};

const HIDE_ROADS_STYLE: google.maps.MapTypeStyle = {
  featureType: "road",
  stylers: [{ visibility: "off" }],
};

const HIDE_PLACE_LABELS_STYLE: google.maps.MapTypeStyle = {
  featureType: "administrative.locality",
  elementType: "labels",
  stylers: [{ visibility: "off" }],
};

const HIDE_MOUNTAIN_LABELS_STYLE: google.maps.MapTypeStyle = {
  featureType: "landscape.natural.terrain",
  elementType: "labels",
  stylers: [{ visibility: "off" }],
};

const HIDE_WATER_LABELS_STYLE: google.maps.MapTypeStyle = {
  featureType: "water",
  elementType: "labels",
  stylers: [{ visibility: "off" }],
};

const LOAD_TIMEOUT_MS = 15000;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export function GoogleMapView() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapStyle = useAppStore((s) => s.mapStyle);
  const mapTypeId = useAppStore((s) => s.mapTypeId);
  const language = useAppStore((s) => s.language);
  const showRoads = useAppStore((s) => s.showRoads);
  const showPlaceLabels = useAppStore((s) => s.showPlaceLabels);
  const showMountainLabels = useAppStore((s) => s.showMountainLabels);
  const showWaterLabels = useAppStore((s) => s.showWaterLabels);
  const [failure, setFailure] = useState<null | "auth" | "timeout">(null);
  const [attempt, setAttempt] = useState(0);

  const handleTimeout = useCallback(() => setFailure("timeout"), []);
  const handleRetry = useCallback(() => {
    setFailure(null);
    setAttempt((a) => a + 1);
  }, []);

  const styles = useMemo(
    () => [
      ...MAP_STYLES[mapStyle],
      ...(showRoads ? [] : [HIDE_ROADS_STYLE]),
      ...(showPlaceLabels ? [] : [HIDE_PLACE_LABELS_STYLE]),
      ...(showMountainLabels ? [] : [HIDE_MOUNTAIN_LABELS_STYLE]),
      ...(showWaterLabels ? [] : [HIDE_WATER_LABELS_STYLE]),
    ],
    [mapStyle, showRoads, showPlaceLabels, showMountainLabels, showWaterLabels],
  );

  useEffect(() => {
    window.gm_authFailure = () => setFailure("auth");
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_KEY" || failure === "auth") {
    return <MapLoadFallback />;
  }

  if (failure === "timeout") {
    return <MapLoadFallback onRetry={handleRetry} />;
  }

  return (
    <APIProvider key={attempt} apiKey={apiKey} language={GOOGLE_MAPS_LANGUAGE[language]}>
      <Map
        defaultBounds={{ ...SLOVAKIA_BOUNDS, padding: MAP_BOUNDS_PADDING }}
        minZoom={GOOGLE_MIN_ZOOM}
        maxZoom={GOOGLE_MAX_ZOOM}
        isFractionalZoomEnabled
        mapTypeId={mapTypeId}
        styles={styles}
        disableDefaultUI
        gestureHandling="greedy"
        className="h-full w-full"
      >
        <TileLoadWatcher onFail={handleTimeout} />
        <MarkerLayer />
        <ZoomControl />
        <FilterControl />
      </Map>
    </APIProvider>
  );
}

function TileLoadWatcher({ onFail }: { onFail: () => void }) {
  const map = useMap();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("tilesloaded", () => setLoaded(true));
    return () => listener.remove();
  }, [map]);

  useEffect(() => {
    if (loaded || !map) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
    };
    const arm = () => {
      disarm();
      if (document.visibilityState === "visible") {
        timeout = setTimeout(onFail, LOAD_TIMEOUT_MS);
      }
    };

    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      disarm();
      document.removeEventListener("visibilitychange", arm);
    };
  }, [loaded, map, onFail]);

  return null;
}
