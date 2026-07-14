// Keeps zoom in the useful range for this app: never out to a whole-world
// view, never in past normal street-level detail. Shared between MapView
// (to constrain the map itself) and ZoomControl (to disable +/- at bounds).
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;
