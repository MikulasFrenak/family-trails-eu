import type maplibregl from "maplibre-gl";

const SOURCE_ID = "tomtom-hillshade-dem";
const LAYER_ID = "tomtom-hillshade";

export function ensureMapLibreHillshade(map: maplibregl.Map, apiKey: string): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "raster-dem",
      tiles: [`https://api.tomtom.com/map/1/tile/hill/main/{z}/{x}/{y}.png?key=${apiKey}`],
      tileSize: 512,
      maxzoom: 13,
      encoding: "mapbox",
    });
  }

  if (map.getLayer(LAYER_ID)) return;

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
