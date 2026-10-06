import { ArrowUp, ArrowUpRight } from "lucide-react";
import * as React from "react";

import { projects, site } from "@/data/site";
import { gsap, scrollToId } from "@/lib/gsap";
import { usePreferences } from "@/lib/preferences";

/** Button that leans toward the pointer while it is nearby. */
function Magnetic({ children }: { children: React.ReactElement }) {
  const wrap = React.useRef<HTMLSpanElement>(null);
  const { reducedMotion } = usePreferences();

  React.useEffect(() => {
    const el = wrap.current;
    if (!el || reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [reducedMotion]);

  return (
    <span ref={wrap} className="inline-block p-6 -m-6">
      {children}
    </span>
  );
}

export function Contact() {
  const { reducedMotion } = usePreferences();
  return (
    <section id="contact" aria-labelledby="contact-title" className="min-h-stage flex flex-col justify-between px-4 pt-24 pb-8 md:px-8 md:pt-40">
      <div>
        <p className="text-muted-foreground mb-5 font-mono text-xs tracking-[0.2em] uppercase">Contact</p>
        <h2 id="contact-title" className="max-w-[14ch] text-[clamp(2.8rem,10vw,9rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
          Have an agent in mind?
        </h2>
        <div className="mt-12 flex flex-wrap items-center gap-8">
          <Magnetic>
            <a
              href={site.contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background group inline-flex h-16 items-center gap-3 rounded-full pr-5 pl-8 text-lg font-semibold transition-transform duration-500 ease-out-expo hover:scale-[1.03] md:h-20 md:pl-10 md:text-xl"
            >
              Start a project
              <span className="bg-background text-foreground grid size-10 place-items-center rounded-full transition-transform duration-500 ease-out-expo group-hover:rotate-45 md:size-12">
                <ArrowUpRight className="size-5" />
              </span>
            </a>
          </Magnetic>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Tell us the job you want an agent to do. We will come back with how we would build it.
          </p>
        </div>
      </div>

      <footer className="mt-24 grid gap-8 border-t pt-8 text-sm md:grid-cols-[1fr_auto_auto] md:items-end md:gap-16">
        <div>
          <p className="font-semibold">{site.name}</p>
          <p className="text-muted-foreground mt-1">
            © {new Date().getFullYear()} {site.name}. Built with React Three Fiber and GSAP.
          </p>
        </div>
        <ul className="text-muted-foreground grid gap-1.5">
          {projects
            .filter((p) => p.kind === "Live site")
            .map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-300">
                  {p.host}
                </a>
              </li>
            ))}
        </ul>
        <button
          type="button"
          onClick={() => scrollToId("top", reducedMotion)}
          className="group hover:bg-foreground hover:text-background inline-flex items-center gap-2 justify-self-start rounded-full border px-4 py-2 transition-colors duration-300"
        >
          <ArrowUp className="size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5" />
          Back to top
        </button>
      </footer>
    </section>
  );
}
