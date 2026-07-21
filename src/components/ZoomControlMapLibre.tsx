import type maplibregl from "maplibre-gl";
import { useEffect, useState } from "react";
import { MIN_ZOOM, MAX_ZOOM, SLOVAKIA_BOUNDS_MAPLIBRE, MAP_BOUNDS_PADDING } from "../lib/mapConstants";

// MapLibre equivalent of ZoomControl.tsx — same markup/behaviour, but driven
// by the vanilla maplibregl.Map instance passed down from MapLibreMapView
// instead of the @vis.gl/react-google-maps useMap() hook.
export function ZoomControlMapLibre({ map }: { map: maplibregl.Map }) {
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    onZoom();
    map.on("zoom", onZoom);
    return () => {
      map.off("zoom", onZoom);
    };
  }, [map]);

  const step = (delta: number) => map.setZoom(map.getZoom() + delta);

  const recenter = () => {
    map.fitBounds(SLOVAKIA_BOUNDS_MAPLIBRE, { padding: MAP_BOUNDS_PADDING });
  };

  const atMax = zoom >= MAX_ZOOM;
  const atMin = zoom <= MIN_ZOOM;

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl shadow-lg ring-1 ring-brand-mint-line sm:right-4 sm:top-4">
      <button
        type="button"
        aria-label="Zoom in"
        disabled={atMax}
        onClick={() => step(1)}
        className="flex h-10 w-10 items-center justify-center bg-brand-paper-raised text-xl font-semibold text-brand-forest-deep transition-colors hover:bg-brand-mint-line active:bg-brand-mint disabled:cursor-not-allowed disabled:text-brand-ink-soft/40 disabled:hover:bg-brand-paper-raised"
      >
        +
      </button>
      <div className="h-px bg-brand-mint-line" />
      <button
        type="button"
        aria-label="Zoom out"
        disabled={atMin}
        onClick={() => step(-1)}
        className="flex h-10 w-10 items-center justify-center bg-brand-paper-raised text-xl font-semibold text-brand-forest-deep transition-colors hover:bg-brand-mint-line active:bg-brand-mint disabled:cursor-not-allowed disabled:text-brand-ink-soft/40 disabled:hover:bg-brand-paper-raised"
      >
        −
      </button>
      <div className="h-px bg-brand-mint-line" />
      <button
        type="button"
        aria-label="Fit map to Slovakia"
        onClick={recenter}
        className="flex h-10 w-10 items-center justify-center bg-brand-paper-raised text-brand-forest-deep transition-colors hover:bg-brand-mint-line active:bg-brand-mint"
      >
        <RecenterIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function RecenterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
