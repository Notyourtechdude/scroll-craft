import * as React from "react";

import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  tint: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Requests nothing until the frame is within ~1.5 screens of the viewport, then
 * fades the photo in over its tint. Native loading="lazy" stays on as a second
 * line for browsers where the observer is unavailable.
 */
export function LazyImage({ src, srcSet, sizes, alt, tint, className, imgClassName }: LazyImageProps) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [near, setNear] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const el = frame.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={frame}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, ${tint}, #08090c)` }}
    >
      {near && !failed ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover transition-[opacity,filter] duration-1000 ease-out",
            loaded ? "opacity-100 blur-0" : "opacity-0 blur-lg",
            imgClassName,
          )}
        />
      ) : (
        <span className="sr-only">{alt}</span>
      )}
    </div>
  );
}
