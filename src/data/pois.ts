import czPois from "../../data/poi/cz.json";
import skPois from "../../data/poi/sk.json";
import type { Poi } from "../types/poi";

export const ALL_POIS = [...czPois, ...skPois] as unknown as Poi[];

export function getPoiById(id: string): Poi | undefined {
  return ALL_POIS.find((poi) => poi.id === id);
}
