import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import { MIN_ZOOM, MAX_ZOOM, SLOVAKIA_BOUNDS, MAP_BOUNDS_PADDING } from "../lib/mapConstants";

export function ZoomControl() {
  const map = useMap();
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (!map) return;
    setZoom(map.getZoom() ?? null);
    const listener = map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? null));
    return () => listener.remove();
  }, [map]);

  const step = (delta: number) => {
    if (!map) return;
    const current = map.getZoom() ?? 7;
    map.setZoom(current + delta);
  };

  const recenter = () => {
    if (!map) return;
    map.fitBounds(SLOVAKIA_BOUNDS, MAP_BOUNDS_PADDING);
  };

  const atMax = zoom !== null && zoom >= MAX_ZOOM;
  const atMin = zoom !== null && zoom <= MIN_ZOOM;

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
