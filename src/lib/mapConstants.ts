// Keeps zoom in the useful range for this app: never out to a whole-world
// view, never in past normal street-level detail. These two are the
// MapLibre/TomTom-native numbers — MapView/ZoomControlMapLibre use them
// directly. Google needs its own offset copies below (GOOGLE_MIN_ZOOM/
// GOOGLE_MAX_ZOOM) rather than these raw values — see the comment there.
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

// Google Maps' JS API and MapLibre/TomTom don't count zoom the same way for
// the same on-screen scale: Google's tile pyramid uses 256px tiles, while
// MapLibre GL (and TomTom's vector style, built for it) uses 512px tiles —
// real-world reports put the offset at roughly 2 (e.g. "Mapbox GL zoom 15
// looks the same as Google Maps zoom 17" — github.com/mapbox/
// mapbox-gl-native/issues/9417), i.e. Google needs the *higher* number for
// the same view. First tried as exactly 2 (matching that report literally),
// but a direct side-by-side screenshot comparison at that value still
// showed Google noticeably tighter/more zoomed-in than TomTom at its own
// floor (a single mountain range vs. TomTom's Dresden-to-Zagreb continental
// view at their respective MIN_ZOOM) — bumped to 4 per that comparison and
// the follow-up feedback ("increased by 1-2 maybe... MIN"). Still an
// empirically-tuned number rather than a precisely derived one; nudge
// further if either end still doesn't visually match.
export const GOOGLE_ZOOM_OFFSET = 4;
export const GOOGLE_MIN_ZOOM = MIN_ZOOM + GOOGLE_ZOOM_OFFSET;
export const GOOGLE_MAX_ZOOM = MAX_ZOOM + GOOGLE_ZOOM_OFFSET;

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

// Marker-cluster grouping radius, in pixels — the TomTom/MapLibre side
// (MarkerLayerMapLibre's own directly-managed `supercluster` instance).
// Previously this was also shared as a literal number with Google, on the
// assumption that the same `supercluster` library underneath meant the same
// number produced the same grouping — true for the *algorithm*, but not
// once GOOGLE_ZOOM_OFFSET (above) is accounted for: Google's clusterer
// evaluates this radius against Google's own (offset) zoom number, so a
// shared literal radius doesn't actually group the same real-world area on
// both sides. See GOOGLE_MARKER_CLUSTER_RADIUS below for Google's own copy.
export const MARKER_CLUSTER_RADIUS = 55;

// Zoom level at which clusters fully dissolve into individual pins, for the
// TomTom/MapLibre side. See GOOGLE_MARKER_CLUSTER_MAX_ZOOM below for
// Google's offset copy.
export const MARKER_CLUSTER_MAX_ZOOM = MAX_ZOOM - 2;

// Google-specific copies, both compensating for GOOGLE_ZOOM_OFFSET: Google's
// SuperClusterAlgorithm evaluates radius/maxZoom against Google's own
// Math.round(map.getZoom()), which — per GOOGLE_ZOOM_OFFSET above — runs
// higher than the equivalent MapLibre zoom for the same view. Fed into the
// same underlying supercluster math, that offset alone would already make
// Google under-cluster relative to TomTom at the "same" view;
// GOOGLE_MARKER_CLUSTER_MAX_ZOOM corrects the dissolve point for that
// directly. Radius doesn't have as clean a formula (it interacts with the
// offset multiplicatively, not additively, and there's no way to verify the
// exact right number without live A/B testing both providers side by side),
// so GOOGLE_MARKER_CLUSTER_RADIUS is a modest, empirically-adjustable bump
// on top of the shared base per feedback ("Google clustering should have a
// bigger radius, a little bit, for the same functionality") rather than a
// derived value — nudge this one further if it still doesn't look equivalent.
export const GOOGLE_MARKER_CLUSTER_MAX_ZOOM = MARKER_CLUSTER_MAX_ZOOM + GOOGLE_ZOOM_OFFSET;
export const GOOGLE_MARKER_CLUSTER_RADIUS = MARKER_CLUSTER_RADIUS + 10;
