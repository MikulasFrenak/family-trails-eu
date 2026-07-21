export interface MapLibreProviderConfig {
  id: "tomtom";
  label: string;
  apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY";
  styleUrl: (apiKey: string) => string;
}

export const MAPLIBRE_PROVIDERS = {
  tomtom: {
    id: "tomtom",
    label: "TomTom",
    apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY",
    styleUrl: (apiKey) => `https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_main`,
  },
} as const satisfies Record<string, MapLibreProviderConfig>;

export type MapLibreProviderId = keyof typeof MAPLIBRE_PROVIDERS;

export const DEFAULT_MAPLIBRE_PROVIDER_ID: MapLibreProviderId = "tomtom";
