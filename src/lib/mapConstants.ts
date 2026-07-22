export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

export const GOOGLE_MIN_ZOOM = MIN_ZOOM + 1;
export const GOOGLE_MIN_ZOOM_MOBILE = MIN_ZOOM;
export const GOOGLE_MAX_ZOOM = MAX_ZOOM;

export const SLOVAKIA_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 47.73,
  west: 16.85,
  north: 49.61,
  east: 22.56,
};
export const MAP_BOUNDS_PADDING = 12;

export const SLOVAKIA_BOUNDS_MAPLIBRE: [number, number, number, number] = [
  SLOVAKIA_BOUNDS.west,
  SLOVAKIA_BOUNDS.south,
  SLOVAKIA_BOUNDS.east,
  SLOVAKIA_BOUNDS.north,
];

export const MARKER_CLUSTER_RADIUS = 55;
export const MARKER_CLUSTER_MAX_ZOOM = MAX_ZOOM - 2;

export const GOOGLE_MARKER_CLUSTER_MAX_ZOOM = MARKER_CLUSTER_MAX_ZOOM;
export const GOOGLE_MARKER_CLUSTER_RADIUS = MARKER_CLUSTER_RADIUS + 30;
