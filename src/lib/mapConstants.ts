// Keeps zoom in the useful range for this app: never out to a whole-world
// view, never in past normal street-level detail. These two are the
// MapLibre/TomTom-native numbers — MapView/ZoomControlMapLibre use them
// directly. Google needs its own copies below (GOOGLE_MIN_ZOOM/
// GOOGLE_MAX_ZOOM) rather than these raw values — see the comment there.
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

// Google Maps' JS API and MapLibre/TomTom don't count zoom the same way for
// the same on-screen scale. Two rounds of trying to derive/tune a shared
// "GOOGLE_ZOOM_OFFSET" added *to* MIN_ZOOM/MAX_ZOOM (based on published
// reports that Google's number should run higher than Mapbox/MapLibre's for
// the same view) went the wrong way in practice: raising GOOGLE_MIN_ZOOM
// above MIN_ZOOM made Google's floor (10) end up *higher* than the zoom
// defaultBounds/fitBounds naturally computes to fit all of Slovakia — the
// SDK clamps the initial view up to minZoom when the fitted zoom is lower
// than it, which broke the default centered view entirely (it started
// zoomed in far past the whole country). Direct feedback confirmed the
// floor needed to go the other way — *lower* than MIN_ZOOM, not higher — to
// let Google zoom out at least as far as TomTom, and to stay safely below
// whatever zoom fitBounds picks for SLOVAKIA_BOUNDS so it can never clamp
// the default view again. No more derived "offset" model for either bound —
// both are independent, empirically-set numbers now; adjust either directly
// based on what's actually observed rather than a shared formula.
export const GOOGLE_MIN_ZOOM = 3;
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
