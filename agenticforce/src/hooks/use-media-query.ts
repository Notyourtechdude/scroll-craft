import * as React from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(
    () => window.matchMedia?.(query).matches ?? false,
  );
  React.useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const read = () => setMatches(list.matches);
    read();
    list.addEventListener?.("change", read);
    return () => list.removeEventListener?.("change", read);
  }, [query]);
  return matches;
}

/** Fine pointer with hover: a mouse or trackpad, not a finger. */
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";
