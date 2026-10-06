// localStorage can throw (Safari private mode, blocked site data, quota), so
// every read and write goes through these and degrades to defaults.

export function readJSON<T extends object>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? { ...fallback, ...(parsed as Partial<T>) }
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: preferences simply last for this page view.
  }
}
