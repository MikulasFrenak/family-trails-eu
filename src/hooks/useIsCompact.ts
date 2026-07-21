import { useEffect, useState } from "react";

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
