import { useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { ALL_POIS } from "../data/pois";
import categoriesData from "../../data/categories.json";
import type { Category } from "../types/poi";
import { buildClusterPieIcon } from "../lib/clusterPieIcon";
import { CATEGORY_ICONS } from "../lib/categoryIcons";

const CATEGORIES = categoriesData as unknown as Category[];
const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.color]),
);
const CATEGORY_ORDER: string[] = CATEGORIES.map((category) => category.id);

export function MarkerLayer() {
  const map = useMap();
  const activeCategories = useAppStore((s) => s.activeCategories);
  const selectPoi = useAppStore((s) => s.selectPoi);
  const language = useAppStore((s) => s.language);

  const visiblePois = useMemo(
    () =>
      activeCategories.length === 0
        ? ALL_POIS
        : ALL_POIS.filter((poi) => activeCategories.includes(poi.category)),
    [activeCategories],
  );

  useEffect(() => {
    if (!map) return;

    const categoryByMarker = new Map<google.maps.Marker, string>();

    const markers = visiblePois.map((poi) => {
      const marker = new google.maps.Marker({
        position: poi.coordinates,
        icon: {
          url: CATEGORY_ICONS[poi.category],
          scaledSize: new google.maps.Size(32, 42),
          anchor: new google.maps.Point(16, 41),
        },
        title: poi.name[language] ?? poi.name.en,
      });
      marker.addListener("click", () => selectPoi(poi.id));
      categoryByMarker.set(marker, poi.category);
      return marker;
    });

    // Cluster icon = a pie chart of the categories grouped inside it, so you
    // can tell what's in a cluster before zooming/clicking into it.
    const pieRenderer: Renderer = {
      render: (cluster) => {
        const counts = new Map<string, number>();
        for (const marker of cluster.markers ?? []) {
          const category = categoryByMarker.get(marker as google.maps.Marker);
          if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
        }
        const segments = CATEGORY_ORDER.filter((id) => counts.has(id)).map((id) => ({
          color: CATEGORY_COLORS[id],
          count: counts.get(id) ?? 0,
        }));

        const size = Math.round(Math.min(56, 34 + cluster.count * 1.5));
        return new google.maps.Marker({
          position: cluster.position,
          icon: {
            url: buildClusterPieIcon(segments, size),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
          },
          label: {
            text: String(cluster.count),
            color: "#144a34",
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: "600",
            fontSize: `${Math.max(11, Math.round(size * 0.32))}px`,
          },
          zIndex: Number(google.maps.Marker.MAX_ZINDEX) + cluster.count,
        });
      },
    };

    const clusterer = new MarkerClusterer({ map, markers, renderer: pieRenderer });

    return () => {
      clusterer.clearMarkers();
      clusterer.setMap(null);
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [map, visiblePois, language, selectPoi]);

  return null;
}
