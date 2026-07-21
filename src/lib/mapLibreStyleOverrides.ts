import type maplibregl from "maplibre-gl";
import type { MapStyleId } from "../store/useAppStore";

// TomTom's basic_main style ships 300+ granular layers (every road class
// repeated per z-order "level" band, tunnels, outlines, arrows, "under
// construction" variants, etc. — confirmed by fetching the live style and
// counting layer ids). Google's styles.json can lean on `featureType`
// wildcards ("road.highway", "poi.park", ...) to recolor a whole category in
// one rule; MapLibre/TomTom has no such wildcarding, and hand-listing 300+
// ids would be unmaintainable and would silently go stale the moment TomTom
// adds or renames a layer. Instead this classifies whatever layers are
// actually present on the loaded map by keywords in their id/source-layer,
// bucketing them into the same semantic categories src/mapStyles/*.json use
// for Google (water, park, terrain, building, road tiers, admin boundary,
// labels), and recolors each bucket with setPaintProperty. Re-run any time
// the style (re)loads — these are live paint overrides, not a persisted
// style document, so they don't survive a fresh style fetch. The same
// classifier also backs applyMapLibreLayerVisibility below, which drives the
// road/place/mountain/water label toggles in MapLayerSettings — the
// MapLibre equivalent of GoogleMapView's HIDE_*_STYLE stylers.

interface StylePalette {
  background: string;
  water: string;
  park: string;
  parkOutline: string;
  terrain: string;
  terrainAlt: string;
  building: string;
  buildingOutline: string;
  roadLocalFill: string;
  roadLocalCasing: string;
  roadHighwayFill: string;
  roadHighwayCasing: string;
  roadHighwayLabel: string;
  adminBoundary: string;
  labelText: string;
  labelHalo: string;
}

// Same palette as src/mapStyles/playful.json (kept byte-for-byte in sync so
// Google and TomTom read as the same "skin"), translated to MapLibre's
// fill-color/line-color model — leans lilac/rosa on top of the bubblegum-pink
// highways: periwinkle water, pink-tinted terrain, lilac buildings, and a
// purple admin-boundary/label-ink tone (the same #9b6fd1 used for the
// historical-building category elsewhere in the app) for a storybook/
// fairytale feel that reads well to kids, per the explicit "more for family
// kids, like fairytale" brief and the follow-up "more lila/rosa" request.
const PLAYFUL: StylePalette = {
  background: "#f8f5fb",
  water: "#7b86e0",
  park: "#2fae66",
  parkOutline: "#1f6d4c",
  terrain: "#f5e9f2",
  terrainAlt: "#e9d3ea",
  building: "#e9d6f5",
  buildingOutline: "#c9a0e0",
  roadLocalFill: "#ffffff",
  roadLocalCasing: "#f0d9f0",
  roadHighwayFill: "#ec5fa3",
  roadHighwayCasing: "#a34a9c",
  roadHighwayLabel: "#ffffff",
  adminBoundary: "#9b6fd1",
  labelText: "#4a3a5c",
  labelHalo: "#f8f5fb",
};

// Same palette as src/mapStyles/nature.json — teal water, forest-green
// highways with light label text (mirrors Google's highway
// labels.text.fill override), earthy buildings.
const NATURE: StylePalette = {
  background: "#f6f8f4",
  water: "#6bb3c9",
  park: "#4fae72",
  parkOutline: "#1f6d4c",
  terrain: "#d9f0e1",
  terrainAlt: "#9fdcb0",
  building: "#e3ead9",
  buildingOutline: "#b9c9a9",
  roadLocalFill: "#ffffff",
  roadLocalCasing: "#c9e7d5",
  roadHighwayFill: "#1f6d4c",
  roadHighwayCasing: "#144a34",
  roadHighwayLabel: "#f6f8f4",
  adminBoundary: "#3c544a",
  labelText: "#0e1f17",
  labelHalo: "#f6f8f4",
};

const PALETTES: Record<MapStyleId, StylePalette> = { playful: PLAYFUL, nature: NATURE };

type Category =
  | "background"
  | "water"
  | "park"
  | "terrain"
  | "building"
  | "roadHighway"
  | "roadLocal"
  | "adminBoundary"
  | "label"
  | "poiIcon"
  | "skip";

// Order matters — most specific checks first. "major local road" contains
// the substring "local road" so it's caught by the roadLocal check before
// the roadHighway check ever sees it; a bare "major road" (or "motorway" /
// "international road") isn't caught by that local-road substring, so it
// falls through to roadHighway.
function classify(id: string, sourceLayer: string, layerType: string): Category {
  const hay = `${id} ${sourceLayer}`.toLowerCase();

  if (layerType === "background") return "background";

  if (layerType === "symbol") {
    // TomTom doesn't consistently separate "name" layers from POI-icon
    // layers by id alone, but road/place/shield-ish ids reliably carry a
    // text label worth recoloring; anything else is treated as a POI icon
    // and hidden, mirroring Google's `labels.icon` visibility:"off" styler
    // (keeps the map free of TomTom's default POI pin clutter, same as the
    // Google implementation).
    return /name|label|place|shield/.test(hay) ? "label" : "poiIcon";
  }

  if (/water|lake|ocean|river|beach|dune/.test(hay)) return "water";
  if (/park|forest|golf|cemetery|zoo|greens?|garden|amusement/.test(hay)) return "park";
  if (/building|administration office|cultural facility|hospital|hotel|institution|factory/.test(hay)) {
    return "building";
  }
  if (/motorway|international road/.test(hay) || (/major road/.test(hay) && !/local/.test(hay))) {
    return "roadHighway";
  }
  if (/road/.test(hay)) return "roadLocal";
  if (/boundary|administrative/.test(hay)) return "adminBoundary";
  if (
    /earth cover|built-up|industrial|airport|runway|military|school ground|paved area|town grass|parking area|railway|subway|shopping|university/.test(
      hay,
    )
  ) {
    return "terrain";
  }

  return "skip";
}

