import { useEffect, useState } from "react";

// Wider than useIsMobile's 640px cutoff: title + provider switcher + style
// switcher + language switcher + settings icon don't fit on one header line
// below ~768px (Tailwind's `md`), even though style/language alone (without
// the provider switcher) fit fine down to 640px — see useIsMobile. Used to
// move *just* the provider switcher into MapLayerSettings' dropdown in that
// 640–767px gap, while style/language stay inline as before.
const COMPACT_QUERY = "(max-width: 767px)";

export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    const handleChange = () => setIsCompact(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isCompact;
}
