// Keeps zoom in the useful range for this app: never out to a whole-world
// view, never in past normal street-level detail. These two are the
// MapLibre/TomTom-native numbers — MapView/ZoomControlMapLibre use them
// directly. Google needs its own copies below (GOOGLE_MIN_ZOOM/
// GOOGLE_MAX_ZOOM) rather than these raw values — see the comment there.
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

// Google Maps' JS API and MapLibre/TomTom don't count zoom the same way for
// the same on-screen scale, but three rounds of trying to compensate for
// that (a shared "GOOGLE_ZOOM_OFFSET" added to MIN_ZOOM/MAX_ZOOM, then an
// unconditionally-low GOOGLE_MIN_ZOOM=3 to fix a resulting default-centering
// regression) both overcorrected in practice — 3 let Google zoom out to a
// whole-earth view, way past anything actually useful. Back to matching
// MIN_ZOOM directly: 6 is confirmed safely below whatever zoom
// defaultBounds/fitBounds computes for SLOVAKIA_BOUNDS (so it won't clamp
// the default view like the offset version did), while not being so low it
// allows zooming out past the app's useful range. Kept as its own constant
// (not just reusing MIN_ZOOM inline) in case a real difference is confirmed
// later — but starting from "the same as TomTom" is the safer baseline
// after two rounds of guessing wrong in the other direction.
export const GOOGLE_MIN_ZOOM = MIN_ZOOM;
export const GOOGLE_MAX_ZOOM = MAX_ZOOM;

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
export const MARKER_CLUSTER_RADIUS = 55;

// Zoom level at which clusters fully dissolve into individual pins, for the
// TomTom/MapLibre side. See GOOGLE_MARKER_CLUSTER_MAX_ZOOM below for
// Google's own copy.
export const MARKER_CLUSTER_MAX_ZOOM = MAX_ZOOM - 2;

// Google's own copies of the two above. No longer derived from a shared
// zoom-offset formula (see GOOGLE_MIN_ZOOM's comment — that model turned out
// to be unreliable and got the map's own min/max zoom backwards in
// practice), so these are independent, empirically-set numbers too.
// GOOGLE_MARKER_CLUSTER_RADIUS is a modest bump over the TomTom side per
// feedback that Google's clustering needed to feel a little more
// aggressive/grouped for equivalent behavior; nudge either of these
// directly if clustering still doesn't look equivalent between providers.
export const GOOGLE_MARKER_CLUSTER_MAX_ZOOM = MARKER_CLUSTER_MAX_ZOOM;
export const GOOGLE_MARKER_CLUSTER_RADIUS = MARKER_CLUSTER_RADIUS + 10;
