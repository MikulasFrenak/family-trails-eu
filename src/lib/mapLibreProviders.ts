// Registry of vector-tile providers usable by MapLibreMapView. TomTom is the
// only entry today (per PLAN.md §8's phased approach — prove the shared
// adapter against one source before adding MapTiler/OSM as a second).
export interface MapLibreProviderConfig {
  id: "tomtom";
  label: string;
  // Name of the Vite env var holding the API key — read via
  // import.meta.env[apiKeyEnvVar] at the call site, not here, so this file
  // has no import.meta coupling and stays trivially testable.
  apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY";
  // Returns a ready-to-use MapLibre Style Spec object (not just a URL to
  // hand to maplibre-gl directly — see the "sources" comment below for why).
  buildStyle: (apiKey: string) => Promise<Record<string, unknown>>;
}

// TomTom's "Merged Style" endpoint (confirmed by fetching it directly) only
// ever returns `{ version, layers }` — no "sources", "sprite", or "glyphs".
// It's designed to be merged into a base config that TomTom's own SDK
// supplies at runtime, not handed to vanilla maplibre-gl as a standalone
// style. Every layer in the response references a single source named
// "vectorTiles" (confirmed by inspecting the layers), which lines up with
// the plain Map Display API vector tile endpoint documented at
// https://developer.tomtom.com/map-display-api/documentation/tomtom-maps/v1/vector/tile
// ("basic_main" in the merged-style URL decomposes into layer=basic,
// style=main there) — so we fetch the layers and patch in that source
// ourselves rather than depending on TomTom's SDK.
//
// Not yet wired up: "sprite" (POI/road icons) and "glyphs" (text labels).
// Fill/line layers (land, water, roads, buildings) render fine without
// them; symbol layers just won't show icons/text yet. Follow-up, not a
// blocker for a first working map.
function buildTomTomStyle(apiKey: string) {
  return fetch(`https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_main`)
    .then((res) => {
      if (!res.ok) throw new Error(`TomTom style request failed: ${res.status}`);
      return res.json() as Promise<Record<string, unknown>>;
    })
    .then((style) => ({
      ...style,
      sources: {
        vectorTiles: {
          type: "vector",
          tiles: [`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.pbf?key=${apiKey}`],
          maxzoom: 22,
        },
      },
    }));
}

export const MAPLIBRE_PROVIDERS = {
  tomtom: {
    id: "tomtom",
    label: "TomTom",
    apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY",
    buildStyle: buildTomTomStyle,
  },
} as const satisfies Record<string, MapLibreProviderConfig>;

export type MapLibreProviderId = keyof typeof MAPLIBRE_PROVIDERS;

// Only one provider exists today, so this is trivially "tomtom" — kept as
// its own export so MapLibreMapView doesn't hardcode the id, and adding
// MapTiler later is a one-line change plus a switcher UI, not a rewrite.
export const DEFAULT_MAPLIBRE_PROVIDER_ID: MapLibreProviderId = "tomtom";
