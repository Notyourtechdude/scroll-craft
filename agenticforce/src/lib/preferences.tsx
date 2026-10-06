import * as React from "react";

import { readJSON, writeJSON } from "@/lib/storage";

export type Theme = "dark" | "light";
export type MotionPref = "system" | "reduced" | "full";

export interface Preferences {
  theme: Theme;
  motion: MotionPref;
  cursor: boolean;
}

interface VisitRecord {
  count: number;
  introSeen: boolean;
  lastAt: number;
}

// index.html reads PREFS_KEY before first paint; keep the two in step.
const PREFS_KEY = "agenticforce:prefs:v1";
const VISIT_KEY = "agenticforce:visit:v1";

const DEFAULT_PREFS: Preferences = { theme: "dark", motion: "system", cursor: true };
const DEFAULT_VISIT: VisitRecord = { count: 0, introSeen: false, lastAt: 0 };

interface PreferencesValue {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  /** Resolved from the saved choice, falling back to the OS setting. */
  reducedMotion: boolean;
  /** Returning visitors skip the intro, so the page is usable immediately. */
  playIntro: boolean;
  introDone: boolean;
  finishIntro: () => void;
  visits: number;
}

const PreferencesContext = React.createContext<PreferencesValue | null>(null);

function useSystemReducedMotion() {
  const [reduced, setReduced] = React.useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  React.useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const read = () => setReduced(query.matches);
    query.addEventListener?.("change", read);
    return () => query.removeEventListener?.("change", read);
  }, []);
  return reduced;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = React.useState(() => readJSON(PREFS_KEY, DEFAULT_PREFS));
  const [visit] = React.useState(() => readJSON(VISIT_KEY, DEFAULT_VISIT));
  const systemReduced = useSystemReducedMotion();
  const reducedMotion =
    prefs.motion === "reduced" || (prefs.motion === "system" && systemReduced);

  const [playIntro] = React.useState(() => !visit.introSeen && !reducedMotion);
  const [introDone, setIntroDone] = React.useState(!playIntro);

  // Count the visit once per page load.
  React.useEffect(() => {
    writeJSON(VISIT_KEY, { ...visit, count: visit.count + 1, lastAt: Date.now() });
  }, [visit]);

  React.useEffect(() => {
    writeJSON(PREFS_KEY, prefs);
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.classList.toggle("dark", prefs.theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", prefs.theme === "dark" ? "#0d0d10" : "#f6f7f9");
  }, [prefs]);

  // Keep several open tabs in agreement.
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREFS_KEY) setPrefs(readJSON(PREFS_KEY, DEFAULT_PREFS));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPref = React.useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPrefs((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const finishIntro = React.useCallback(() => {
    setIntroDone(true);
    writeJSON(VISIT_KEY, {
      ...readJSON(VISIT_KEY, DEFAULT_VISIT),
      introSeen: true,
    });
  }, []);

  const value = React.useMemo(
    () => ({
      prefs,
      setPref,
      reducedMotion,
      playIntro,
      introDone,
      finishIntro,
      visits: visit.count + 1,
    }),
    [prefs, setPref, reducedMotion, playIntro, introDone, finishIntro, visit.count],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = React.useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
