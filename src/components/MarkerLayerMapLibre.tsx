import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { ALL_POIS } from "../data/pois";
import categoriesData from "../../data/categories.json";
import type { Category, Poi } from "../types/poi";
import { buildClusterPieIcon, type PieSegment } from "../lib/clusterPieIcon";
import { CATEGORY_ICONS } from "../lib/categoryIcons";

// NOTE: this file follows MapLibre's own "Display HTML clusters with custom
// properties" pattern (clustered GeoJSON source + querySourceFeatures() +
// manually-synced maplibregl.Marker pool), adapted to render individual POIs
// as HTML markers too (not just clusters), reusing buildClusterPieIcon from
// the Google implementation. This is the one file in the MapLibre branch
// that couldn't be compiled/run from the sandbox this was written in (npm
// registry is blocked there) — verify with `npm run build` + a manual zoom/
// pan/filter pass locally before relying on it.

const CATEGORIES = categoriesData as unknown as Category[];
const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.color]),
);
const CATEGORY_ORDER: string[] = CATEGORIES.map((category) => category.id);
const SOURCE_ID = "family-trails-pois";
const LOAD_TRIGGER_LAYER_ID = `${SOURCE_ID}-load-trigger`;

// Local, minimal GeoJSON shape — deliberately not importing the ambient
// `GeoJSON.*` namespace from @types/geojson: this repo's tsconfig `types`
// array only allowlists vite/client, google.maps, and node, so that global
// namespace isn't visible here. Structural typing still lets this satisfy
// maplibre-gl's own (internally-referenced) GeoJSON types at the call site.
interface PoiFeature {
  type: "Feature";
  properties: { id: string; category: string };
  geometry: { type: "Point"; coordinates: [number, number] };
}

interface PoiFeatureCollection {
  type: "FeatureCollection";
  features: PoiFeature[];
}

function toFeatureCollection(pois: Poi[]): PoiFeatureCollection {
  return {
    type: "FeatureCollection",
    features: pois.map((poi) => ({
      type: "Feature",
      properties: { id: poi.id, category: poi.category },
      geometry: { type: "Point", coordinates: [poi.coordinates.lng, poi.coordinates.lat] },
    })),
  };
}

function buildClusterMarkerElement(segments: PieSegment[], size: number, count: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundImage = `url(${buildClusterPieIcon(segments, size)})`;
  el.style.backgroundSize = "contain";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontFamily = "'Baloo 2', sans-serif";
  el.style.fontWeight = "600";
  el.style.color = "#144a34";
  el.style.fontSize = `${Math.max(11, Math.round(size * 0.32))}px`;
  el.textContent = String(count);
  return el;
}

function buildPoiMarkerElement(category: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "32px";
  el.style.height = "42px";
  el.style.backgroundImage = `url(${CATEGORY_ICONS[category]})`;
  el.style.backgroundSize = "contain";
  el.style.backgroundRepeat = "no-repeat";
  return el;
}

export function MarkerLayerMapLibre({ map }: { map: maplibregl.Map }) {
  const activeCategories = useAppStore((s) => s.activeCategories);
  const selectPoi = useAppStore((s) => s.selectPoi);

  const visiblePois = useMemo(
    () =>
      activeCategories.length === 0
        ? ALL_POIS
        : ALL_POIS.filter((poi) => activeCategories.includes(poi.category)),
    [activeCategories],
  );

  // Refs so the render-loop callback (registered once) always sees the
  // latest selectPoi without re-registering on every store change.
  const selectPoiRef = useRef(selectPoi);
  selectPoiRef.current = selectPoi;

  useEffect(() => {
    const clusterProperties: Record<string, unknown> = {};
    for (const id of CATEGORY_ORDER) {
      clusterProperties[`cat_${id}`] = ["+", ["case", ["==", ["get", "category"], id], 1, 0]];
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: toFeatureCollection(visiblePois) as never,
      cluster: true,
      clusterRadius: 50,
      clusterProperties: clusterProperties as never,
    });
    // MapLibre only tiles/clusters a GeoJSON source once a layer references
    // it — this layer exists purely to trigger that. Zero size/opacity: all
    // real rendering happens via the HTML markers below.
    map.addLayer({
      id: LOAD_TRIGGER_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: { "circle-opacity": 0, "circle-radius": 0 },
    });

    // Long-lived element cache (never cleared except on unmount) plus the
    // subset currently attached to the map — mirrors MapLibre's own
    // reference implementation for HTML cluster markers.
    const markerCache = new Map<string, maplibregl.Marker>();
    let markersOnScreen = new Map<string, maplibregl.Marker>();

    const updateMarkers = () => {
      if (!map.isSourceLoaded(SOURCE_ID)) return;
      const features = map.querySourceFeatures(SOURCE_ID);
      const newOnScreen = new Map<string, maplibregl.Marker>();

      for (const feature of features) {
        if (feature.geometry.type !== "Point") continue;
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const props = (feature.properties ?? {}) as Record<string, unknown>;

        if (props.cluster) {
          const clusterId = props.cluster_id as number;
          const key = `cluster-${clusterId}`;
          let marker = markerCache.get(key);
          if (!marker) {
            const count = props.point_count as number;
            const segments = CATEGORY_ORDER.filter((id) => Number(props[`cat_${id}`] ?? 0) > 0).map(
              (id) => ({ color: CATEGORY_COLORS[id], count: Number(props[`cat_${id}`] ?? 0) }),
            );
            const size = Math.round(Math.min(56, 34 + count * 1.5));
            const el = buildClusterMarkerElement(segments, size, count);
            el.addEventListener("click", () => {
              const source = map.getSource(SOURCE_ID);
              if (!source || !("getClusterExpansionZoom" in source)) return;
              (source as maplibregl.GeoJSONSource)
                .getClusterExpansionZoom(clusterId)
                .then((zoom) => map.easeTo({ center: [lng, lat], zoom }))
                .catch(() => {});
            });
            marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
            markerCache.set(key, marker);
          }
          newOnScreen.set(key, marker);
          if (!markersOnScreen.has(key)) marker.addTo(map);
        } else {
          const id = props.id as string;
          const key = `poi-${id}`;
          let marker = markerCache.get(key);
          if (!marker) {
            const el = buildPoiMarkerElement(props.category as string);
            el.addEventListener("click", () => selectPoiRef.current(id));
            marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]);
            markerCache.set(key, marker);
          }
          newOnScreen.set(key, marker);
          if (!markersOnScreen.has(key)) marker.addTo(map);
        }
      }

      for (const [key, marker] of markersOnScreen) {
        if (!newOnScreen.has(key)) marker.remove();
      }
      markersOnScreen = newOnScreen;
    };

    map.on("render", updateMarkers);

    return () => {
      map.off("render", updateMarkers);
      for (const marker of markerCache.values()) marker.remove();
      markerCache.clear();
      markersOnScreen.clear();
      if (map.getLayer(LOAD_TRIGGER_LAYER_ID)) map.removeLayer(LOAD_TRIGGER_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
    // Only re-run this whole setup if the map instance itself changes — POI
    // filtering is handled by the effect below via setData, not by tearing
    // this down (that would flash/rebuild every marker on every filter click).
    // visiblePois/selectPoi are intentionally excluded from these deps.
  }, [map]);

  // Category filter changed: update the existing source's data in place.
  useEffect(() => {
    const source = map.getSource(SOURCE_ID);
    if (source && "setData" in source) {
      (source as maplibregl.GeoJSONSource).setData(toFeatureCollection(visiblePois) as never);
    }
  }, [map, visiblePois]);

  return null;
}
