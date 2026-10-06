import * as React from "react";

import { site } from "@/data/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePreferences } from "@/lib/preferences";

/** First-visit curtain. Returning visitors skip it (see preferences.tsx). */
export function Intro() {
  const { playIntro, introDone, finishIntro } = usePreferences();
  const root = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!playIntro) return;
      gsap
        .timeline({ onComplete: finishIntro })
        .from("[data-intro-char]", { yPercent: 110, duration: 0.9, stagger: 0.035, ease: "expo.out" })
        .to("[data-intro-char]", { yPercent: -110, duration: 0.6, stagger: 0.02, ease: "expo.in" }, "+=0.25")
        .to(root.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "expo.inOut" }, "-=0.3");
    },
    { scope: root },
  );

  if (!playIntro || introDone) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="bg-background fixed inset-0 z-[90] grid place-items-center"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div className="flex overflow-hidden pb-[0.14em] text-[clamp(2.5rem,10vw,7rem)] leading-none font-semibold tracking-[-0.05em]">
        {site.name.split("").map((c, i) => (
          <span key={i} data-intro-char className="inline-block">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
