import * as React from "react";

import { Intro } from "@/components/intro";
import { SiteNav } from "@/components/site-nav";
import { FINE_POINTER, useMediaQuery } from "@/hooks/use-media-query";
import { ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import { PreferencesProvider, usePreferences } from "@/lib/preferences";
import { Contact } from "@/sections/contact";
import { Gallery } from "@/sections/gallery";
import { Hero } from "@/sections/hero";
import { Work } from "@/sections/work";

const CursorFollower = React.lazy(() => import("@/three/cursor-follower"));

function Shell() {
  const { reducedMotion, prefs } = usePreferences();
  const finePointer = useMediaQuery(FINE_POINTER);
  const [mode, setMode] = React.useState<string | null>(null);

  // ScrollSmoother has to exist before any ScrollTrigger is created, so the
  // sections only mount once it is in place. Touch devices keep native
  // momentum scrolling, and reduced motion turns smoothing off entirely.
  React.useLayoutEffect(() => {
    const smooth = !reducedMotion && finePointer;
    const smoother = smooth
      ? ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 1.1,
          smoothTouch: false,
          effects: false,
        })
      : null;
    setMode(smooth ? "smooth" : "native");
    return () => {
      smoother?.kill();
    };
  }, [reducedMotion, finePointer]);

  // Late-arriving fonts change line heights; re-measure the triggers.
  React.useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, [mode]);

  const showCursor = prefs.cursor && finePointer && !reducedMotion && "WebGL2RenderingContext" in window;

  return (
    <>
      <a
        href="#work"
        className="bg-foreground text-background fixed top-3 left-3 z-[200] -translate-y-20 rounded-full px-4 py-2 text-sm focus:translate-y-0"
      >
        Skip to work
      </a>
      <SiteNav />
      <Intro />
      {showCursor ? (
        <React.Suspense fallback={null}>
          <CursorFollower />
        </React.Suspense>
      ) : null}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          {mode ? (
            <main key={mode}>
              <Hero />
              <Work />
              <Gallery />
              <Contact />
            </main>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <Shell />
    </PreferencesProvider>
  );
}
