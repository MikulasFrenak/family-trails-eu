import maplibregl from "maplibre-gl";
import Supercluster from "supercluster";
import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { ALL_POIS } from "../data/pois";
import categoriesData from "../../data/categories.json";
import type { Category } from "../types/poi";
import { buildClusterPieIcon, type PieSegment } from "../lib/clusterPieIcon";
import { CATEGORY_ICONS } from "../lib/categoryIcons";
import { MARKER_CLUSTER_MAX_ZOOM, MARKER_CLUSTER_RADIUS } from "../lib/mapConstants";

const CATEGORIES = categoriesData as unknown as Category[];
const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.color]),
);
const CATEGORY_ORDER: string[] = CATEGORIES.map((category) => category.id);

interface PointProps {
  id: string;
  category: string;
}

type ClusterProps = Record<string, number>;

function buildCategoryCounts(category: string): ClusterProps {
  const counts = {} as ClusterProps;
  for (const id of CATEGORY_ORDER) counts[`cat_${id}`] = category === id ? 1 : 0;
  return counts;
}

function buildClusterMarkerElement(segments: PieSegment[], size: number, count: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundImage = `url("${buildClusterPieIcon(segments, size)}")`;
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
  el.style.backgroundImage = `url("${CATEGORY_ICONS[category]}")`;
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

  const selectPoiRef = useRef(selectPoi);
  selectPoiRef.current = selectPoi;

  const indexRef = useRef<Supercluster<PointProps, ClusterProps> | null>(null);
  const updateMarkersRef = useRef<() => void>(() => {});

  useEffect(() => {
    const markerCache = new Map<string, maplibregl.Marker>();
    let markersOnScreen = new Map<string, maplibregl.Marker>();

    const updateMarkers = () => {
      const index = indexRef.current;
      if (!index) return;

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const zoom = Math.round(map.getZoom());
      const features = index.getClusters(bbox, zoom);
      const newOnScreen = new Map<string, maplibregl.Marker>();

      for (const feature of features) {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;

        if ("cluster" in props && props.cluster) {
          const clusterId = props.cluster_id;
          const key = `cluster-${clusterId}`;
          let marker = markerCache.get(key);
          if (!marker) {
            const count = props.point_count;
            const segments = CATEGORY_ORDER.filter((id) => Number(props[`cat_${id}`] ?? 0) > 0).map((id) => ({
              color: CATEGORY_COLORS[id],
              count: Number(props[`cat_${id}`] ?? 0),
            }));
            const size = Math.round(Math.min(56, 34 + count * 1.5));
            const el = buildClusterMarkerElement(segments, size, count);
            el.addEventListener("click", () => {
              try {
                const expansionZoom = index.getClusterExpansionZoom(clusterId);
                map.easeTo({ center: [lng, lat], zoom: expansionZoom });
              } catch {
              }
            });
            marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
            markerCache.set(key, marker);
          }
          newOnScreen.set(key, marker);
          if (!markersOnScreen.has(key)) marker.addTo(map);
        } else {
          const id = (props as PointProps).id;
          const key = `poi-${id}`;
          let marker = markerCache.get(key);
          if (!marker) {
            const el = buildPoiMarkerElement((props as PointProps).category);
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

    updateMarkersRef.current = updateMarkers;
    map.on("move", updateMarkers);
    updateMarkers();

    return () => {
      try {
        map.off("move", updateMarkers);
      } catch {
      }
      for (const marker of markerCache.values()) marker.remove();
      markerCache.clear();
      markersOnScreen.clear();
    };
  }, [map]);

  useEffect(() => {
    const index = new Supercluster<PointProps, ClusterProps>({
      radius: MARKER_CLUSTER_RADIUS,
      maxZoom: MARKER_CLUSTER_MAX_ZOOM,
      map: (props) => buildCategoryCounts(props.category),
      reduce: (accumulated, props) => {
        for (const id of CATEGORY_ORDER) {
          const key = `cat_${id}` as const;
          accumulated[key] = (accumulated[key] ?? 0) + (props[key] ?? 0);
        }
      },
    });
    index.load(
      visiblePois.map((poi) => ({
        type: "Feature",
        properties: { id: poi.id, category: poi.category },
        geometry: { type: "Point", coordinates: [poi.coordinates.lng, poi.coordinates.lat] },
      })),
    );
    indexRef.current = index;
    updateMarkersRef.current();
  }, [visiblePois]);

  return null;
}
