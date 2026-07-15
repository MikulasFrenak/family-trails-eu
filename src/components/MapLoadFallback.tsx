import { useTranslation } from "react-i18next";

// Without `onRetry`: the auth/quota dead-end ("come back tomorrow").
// With `onRetry`: a transient tile-load timeout — different message + button.
export function MapLoadFallback({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-paper p-8">
      <div className="max-w-sm rounded-3xl bg-brand-paper-raised p-8 text-center shadow-xl ring-1 ring-brand-mint-line">
        <span className="text-5xl" aria-hidden="true">
          🗺️🌲🏰
        </span>
        <h2 className="mt-3 font-display text-lg font-semibold text-brand-ink">
          {t("mapLoadFallback.title")}
        </h2>
        <p className="mt-2 text-sm text-brand-ink-soft">
          {onRetry ? t("mapLoadFallback.timeoutMessage") : t("mapLoadFallback.message")}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-brand-ink px-5 py-2 text-sm font-semibold text-brand-paper transition hover:opacity-85"
          >
            {t("mapLoadFallback.retry")}
          </button>
        )}
      </div>
    </div>
  );
}
