import * as React from "react";

import { LazyImage } from "@/components/lazy-image";
import { shots, unsplash } from "@/data/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

// Editorial rhythm on wide screens; a plain two-up grid on phones.
const LAYOUT = [
  "md:col-span-7 aspect-[4/3]",
  "md:col-span-5 aspect-[4/5] md:mt-32",
  "md:col-span-4 aspect-[3/4]",
  "md:col-span-8 aspect-[16/10] md:mt-20",
  "md:col-span-6 aspect-[1/1]",
  "md:col-span-6 aspect-[4/5] md:-mt-24",
  "md:col-span-5 aspect-[3/4] md:col-start-2",
  "md:col-span-6 aspect-[4/3] md:mt-40",
];

const WIDTHS = [480, 800, 1200, 1600];

export function Gallery() {
  const { reducedMotion } = usePreferences();
  const root = React.useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      // Each photo drifts inside its frame at its own rate, a cheap transform-only
      // parallax that never triggers layout.
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el, i) => {
        const depth = 6 + (i % 3) * 4;
        gsap.fromTo(
          el,
          { yPercent: -depth },
          {
            yPercent: depth,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          clipPath: "inset(12% 8% 12% 8% round 24px)",
          duration: 1.3,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
      gsap.from("[data-gallery-title] > span > span", {
        yPercent: 110,
        stagger: 0.08,
        duration: 1.1,
        ease: "expo.out",
        scrollTrigger: { trigger: "[data-gallery-title]", start: "top 85%" },
      });
    },
    { scope: root, dependencies: [reducedMotion] },
  );

  return (
    <section ref={root} id="gallery" aria-labelledby="gallery-title" className="px-4 py-24 md:px-8 md:py-40">
      <div className="mb-14 grid gap-6 md:mb-24 md:grid-cols-[1fr_minmax(0,28rem)] md:items-end">
        <div>
          <p className="text-muted-foreground mb-5 font-mono text-xs tracking-[0.2em] uppercase">Gallery</p>
          <h2
            id="gallery-title"
            data-gallery-title
            className="text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.05em]"
          >
            {["Field notes", "from the build."].map((l) => (
              <span key={l} className="block overflow-hidden pb-[0.05em]">
                <span className="block">{l}</span>
              </span>
            ))}
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
          The material we work in: networks, hardware, code and the rooms it gets made in. Every photo
          loads only as you approach it, sized for your screen.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-6">
        {shots.map((shot, i) => (
          <li key={shot.id} className={cn("col-span-2 sm:col-span-1", LAYOUT[i % LAYOUT.length])}>
            <figure className="flex h-full flex-col gap-3">
              <div data-reveal className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
                <div data-parallax className="absolute inset-x-0 -inset-y-[14%]">
                  <LazyImage
                    src={unsplash(shot.id, 1200)}
                    srcSet={WIDTHS.map((w) => `${unsplash(shot.id, w)} ${w}w`).join(", ")}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    alt={shot.alt}
                    tint={shot.tint}
                  />
                </div>
              </div>
              <figcaption className="text-muted-foreground flex items-baseline justify-between gap-4 text-sm">
                <span className="text-foreground">{shot.caption}</span>
                <span className="font-mono text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-10 text-xs">Photography via Unsplash.</p>
    </section>
  );
}
