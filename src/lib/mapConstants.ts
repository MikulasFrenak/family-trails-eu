// Keeps zoom in the useful range for this app: never out to a whole-world
// view, never in past normal street-level detail. Shared between MapView
// (to constrain the map itself) and ZoomControl (to disable +/- at bounds).
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

// Slovakia's approximate geographic extent — used to fit the whole country
// into view (best-fit zoom computed by the Maps SDK, not a fixed zoom
// level). Shared between MapView (initial view) and ZoomControl (recenter).
export const SLOVAKIA_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 47.73,
  west: 16.85,
  north: 49.61,
  east: 22.56,
};
// Kept small on purpose — the whole point of fitBounds is the tightest zoom
// that still shows the full country, this is just enough padding that edge
// pins/borders aren't literally touching the viewport edge. Same pixel value
// works for MapLibre's fitBoundsOptions.padding, no separate constant needed.
export const MAP_BOUNDS_PADDING = 12;

// MapLibre's LngLatBoundsLike wants [west, south, east, north] rather than
// Google's {south,west,north,east} object — derived from SLOVAKIA_BOUNDS
// above so the two never drift apart.
export const SLOVAKIA_BOUNDS_MAPLIBRE: [number, number, number, number] = [
  SLOVAKIA_BOUNDS.west,
  SLOVAKIA_BOUNDS.south,
  SLOVAKIA_BOUNDS.east,
  SLOVAKIA_BOUNDS.north,
];

// Marker-cluster grouping radius, in pixels — shared between MarkerLayer
// (passed to @googlemaps/markerclusterer's SuperClusterAlgorithm) and
// MarkerLayerMapLibre (passed as GeoJSON source `clusterRadius`, which is
// backed by the same underlying `supercluster` library both providers use
// under the hood, so the same number means the same grouping distance on
// screen either way). Previously these silently diverged — Google never
// passed an explicit algorithm, so it fell back to the library's own
// default of 60, while MapLibre explicitly set 50 — which is why the two
// providers visibly clustered differently at the same zoom. 55 splits the
// difference per feedback ("TomTom's clustering looks better, maybe just a
// bigger radius... maybe something in between").
export const MARKER_CLUSTER_RADIUS = 55;
