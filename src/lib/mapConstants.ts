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
// pins/borders aren't literally touching the viewport edge.
export const MAP_BOUNDS_PADDING = 12;
