import * as React from "react";

import { projects, site } from "@/data/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePreferences } from "@/lib/preferences";

const HeroScene = React.lazy(() => import("@/three/hero-scene"));

const LINES = ["Software that", "thinks, acts,", "and ships."];
const PANEL_WORDS = ["Selected", "work."];

const hasWebGL2 = typeof window !== "undefined" && "WebGL2RenderingContext" in window;

/**
 * The hero pins while one scrubbed timeline hands it over to the gallery: the
 * headline lifts away line by line, the 3D form swells toward the camera, and
 * the gallery's own surface wipes up from below until it fills the frame. When
 * the pin releases, that surface simply keeps scrolling as the top of #work,
 * so there is no seam between the two sections.
 */
export function Hero() {
  const { reducedMotion, introDone, prefs } = usePreferences();
  const root = React.useRef<HTMLElement>(null);
  const progress = React.useRef({ value: 0 });
  const [rendering, setRendering] = React.useState(true);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=160%",
          pin: true,
          scrub: reducedMotion ? true : 0.9,
          anticipatePin: 1,
          // Once the panel covers the scene there is nothing to draw.
          onUpdate: (self) => {
            const visible = self.progress < 0.97;
            setRendering((prev) => (prev === visible ? prev : visible));
          },
        },
      });
      tl.to(progress.current, { value: 1, duration: 1 }, 0)
        .to("[data-hero-line]", { yPercent: -115, duration: 0.38, stagger: 0.05, ease: "power2.in" }, 0.02)
        .to("[data-hero-sub]", { autoAlpha: 0, y: -30, duration: 0.25 }, 0)
        .to("[data-hero-rail]", { scaleX: 1, duration: 1 }, 0)
        .fromTo(
          "[data-hero-panel]",
          { clipPath: "inset(100% 4% 0% 4% round 28px)" },
          { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 0.5, ease: "power2.inOut" },
          0.38,
        )
        .from("[data-panel-word]", { yPercent: 120, duration: 0.28, stagger: 0.06, ease: "power3.out" }, 0.62)
        .from("[data-panel-copy]", { autoAlpha: 0, y: 24, duration: 0.22 }, 0.74);
    },
    { scope: root, dependencies: [reducedMotion] },
  );

  // Entrance, after the first-visit curtain lifts.
  useGSAP(
    () => {
      if (!introDone || reducedMotion) return;
      gsap.from("[data-hero-in]", { yPercent: 110, duration: 1.3, stagger: 0.09, ease: "expo.out" });
      gsap.from("[data-hero-sub]", { autoAlpha: 0, y: 20, duration: 1, delay: 0.45, ease: "expo.out" });
      gsap.from("[data-hero-canvas]", { autoAlpha: 0, scale: 0.92, duration: 1.8, ease: "expo.out" });
    },
    { scope: root, dependencies: [introDone, reducedMotion] },
  );

  return (
    <section id="top" ref={root} className="h-stage relative overflow-hidden" aria-label="Introduction">
      <div data-hero-canvas className="absolute inset-0">
        {hasWebGL2 ? (
          <React.Suspense fallback={null}>
            <HeroScene progress={progress.current} active={rendering} reduced={reducedMotion} theme={prefs.theme} />
          </React.Suspense>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_60%_45%,oklch(0.55_0.13_210/0.35),transparent)]" />
        )}
      </div>

      {/* Keeps the headline legible where it overlaps the form. */}
      <div aria-hidden className="from-background/80 pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />

      <div className="relative z-[1] flex h-full flex-col justify-end px-4 pb-10 md:px-8 md:pb-14">
        <p data-hero-sub className="text-muted-foreground mb-6 font-mono text-xs tracking-[0.2em] uppercase">
          {site.name} · {site.tagline}
        </p>
        <h1 className="text-[clamp(3.1rem,13.5vw,10.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
          {LINES.map((line) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <span data-hero-line className="block">
                <span data-hero-in className="block">
                  {line}
                </span>
              </span>
            </span>
          ))}
        </h1>
        <div data-hero-sub className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="text-muted-foreground max-w-md text-base leading-relaxed md:text-lg">
            We design autonomous AI agents and the immersive web experiences that put them in front of
            people.
          </p>
          <div className="flex w-full max-w-56 items-center gap-3 font-mono text-[11px] tracking-[0.18em] uppercase">
            <span className="text-muted-foreground">Scroll</span>
            <span className="bg-border relative h-px flex-1 overflow-hidden">
              <span data-hero-rail className="bg-foreground absolute inset-0 origin-left scale-x-0" />
            </span>
          </div>
        </div>
      </div>

      <div
        data-hero-panel
        className="bg-background absolute inset-0 z-[2] flex flex-col justify-end px-4 pb-10 md:px-8 md:pb-14"
        style={{ clipPath: "inset(100% 4% 0% 4% round 28px)" }}
      >
        <p data-panel-copy className="text-muted-foreground mb-6 font-mono text-xs tracking-[0.2em] uppercase">
          {String(projects.length).padStart(2, "0")} builds · live and in preview
        </p>
        <h2 className="text-[clamp(3.1rem,15vw,12rem)] leading-[0.88] font-semibold tracking-[-0.055em]">
          {PANEL_WORDS.map((w) => (
            <span key={w} className="mr-[0.22em] inline-block overflow-hidden align-bottom last:mr-0">
              <span data-panel-word className="inline-block">
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p data-panel-copy className="text-muted-foreground mt-8 max-w-md text-base leading-relaxed md:text-lg">
          Agent platforms, service businesses and launch sites. Keep scrolling, then turn the column with
          your wheel or a drag.
        </p>
      </div>
    </section>
  );
}
