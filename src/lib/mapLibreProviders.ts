// Registry of vector-tile providers usable by MapLibreMapView. TomTom is the
// only entry today (per PLAN.md §8's phased approach — prove the shared
// adapter against one source before adding MapTiler/OSM as a second). Every
// provider here must resolve to a plain MapLibre Style Spec JSON URL so
// MapLibreMapView never needs provider-specific branching beyond this file.
export interface MapLibreProviderConfig {
  id: "tomtom";
  label: string;
  // Name of the Vite env var holding the API key — read via
  // import.meta.env[apiKeyEnvVar] at the call site, not here, so this file
  // has no import.meta coupling and stays trivially testable.
  apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY";
  styleUrl: (apiKey: string) => string;
}

export const MAPLIBRE_PROVIDERS = {
  tomtom: {
    id: "tomtom",
    label: "TomTom",
    apiKeyEnvVar: "VITE_TOMTOM_MAPS_API_KEY",
    // TomTom's Merged Style endpoint returns a MapLibre-Style-Spec-compatible
    // JSON directly (Maps SDK for Web v6 is deprecated — this is the
    // vendor's own recommended plain-MapLibre path, not their newer
    // proprietary @tomtom-org/maps-sdk wrapper, which we deliberately avoid
    // since it isn't reusable across other providers). `style/*` pins to the
    // latest resource version so this URL doesn't need bumping by hand.
    // "basic_main" is TomTom's default light street style — distinct from
    // Google's playful/nature by design, not meant to match them.
    styleUrl: (apiKey) => `https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_main`,
  },
} as const satisfies Record<string, MapLibreProviderConfig>;

export type MapLibreProviderId = keyof typeof MAPLIBRE_PROVIDERS;

// Only one provider exists today, so this is trivially "tomtom" — kept as
// its own export so MapLibreMapView doesn't hardcode the id, and adding
// MapTiler later is a one-line change plus a switcher UI, not a rewrite.
export const DEFAULT_MAPLIBRE_PROVIDER_ID: MapLibreProviderId = "tomtom";
