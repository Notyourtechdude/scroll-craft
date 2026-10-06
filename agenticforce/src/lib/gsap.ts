import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);

// Mobile address bars resize the viewport while scrolling; recalculating every
// trigger on each of those resizes causes visible jumps.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollSmoother, ScrollTrigger, useGSAP };

/** Scrolls to a section whether or not ScrollSmoother is running. */
export function scrollToId(id: string, instant = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const smoother = ScrollSmoother.get();
  if (smoother) {
    smoother.paused(false);
    smoother.scrollTo(el, !instant, "top top");
  } else {
    el.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
  }
}
