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

// Google's admin boundary treatment (src/mapStyles/*.json): a single color
// per style, but two different weights/patterns depending on level —
// administrative.country gets an explicit `weight: 1.4` solid line, while
// plain `administrative` (everything below country: kraj/region, county,
// district) has no weight override and inherits Google's native rendering
// for those levels, which is always a fine dashed/dotted line regardless of
// style JSON. MapLibre has no such built-in per-level default, so both the
// width *and* the dash pattern have to be set explicitly here to match.
const ADMIN_COUNTRY_WIDTH = 1.4;
const ADMIN_REGION_WIDTH = 1;
// [dash length, gap length] in line-width multiples; paired with a round
// line-cap this reads as a fine dotted line rather than a dash, closer to
// Google's actual native rendering than a long-dash pattern would be.
const ADMIN_REGION_DASHARRAY: [number, number] = [0.6, 1.8];
// A layer's own (pre-override) base line-width at or above this is treated
// as "drawn thick on purpose" by TomTom, i.e. country-level — see
// estimateBaseLineWidth below. 1.2 sits just above the ~1px a typical
// region/county line renders at and just below where a deliberately
// emphasized country border would start.
const ADMIN_COUNTRY_WIDTH_SIGNAL = 1.2;

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
  // Matches src/mapStyles/playful.json's base geometry color exactly —
  // Google's own background was bumped from #f8f5fb to this same #f1e4f6
  // at the same time (see that file's history) specifically because it was
  // reading as "pure white" next to TomTom's more visibly lilac look;
  // aligning both to one shared value is the actual fix per feedback
  // ("GoogleMaps background looks pure white... we want more lila there
  // too to align it").
  background: "#f1e4f6",
  water: "#7b86e0",
  park: "#2fae66",
  parkOutline: "#1f6d4c",
  // "Earth Cover" fills the *entire* landmass (it's TomTom's base landcover
  // classification, not a sparse feature), so in practice *this* color —
  // not `background` above — is what actually reads as "the map's base
  // tone" almost everywhere. Bumped in the same pass as `background` above,
  // slightly lighter than it so full-landmass coverage doesn't tip back
  // into the solid-purple-wash problem a fully saturated terrain color
  // caused earlier this session. terrain and terrainAlt used to differ
  // slightly — at high zoom TomTom's landcover is actually dozens of small
  // adjacent polygons (fields, built-up patches, natural cover), each its
  // own fill layer, and any two-tone split between them shows up as a
  // visible patchwork/seam between neighboring polygons. Same color for
  // both eliminates that; see applyMapLibreStyleOverrides' explicit
  // fill-opacity:1 for the other half of the fix (pre-existing per-layer
  // opacity differences were doing the same thing to a single color).
  terrain: "#f4e9f8",
  terrainAlt: "#f4e9f8",
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
  // id. Confirmed the hard way: a fetch-and-grep of TomTom's actual
  // basic_main response found zero layers matching boundary/border/admin/
  // country/state/province/district/territory/political/dependency/order
  // ANYWHERE in id, source-layer, or filter — the only "admin" hit in the
  // whole document was "Government Administration Office" (a building, not
  // a boundary line). That fetch turned out to be truncated by the fetch
  // tool itself well before reaching the labels/boundary section of the
  // real style (verified: the saved response cuts off mid-property inside
  // the road layers, nowhere near the end of a 300+ layer style) — so this
  // isn't proof TomTom has no boundary layers, just proof this approach
  // can't see them. Country vs. region is no longer decided here by
  // keyword (see the removed /country/ check — it never matched, which is
  // exactly why every boundary rendered dashed in practice); it's decided
  // in applyMapLibreStyleOverrides instead, from each layer's own live
  // line-width as MapLibre already has it loaded (that object is never
  // truncated — it's the browser's own parsed style, not a re-fetch).
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
  // adminBoundary treatment (so no border/line is left at TomTom's default
  // gray) — better an unusual line rendering slightly lilac than another
  // round of "there's still a gap/gray line here".
  if (layerType === "fill") return "terrain";
  if (layerType === "line") return "adminBoundary";

  return "skip";
}

