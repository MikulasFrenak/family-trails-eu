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

// Same base palette as src/mapStyles/playful.json for everything except
// roads (periwinkle water, pink-tinted terrain, lilac buildings, purple
// admin-boundary/label-ink using the same #9b6fd1 as the historical-building
// category). Roads intentionally diverge from Google here: TomTom's road
// casing at #f0d9f0 read as too pale/washed-out against the #f8f5fb
// background (no built-in shadow/contrast the way Google's default renderer
// gives roads for free), so TomTom's road network reads "white + lila"
// literally — a plain white fill outlined in a clearly-saturated violet
// casing, brighter/bolder on highways than local roads — rather than
// Google's pink highway fill. Per feedback: "Tomtom playfull looks somehow
// bad... should more align white + lila on lines/roads".
const PLAYFUL: StylePalette = {
  background: "#f8f5fb",
  water: "#7b86e0",
  park: "#2fae66",
  parkOutline: "#1f6d4c",
  // "Earth Cover" fills the *entire* landmass (it's TomTom's base landcover
  // classification, not a sparse feature) — at full saturation this reads
  // as a solid purple wash covering the whole map, very different from
  // Google's much lighter paper-white base with terrain as subtle shading.
  // Kept barely-tinted here instead, close to `background`, so lilac shows
  // up as an accent (buildings, roads, boundaries) rather than as the
  // dominant color of the entire viewport. terrain and terrainAlt used to
  // differ slightly — at high zoom TomTom's landcover is actually dozens of
  // small adjacent polygons (fields, built-up patches, natural cover), each
  // its own fill layer, and any two-tone split between them shows up as a
  // visible patchwork/seam between neighboring polygons. Same color for
  // both eliminates that; see applyMapLibreStyleOverrides' explicit
  // fill-opacity:1 for the other half of the fix (pre-existing per-layer
  // opacity differences were doing the same thing to a single color).
  terrain: "#faf6fc",
  terrainAlt: "#faf6fc",
  building: "#e9d6f5",
  buildingOutline: "#c9a0e0",
  roadLocalFill: "#ffffff",
  roadLocalCasing: "#c9a0e0",
  roadHighwayFill: "#ffffff",
  roadHighwayCasing: "#8b4fc4",
  roadHighwayLabel: "#8b4fc4",
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
  // Same color for both — see the PLAYFUL palette's comment above for why
  // (a terrain/terrainAlt split shows up as a visible seam between
  // TomTom's many small adjacent landcover polygons at high zoom).
  terrain: "#d9f0e1",
  terrainAlt: "#d9f0e1",
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
  // Large protected-area designations (national/state/regional parks,
  // national forests — can cover a huge fraction of the viewport, e.g. the
  // entire Tatra range) are a completely different scale from an actual
  // small park/playground polygon. Filling them solid green blots out
  // every road, label and marker underneath — confirmed by screenshot,
  // Google's own poi.park styler doesn't touch these either (no fill, no
  // distinct outline; the "park" only shows through its text label). Route
  // them to "terrain" instead so they blend into the plain background like
  // everywhere else, and drop their outline layer entirely rather than
  // giving it the admin-boundary purple, matching Google's "essentially
  // invisible except for the label" treatment.
  if (/national park|national or state park|state or province park|regional park|county park|national forest/.test(hay)) {
    return layerType === "line" ? "skip" : "terrain";
  }
  if (/park|forest|golf|cemetery|zoo|greens?|garden|amusement/.test(hay)) return "park";
  if (/building|administration office|cultural facility|hospital|hotel|institution|factory/.test(hay)) {
    return "building";
  }
  if (/motorway|international road/.test(hay) || (/major road/.test(hay) && !/local/.test(hay))) {
    return "roadHighway";
  }
  if (/road/.test(hay)) return "roadLocal";
  // Broader than just "boundary"/"administrative" — country/state/province/
  // county/district border layers don't reliably use either word in their
  // id (unverified against TomTom's exact naming, since the raw style fetch
  // used to inspect ids got cut off before reaching the boundary/label
  // section of the layers array — this list is a best-effort guess at
  // common vector-tile boundary naming, not a confirmed match).
  if (/boundary|administrative|admin[_ -]|country line|state line|province line|county line|district line/.test(hay)) {
    return "adminBoundary";
  }
  if (
    /earth cover|built-up|industrial|airport|runway|military|school ground|paved area|town grass|parking area|railway|subway|shopping|university/.test(
      hay,
    )
  ) {
    return "terrain";
  }

  // Catch-all by layer type, not by keyword. Live testing surfaced the
  // reason the keyword-only version above wasn't enough: recoloring "Earth
  // Cover" turned formerly-invisible gaps in TomTom's landcover coverage
  // (areas with no earth-cover polygon, previously blending into the
  // near-white default) into glaring white holes, and admin-boundary lines
  // whose ids don't contain "boundary"/"administrative" stayed at TomTom's
  // default gray. Rather than keep guessing at more keywords one report at
  // a time, any remaining "fill" layer gets the terrain tint (so no land
  // area is left unstyled) and any remaining "line" layer gets the
  // adminBoundary tint (so no border/line is left at TomTom's default
  // gray) — better an unusual line rendering slightly lilac than another
  // round of "there's still a gap/gray line here".
  if (layerType === "fill") return "terrain";
  if (layerType === "line") return "adminBoundary";

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
          if (layerType === "fill") {
            map.setPaintProperty(layer.id, "fill-color", palette.water);
            map.setPaintProperty(layer.id, "fill-opacity", 1);
          } else if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", palette.water);
          }
          break;
        case "park":
          if (layerType === "fill") {
            map.setPaintProperty(layer.id, "fill-color", palette.park);
            map.setPaintProperty(layer.id, "fill-opacity", 1);
          } else if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", palette.parkOutline);
          }
          break;
        case "terrain":
          // Explicit fill-opacity:1 matters as much as the color here — the
          // "patchwork" reported after the first color-only fix turned out
          // to be pre-existing per-layer opacity differences (TomTom's own
          // style renders some landcover sub-classes at less than full
          // opacity) letting the white base show through unevenly under an
          // otherwise-identical fill-color, which reads as a seam/gap.
          if (layerType === "fill") {
            map.setPaintProperty(
              layer.id,
              "fill-color",
              idLower.includes("earth cover") ? palette.terrainAlt : palette.terrain,
            );
            map.setPaintProperty(layer.id, "fill-opacity", 1);
          }
          break;
        case "building":
          if (layerType === "fill") {
            map.setPaintProperty(layer.id, "fill-color", isCasing ? palette.buildingOutline : palette.building);
            map.setPaintProperty(layer.id, "fill-opacity", 1);
          }
          break;
        case "roadHighway":
          if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", isCasing ? palette.roadHighwayCasing : palette.roadHighwayFill);
            map.setPaintProperty(layer.id, "line-opacity", 1);
          }
          break;
        case "roadLocal":
          if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", isCasing ? palette.roadLocalCasing : palette.roadLocalFill);
            map.setPaintProperty(layer.id, "line-opacity", 1);
          }
          break;
        case "adminBoundary":
          if (layerType === "line") {
            map.setPaintProperty(layer.id, "line-color", palette.adminBoundary);
            map.setPaintProperty(layer.id, "line-opacity", 1);
          }
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
