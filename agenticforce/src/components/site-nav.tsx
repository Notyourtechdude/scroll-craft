import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { RollText } from "@/components/roll-link";
import { site } from "@/data/site";
import { gsap, ScrollSmoother, scrollToId, useGSAP } from "@/lib/gsap";
import { type MotionPref, usePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "gallery", label: "Gallery" },
  { id: "contact", label: "Contact" },
] as const;

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset data-menu-meta className="flex items-center justify-between gap-4">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
        {label}
      </span>
      <span className="bg-muted inline-flex rounded-full p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300",
              value === o.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </span>
    </fieldset>
  );
}

export function SiteNav() {
  const { prefs, setPref, reducedMotion, visits } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const root = React.useRef<HTMLElement>(null);
  const overlay = React.useRef<HTMLDivElement>(null);
  const toggle = React.useRef<HTMLButtonElement>(null);
  const timeline = React.useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      timeline.current = gsap
        .timeline({ paused: true, defaults: { ease: "expo.out" } })
        .set(overlay.current, { visibility: "visible" })
        .fromTo(
          overlay.current,
          { clipPath: "inset(0% 0% 100% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "expo.inOut" },
        )
        .fromTo(
          "[data-menu-item]",
          { yPercent: 115, rotate: 3 },
          { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.07 },
          "-=0.35",
        )
        .fromTo(
          "[data-menu-meta]",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05 },
          "-=0.75",
        );
    },
    { scope: root },
  );

  React.useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    if (reducedMotion) tl.progress(open ? 1 : 0).pause();
    else if (open) tl.timeScale(1).play();
    else tl.timeScale(1.7).reverse();

    // Freeze the page behind the menu and hide it from assistive tech.
    const content = document.getElementById("smooth-wrapper");
    if (content) content.inert = open;
    ScrollSmoother.get()?.paused(open);
    document.documentElement.style.overflow = open ? "hidden" : "";

    if (open) {
      overlay.current?.querySelector<HTMLElement>("[data-menu-link]")?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, reducedMotion]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    document.documentElement.style.overflow = "";
    scrollToId(id, reducedMotion);
  };

  return (
    <header ref={root}>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500",
          scrolled && !open
            ? "bg-background/70 border-b backdrop-blur-md"
            : "border-b border-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 items-center justify-between gap-4 px-4 md:h-20 md:px-8"
        >
          <a href="#top" onClick={go("top")} className="group flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="text-primary size-7 transition-transform duration-700 ease-out-expo group-hover:rotate-[120deg]" aria-hidden>
              <path d="M8 23 16 8l8 15h-4.5L16 16.2 12.5 23z" fill="currentColor" />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
          </a>

          <ul className="hidden items-center gap-8 text-sm md:flex">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} onClick={go(l.id)} className="group text-muted-foreground hover:text-foreground block py-2 transition-colors duration-300">
                  <RollText>{l.label}</RollText>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPref("theme", prefs.theme === "dark" ? "light" : "dark")}
              aria-label={prefs.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="hover:bg-muted grid size-10 place-items-center rounded-full transition-colors duration-300"
            >
              {prefs.theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
              className="group border-border hover:bg-foreground hover:text-background flex h-10 items-center gap-3 rounded-full border pr-4 pl-3.5 text-sm font-medium transition-colors duration-300"
            >
              <span aria-hidden className="relative block h-2.5 w-4">
                <span className={cn("absolute left-0 block h-px w-4 bg-current transition-transform duration-500 ease-out-expo", open ? "top-1/2 rotate-45" : "top-0")} />
                <span className={cn("absolute left-0 block h-px w-4 bg-current transition-transform duration-500 ease-out-expo", open ? "top-1/2 -rotate-45" : "top-full")} />
              </span>
              <RollText className="w-10 text-left">{open ? "Close" : "Menu"}</RollText>
            </button>
          </div>
        </nav>
      </div>

      <div
        ref={overlay}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        className="bg-background invisible fixed inset-0 z-40 overflow-y-auto"
      >
        <div className="flex min-h-stage flex-col justify-between gap-12 px-4 pt-28 pb-8 md:px-8 md:pt-36">
          <ul className="group/menu flex flex-col">
            {[{ id: "top", label: "Home" }, ...LINKS].map((l, i) => (
              <li key={l.id} className="overflow-hidden border-b first:border-t">
                <a
                  data-menu-item
                  data-menu-link
                  href={`#${l.id}`}
                  onClick={go(l.id)}
                  tabIndex={open ? 0 : -1}
                  className="group flex items-baseline gap-4 py-3 transition-opacity duration-500 group-hover/menu:opacity-35 hover:!opacity-100 focus-visible:!opacity-100 md:gap-8 md:py-4"
                >
                  <span className="text-muted-foreground w-8 font-mono text-xs tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[clamp(2.75rem,11vw,7.5rem)] leading-[0.95] font-semibold tracking-[-0.045em] transition-transform duration-700 ease-out-expo group-hover:translate-x-4 md:group-hover:translate-x-8">
                    {l.label}
                  </span>
                  <span className="bg-primary ml-auto hidden h-px w-0 self-center transition-[width] duration-700 ease-out-expo group-hover:w-24 md:block" />
                </a>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid max-w-sm gap-3">
              <Segmented
                label="Theme"
                value={prefs.theme}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
                onChange={(v) => setPref("theme", v)}
              />
              <Segmented<MotionPref>
                label="Motion"
                value={prefs.motion}
                options={[
                  { value: "system", label: "System" },
                  { value: "full", label: "Full" },
                  { value: "reduced", label: "Reduced" },
                ]}
                onChange={(v) => setPref("motion", v)}
              />
              <Segmented
                label="Cursor"
                value={prefs.cursor ? "on" : "off"}
                options={[
                  { value: "on", label: "Shader" },
                  { value: "off", label: "System" },
                ]}
                onChange={(v) => setPref("cursor", v === "on")}
              />
              <p data-menu-meta className="text-muted-foreground text-xs">
                Saved on this device{visits > 1 ? `. Welcome back (visit ${visits}).` : "."}
              </p>
            </div>
            <p data-menu-meta className="text-muted-foreground max-w-xs text-sm md:text-right">
              {site.tagline}.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