export function applyMapLibreStyleOverrides(map: maplibregl.Map, styleId: MapStyleId): void {
  const palette = PALETTES[styleId];
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const layerType = layer.type;
    const sourceLayer = "source-layer" in layer ? ((layer["source-layer"] as string | undefined) ?? "") : "";
    const idLower = layer.id.toLowerCase();
    // "outline"/"casing" layers are the wider stroke drawn under the main
    // fill (roads, buildings) — matches Google's geometry.stroke stylers.
    const isCasing = /outline|casing/.test(idLower);
    const category = classify(layer.id, sourceLayer, layerType);

    try {
      switch (category) {
        case "background":
          map.setPaintProperty(layer.id, "background-color", palette.background);
          break;
        case "water":
          if (layerType === "fill") map.setPaintProperty(layer.id, "fill-color", palette.water);
          else if (layerType === "line") map.setPaintProperty(layer.id, "line-color", palette.water);
          break;
        case "park":
          if (layerType === "fill") map.setPaintProperty(layer.id, "fill-color", palette.park);
          else if (layerType === "line") map.setPaintProperty(layer.id, "line-color", palette.parkOutline);
          break;
        case "terrain":
          if (layerType === "fill") {
            map.setPaintProperty(
              layer.id,
              "fill-color",
              idLower.includes("earth cover") ? palette.terrainAlt : palette.terrain,
            );
          }
          break;
        case "building":
          if (layerType === "fill") {
            map.setPaintProperty(layer.id, "fill-color", isCasing ? palette.buildingOutline : palette.building);
          }
          break;
        case "roadHighway":
          if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", isCasing ? palette.roadHighwayCasing : palette.roadHighwayFill);
          }
          break;
        case "roadLocal":
          if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", isCasing ? palette.roadLocalCasing : palette.roadLocalFill);
          }
          break;
        case "adminBoundary":
          if (layerType === "line") map.setPaintProperty(layer.id, "line-color", palette.adminBoundary);
          break;
        case "label":
          map.setPaintProperty(
            layer.id,
            "text-color",
            /motorway|highway/.test(idLower) ? palette.roadHighwayLabel : palette.labelText,
          );
          map.setPaintProperty(layer.id, "text-halo-color", palette.labelHalo);
          break;
        case "poiIcon":
          map.setPaintProperty(layer.id, "icon-opacity", 0);
          break;
        case "skip":
        default:
          break;
      }
    } catch {
      // A handful of layers won't accept a given paint property (e.g. an
      // icon-only symbol layer has no text-field, so text-color is a no-op
      // MapLibre may reject) — skip that one layer rather than aborting the
      // whole pass over everything else.
    }
  }
}

export interface MapLibreLayerVisibility {
  showRoads: boolean;
  showPlaceLabels: boolean;
  showMountainLabels: boolean;
  showWaterLabels: boolean;
}

// Which of the four toggles a "label" layer belongs to — reuses the same
// keyword-classification approach as the recolor pass above, since TomTom's
// label layer ids aren't fully enumerable ahead of time either. Anything
// that doesn't match a more specific bucket defaults to "place" (city/town/
// country names etc.), same as Google's plain `administrative.locality`
// toggle covers the general case.
function classifyLabelToggle(idLower: string): keyof MapLibreLayerVisibility {
  if (/road|route|shield|highway/.test(idLower)) return "showRoads";
  if (/water|lake|river|ocean|sea/.test(idLower)) return "showWaterLabels";
  if (/mountain|peak|summit|elevation/.test(idLower)) return "showMountainLabels";
  return "showPlaceLabels";
}

// Mirrors GoogleMapView's HIDE_ROADS_STYLE / HIDE_*_LABELS_STYLE stylers,
// using MapLibre's visibility layout property instead of a Google styler
// rule. Reads the *current* map.getStyle().layers each call (not a cached
// list), same reasoning as applyMapLibreStyleOverrides — this needs to work
// against whatever TomTom actually shipped, not a static snapshot.
export function applyMapLibreLayerVisibility(map: maplibregl.Map, visibility: MapLibreLayerVisibility): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const layerType = layer.type;
    const sourceLayer = "source-layer" in layer ? ((layer["source-layer"] as string | undefined) ?? "") : "";
    const idLower = layer.id.toLowerCase();
    const category = classify(layer.id, sourceLayer, layerType);

    let visible: boolean | null = null;
    if (category === "roadHighway" || category === "roadLocal") {
      visible = visibility.showRoads;
    } else if (category === "label") {
      visible = visibility[classifyLabelToggle(idLower)];
    }

    if (visible === null) continue;

    try {
      map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
    } catch {
      // Same reasoning as applyMapLibreStyleOverrides — skip layers that
      // don't accept a "visibility" layout change rather than aborting.
    }
  }
}
