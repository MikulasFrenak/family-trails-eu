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

// This used to drive clustering through MapLibre's own GeoJSON `cluster:
// true` source (tiled, queried via querySourceFeatures()). Switched to a
// directly-managed `supercluster` instance instead — same library
// @googlemaps/markerclusterer uses under the hood for MarkerLayer.tsx's
// Google view — after a reported mismatch ("Google shows a 5-cluster near
// Bratislava, TomTom shows 6 for what looks like the same view"). Root
// cause: MapLibre's native clustering is tile-based, so it always resolves
// the current (possibly fractional) zoom via Math.floor before picking
// which pre-clustered zoom tier to show (confirmed in maplibre-gl's own
// bundled source); @googlemaps/markerclusterer's SuperClusterAlgorithm
// instead does `zoom = Math.round(map.getZoom())` (confirmed in its
// source). Floor vs. round at a fractional zoom like 7.6 lands on two
// different integer tiers (7 vs. 8) of the *same* underlying supercluster
// index, which is exactly the kind of one-cluster-membership difference
// reported. Running our own supercluster instance here — with the same
// Math.round — reproduces Google's clustering algorithm exactly, radius,
// maxZoom and all, instead of two different clustering engines that happen
// to be configured similarly.
const CATEGORIES = categoriesData as unknown as Category[];
const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.color]),
);
const CATEGORY_ORDER: string[] = CATEGORIES.map((category) => category.id);

// Deliberately no index signature here (a broad `[key: string]: unknown`
// would make the `"cluster" in props` discriminant below ambiguous for
// TypeScript, since a PointProps with an index signature could technically
// also claim to have a "cluster" key). Kept minimal and exact instead.
interface PointProps {
  id: string;
  category: string;
}

// Per-category running counts, aggregated by supercluster's map/reduce
// options — the direct-JS equivalent of the `clusterProperties` expressions
// the old GeoJSON-source version used, and of categoryByMarker in
// MarkerLayer.tsx (Google): however each side gets there, every cluster ends
// up knowing how many of each category it contains, for the pie icon. Plain
// Record<string, number> (not a template-literal-keyed type) so it stays
// unambiguously assignable to supercluster's generic C constraint.
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
  // Quoted url() — see buildPoiMarkerElement below for why this matters.
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
  // CATEGORY_ICONS values are URL-encoded SVG data URIs containing raw
  // single quotes (from the SVGs' own xmlns='...' attributes) — an
  // *unquoted* CSS url() token can't contain those, and the browser
  // silently drops the whole declaration rather than erroring. Wrapping
  // in double quotes (which the data URIs never contain) fixes it. This
  // was the actual cause of "clusters render, individual pins don't" —
  // clusterPieIcon.ts's output happens to be base64, so it never hit this.
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

  // Refs so the render-loop callback (registered once) always sees the
  // latest selectPoi without re-registering on every store change.
  const selectPoiRef = useRef(selectPoi);
  selectPoiRef.current = selectPoi;

  // Rebuilt whenever the filtered POI set changes (see the second effect
  // below); read from the map-event-driven render loop via this ref so that
  // loop doesn't need to be torn down and re-registered on every filter
  // click — same reasoning the old querySourceFeatures version had for
  // keeping this effect's deps to [map] only.
  const indexRef = useRef<Supercluster<PointProps, ClusterProps> | null>(null);
  const updateMarkersRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Long-lived element cache (never cleared except on unmount) plus the
    // subset currently attached to the map — mirrors MapLibre's own
    // reference implementation for HTML cluster markers.
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
      // Math.round, not Math.floor — this is the one line that actually
      // fixes the cross-provider mismatch (see the file-level comment).
      // supercluster's own getClusters floors whatever zoom you pass it
      // internally, so rounding first is what gets it to Google's tier
      // instead of MapLibre's native tile-floor tier.
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
                // Cluster id no longer valid (index was rebuilt since this
                // marker was created, e.g. a filter change) — ignore.
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
    // "move" covers pan + zoom + programmatic easeTo/flyTo — the same set
    // of camera changes the old "render" listener reacted to, but without
    // firing on every single animation frame regardless of whether the
    // camera actually moved.
    map.on("move", updateMarkers);
    updateMarkers();

    return () => {
      // Under rapid provider switching, the parent's underlying
      // maplibregl.Map can already be torn down (instance.remove()
      // called) by the time this child cleanup runs — every map-touching
      // call here can throw in that case ("Cannot read properties of
      // undefined"), so guard the whole block rather than crash the
      // switch. The marker-pool cleanup below doesn't touch `map` directly
      // and stays outside the guard.
      try {
        map.off("move", updateMarkers);
      } catch {
        // Map already removed by the parent — nothing left to clean up.
      }
      for (const marker of markerCache.values()) marker.remove();
      markerCache.clear();
      markersOnScreen.clear();
    };
    // Only re-run this whole setup if the map instance itself changes — POI
    // filtering is handled by the effect below (rebuilding indexRef and
    // calling updateMarkersRef.current()), not by tearing this down (that
    // would flash/rebuild every marker on every filter click).
  }, [map]);

  // Category filter changed (or on first mount): rebuild the supercluster
  // index and immediately re-render from it. A fresh Supercluster instance
  // per change mirrors @googlemaps/markerclusterer's own behavior (it
  // rebuilds its index whenever the marker set differs, see its `calculate`
  // method) — supercluster's index is immutable once loaded, there's no
  // incremental update API.
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
