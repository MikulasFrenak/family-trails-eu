import type maplibregl from "maplibre-gl";
import type { MapStyleId } from "../store/useAppStore";

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

const ADMIN_COUNTRY_WIDTH = 1.4;
const ADMIN_REGION_WIDTH = 1;
const ADMIN_REGION_DASHARRAY: [number, number] = [0.6, 1.8];
const ADMIN_COUNTRY_WIDTH_SIGNAL = 1.2;

const PLAYFUL: StylePalette = {
  background: "#f1e4f6",
  water: "#7b86e0",
  park: "#2fae66",
  parkOutline: "#1f6d4c",
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

const NATURE: StylePalette = {
  background: "#f6f8f4",
  water: "#6bb3c9",
  park: "#4fae72",
  parkOutline: "#1f6d4c",
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

function classify(id: string, sourceLayer: string, layerType: string): Category {
  const hay = `${id} ${sourceLayer}`.toLowerCase();

  if (layerType === "background") return "background";

  if (layerType === "symbol") {
    return /name|label|place|shield/.test(hay) ? "label" : "poiIcon";
  }

  if (/water|lake|ocean|river|beach|dune/.test(hay)) return "water";
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

  if (layerType === "fill") return "terrain";
  if (layerType === "line") return "adminBoundary";

  return "skip";
}

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
      const widthAtFirstStop = raw[4];
      return typeof widthAtFirstStop === "number" ? widthAtFirstStop : null;
    }
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
            const originalWidth = estimateBaseLineWidth(
              (layer as { paint?: Record<string, unknown> }).paint?.["line-width"],
            );
            const isCountryLevel = originalWidth !== null && originalWidth >= ADMIN_COUNTRY_WIDTH_SIGNAL;
            map.setPaintProperty(layer.id, "line-color", palette.adminBoundary);
            map.setPaintProperty(layer.id, "line-opacity", 1);
            if (isCountryLevel) {
              map.setPaintProperty(layer.id, "line-width", ADMIN_COUNTRY_WIDTH);
              map.setPaintProperty(layer.id, "line-dasharray", undefined);
            } else {
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
    }
  }
}

export interface MapLibreLayerVisibility {
  showRoads: boolean;
  showPlaceLabels: boolean;
  showMountainLabels: boolean;
  showWaterLabels: boolean;
}

function classifyLabelToggle(idLower: string): keyof MapLibreLayerVisibility {
  if (/road|route|shield|highway/.test(idLower)) return "showRoads";
  if (/water|lake|river|ocean|sea/.test(idLower)) return "showWaterLabels";
  if (/mountain|peak|summit|elevation/.test(idLower)) return "showMountainLabels";
  return "showPlaceLabels";
}

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
    }
  }
}
