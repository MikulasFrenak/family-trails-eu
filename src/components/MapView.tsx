import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";
import { useAppStore, type Language, type MapStyleId } from "../store/useAppStore";
import { MarkerLayer } from "./MarkerLayer";
import { MapLoadFallback } from "./MapLoadFallback";
import { ZoomControl } from "./ZoomControl";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/mapConstants";
import playfulStyle from "../mapStyles/playful.json";
import natureStyle from "../mapStyles/nature.json";

const MAP_STYLES: Record<MapStyleId, google.maps.MapTypeStyle[]> = {
  playful: playfulStyle as google.maps.MapTypeStyle[],
  nature: natureStyle as google.maps.MapTypeStyle[],
};

// Google Maps JS API expects ISO language codes — our "cz" store value means
// "Czech language" but the actual ISO/Maps code for Czech is "cs".
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

// Leans toward Slovakia while still keeping most of Czechia in view at the default zoom.
const DEFAULT_CENTER = { lat: 48.9, lng: 18.8 };
const DEFAULT_ZOOM = 7;
const LOAD_TIMEOUT_MS = 6000;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export function MapView() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapStyle = useAppStore((s) => s.mapStyle);
  const mapTypeId = useAppStore((s) => s.mapTypeId);
  const language = useAppStore((s) => s.language);
  const showRoads = useAppStore((s) => s.showRoads);
  const showPlaceLabels = useAppStore((s) => s.showPlaceLabels);
  const showMountainLabels = useAppStore((s) => s.showMountainLabels);
  const showWaterLabels = useAppStore((s) => s.showWaterLabels);
  const [failed, setFailed] = useState(false);

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
    window.gm_authFailure = () => setFailed(true);
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_KEY" || failed) {
    return <MapLoadFallback />;
  }

  return (
    // Google Maps only reads `language` when its script first loads (the
    // LanguageSwitcher does a full page reload to actually change it).
    <APIProvider apiKey={apiKey} language={GOOGLE_MAPS_LANGUAGE[language]}>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        mapTypeId={mapTypeId}
        styles={styles}
        disableDefaultUI
        gestureHandling="greedy"
        className="h-full w-full"
      >
        <TileLoadWatcher onFail={() => setFailed(true)} />
        <MarkerLayer />
        <ZoomControl />
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
    if (loaded) return;
    const timeout = setTimeout(() => {
      if (!loaded) onFail();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [loaded, onFail]);

  return null;
}
