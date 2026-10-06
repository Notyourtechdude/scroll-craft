import { ArrowUpRight } from "lucide-react";
import * as React from "react";

import DitherHelixCarousel from "@/components/ui/dither-helix-carousel";
import { projects } from "@/data/site";
import { usePreferences } from "@/lib/preferences";

const items = projects.map((p) => ({ image: p.cover, title: p.name }));

/**
 * Mounts the helix only while it is within a couple of screens of the viewport.
 * The component renders continuously once mounted, so dropping it when it is
 * far away hands the whole frame budget back to the rest of the page, and its
 * textures are not fetched until a visitor is on their way to it.
 */
function useNearViewport<T extends Element>(margin: string) {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

function Helix({ near }: { near: boolean }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(near);

  React.useEffect(() => {
    if (near) {
      setMounted(true);
      return;
    }
    // Release the GPU context straight away instead of waiting for GC; browsers
    // cap live WebGL contexts, and the page already runs two others.
    const canvas = host.current?.querySelector("canvas");
    const gl = canvas?.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    setMounted(false);
  }, [near]);

  return (
    <div ref={host} className="h-full">
      {mounted ? (
        <DitherHelixCarousel items={items} brand="AgenticForce / Selected work" className="h-full" />
      ) : null}
    </div>
  );
}

export function Work() {
  const { reducedMotion } = usePreferences();
  const [frame, near] = useNearViewport<HTMLDivElement>("120% 0px");

  return (
    <section id="work" aria-labelledby="work-title" className="relative px-4 pb-24 md:px-8 md:pb-40">
      <h2 id="work-title" className="sr-only">
        Selected work
      </h2>
      <div
        ref={frame}
        data-cursor
        className="bg-background h-[72vh] h-[72svh] overflow-hidden rounded-[28px] border md:h-[86vh] md:h-[86svh]"
      >
        <Helix near={near} />
      </div>
      <p className="text-muted-foreground mt-4 max-w-xl text-sm">
        Wheel or drag inside the frame to turn the column, click a card to bring it forward, or use the
        arrow keys once it has focus.{reducedMotion ? " Motion is reduced, so it settles instantly." : ""}
      </p>

      <ol className="mt-16 md:mt-24">
        {projects.map((p, i) => (
          <li key={p.url} className="border-b first:border-t">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative isolate grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-6 md:grid-cols-[5rem_1fr_auto] md:py-9"
            >
              <span
                aria-hidden
                className="bg-muted absolute inset-0 -z-10 origin-bottom scale-y-0 rounded-xl transition-transform duration-500 ease-out-expo group-hover:scale-y-100"
              />
              <span className="text-muted-foreground pl-1 font-mono text-xs tabular-nums md:pl-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[clamp(1.6rem,5.5vw,4rem)] leading-none font-semibold tracking-[-0.04em] transition-transform duration-500 ease-out-expo group-hover:translate-x-2 md:group-hover:translate-x-4">
                  {p.name}
                </span>
                <span className="text-muted-foreground mt-2 block truncate text-sm">
                  {p.kind} · {p.host}
                </span>
              </span>
              <span className="flex items-center gap-4 pr-1 md:pr-4">
                <img
                  src={p.cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="hidden h-14 w-28 rounded-md object-cover opacity-0 transition-[opacity,transform] duration-500 ease-out-expo group-hover:opacity-100 lg:block lg:translate-x-3 lg:group-hover:translate-x-0"
                />
                <ArrowUpRight className="size-6 transition-transform duration-500 ease-out-expo group-hover:rotate-45 md:size-8" />
                <span className="sr-only">(opens in a new tab)</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
