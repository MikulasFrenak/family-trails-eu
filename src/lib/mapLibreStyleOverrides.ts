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
// style document, so they don't survive a fresh style fetch.

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

// Same palette as src/mapStyles/playful.json, translated to MapLibre's
// fill-color/line-color model — bubblegum-pink highways, candy-pink road
// casings, and pastel-pink buildings for a storybook/fairytale feel that
// reads well to kids, per the explicit "more for family kids, like
// fairytale" brief.
const PLAYFUL: StylePalette = {
  background: "#f6f8f4",
  water: "#4c7de0",
  park: "#2fae66",
  parkOutline: "#1f6d4c",
  terrain: "#f3f0e6",
  terrainAlt: "#e8dcc0",
  building: "#ffe3ef",
  buildingOutline: "#f3a6c9",
  roadLocalFill: "#ffffff",
  roadLocalCasing: "#f3d9e6",
  roadHighwayFill: "#ec5fa3",
  roadHighwayCasing: "#b8407a",
  roadHighwayLabel: "#ffffff",
  adminBoundary: "#b8407a",
  labelText: "#3c544a",
  labelHalo: "#f6f8f4",
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