// TomTom doesn't expose which admin level a boundary line represents by id
// (see classify() above), but real-world map styles — TomTom's own included
// — almost universally draw country borders *thicker* than region/county/
// district borders as a basic cartographic convention, independent of
// naming. Reading each layer's own line-width, as MapLibre already has it
// parsed in the live style (map.getStyle() — never truncated, unlike the
// one-off fetch used to try to read layer ids directly), lets country vs.
// region be told apart from that built-in visual weighting instead of a
// guessed keyword. Handles a plain number, a legacy stops-function object,
// and a MapLibre "interpolate" expression.
function estimateBaseLineWidth(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "stops" in raw) {
    const stops = (raw as { stops?: unknown }).stops;
    if (Array.isArray(stops) && Array.isArray(stops[0]) && typeof stops[0][1] === "number") {
      return stops[0][1];
    }
    return null;
  }
  if (Array.isArray(raw)) {
    if (raw[0] === "interpolate") {
      // ["interpolate", interpolationType, input, z1, w1, z2, w2, ...] --
      // index 4 is the WIDTH at the first zoom stop. An earlier version of
      // this function instead grabbed "the first number anywhere in the
      // array", which is index 3 — the zoom *breakpoint* itself, not a
      // width at all. That bug is exactly why classification looked
      // zoom-band-dependent/inconsistent in testing: it was comparing a
      // zoom number (e.g. "5") against ADMIN_COUNTRY_WIDTH_SIGNAL instead of
      // an actual line width, so the country/region split was effectively
      // random relative to how TomTom actually draws each layer.
      const widthAtFirstStop = raw[4];
      return typeof widthAtFirstStop === "number" ? widthAtFirstStop : null;
    }
    // Fallback for any other expression shape (e.g. "step") — not worth
    // special-casing every possible MapLibre expression here, so just take
    // the first bare number as a best-effort guess.
    const firstNumber = raw.find((v): v is number => typeof v === "number");
    return firstNumber ?? null;
  }
  return null;
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
          // Country vs. region/county/district can't be told apart by id
          // (see classify()'s comment) — instead read this *specific*
          // layer's own original line-width, exactly as TomTom shipped it,
          // before doing anything else to it. `layer.paint` here is
          // whatever this pass hasn't touched yet, i.e. still TomTom's
          // default for this layer.
          if (layerType === "line") {
            const originalWidth = estimateBaseLineWidth(
              (layer as { paint?: Record<string, unknown> }).paint?.["line-width"],
            );
            const isCountryLevel = originalWidth !== null && originalWidth >= ADMIN_COUNTRY_WIDTH_SIGNAL;
            map.setPaintProperty(layer.id, "line-color", palette.adminBoundary);
            map.setPaintProperty(layer.id, "line-opacity", 1);
            if (isCountryLevel) {
              // Thin solid line — mirrors administrative.country's explicit
              // `weight: 1.4` in src/mapStyles/*.json. No dasharray: country
              // borders in Google's rendering (and TomTom's own default) are
              // solid, only sub-country levels are dashed/dotted.
              map.setPaintProperty(layer.id, "line-width", ADMIN_COUNTRY_WIDTH);
              map.setPaintProperty(layer.id, "line-dasharray", undefined);
            } else {
              // Dotted — mirrors Google's native dashed rendering for
              // administrative levels below country (kraj/region, county,
              // district), which Google applies automatically regardless of
              // the style JSON. MapLibre needs the dash pattern set
              // explicitly. Also the safer default when originalWidth
              // couldn't be read at all (unusual expression shape) — most
              // unclassifiable boundary-ish lines are more likely to be one
              // of the many region/county/district borders than one of the
              // handful of country borders.
              map.setPaintProperty(layer.id, "line-width", ADMIN_REGION_WIDTH);
              map.setPaintProperty(layer.id, "line-dasharray", ADMIN_REGION_DASHARRAY);
              map.setLayoutProperty(layer.id, "line-cap", "round");
            }
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
