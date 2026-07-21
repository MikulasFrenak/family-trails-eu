import type maplibregl from "maplibre-gl";

const SOURCE_ID = "tomtom-hillshade-dem";
const LAYER_ID = "tomtom-hillshade";

// TomTom's "Hillshade Tile" endpoint, despite the name, returns raw
// elevation data rather than a pre-rendered shaded-relief image — every
// pixel encodes a height in meters via
//   height = -10000 + (R*256*256 + G*256 + B) * 0.1
// which is byte-for-byte the same formula Mapbox's Terrain-RGB format
// uses. That means MapLibre's built-in `raster-dem` source type (with
// encoding:"mapbox") decodes TomTom's tiles correctly, and its native
// `hillshade` layer type can render genuine shaded relief from them — this
// is MapLibre's standard terrain feature, just pointed at a TomTom-hosted
// DEM instead of Mapbox's. Only goes up to zoom 13 (TomTom's own limit for
// this endpoint); MapLibre reuses the z13 tile for deeper zooms.
// Docs: https://developer.tomtom.com/map-display-api/documentation/tomtom-maps/raster/hillshade-tile
export function ensureMapLibreHillshade(map: maplibregl.Map, apiKey: string): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "raster-dem",
      tiles: [`https://api.tomtom.com/map/1/tile/hill/main/{z}/{x}/{y}.png?key=${apiKey}`],
      // TomTom's tiles are 514x514 (a 512px tile plus a 1px buffer on each
      // edge, borrowed from neighboring tiles) — the standard Terrain-RGB
      // buffer convention, so the logical tileSize MapLibre should use is
      // still 512.
      tileSize: 512,
      maxzoom: 13,
      encoding: "mapbox",
    });
  }

  if (map.getLayer(LAYER_ID)) return;

  // Needs to sit above the flat land/terrain fills (applyMapLibreStyleOverrides
  // paints those fully opaque, so hillshade placed *below* them would be
  // completely hidden) but below water/roads/labels, so the shading
  // textures the colored ground without darkening water or fighting with
  // legibility. Anchors on the first water-looking layer id as a
  // reasonably reliable "first non-land layer" marker — water is one of
  // the earliest non-background/non-landcover layers in typical vector
  // styles, so anything drawn after it (roads, labels) stays on top of the
  // shading as intended.
  const anchor = (map.getStyle()?.layers ?? []).find((l) => /water|lake|ocean|river/i.test(l.id))?.id;

  map.addLayer(
    {
      id: LAYER_ID,
      type: "hillshade",
      source: SOURCE_ID,
      paint: {
        "hillshade-exaggeration": 0.5,
        "hillshade-shadow-color": "#6b5478",
        "hillshade-highlight-color": "#ffffff",
        "hillshade-accent-color": "#9b6fd1",
      },
    },
    anchor,
  );
}
