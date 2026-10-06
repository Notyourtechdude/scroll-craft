import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Trades resolution for frame rate. Every ~90 frames it compares the average
 * frame time with the 60fps budget and steps the pixel ratio down (or back up
 * once there is headroom), so weak GPUs stay smooth instead of stuttering at
 * full resolution.
 */
export function AdaptiveDpr({ min = 0.75 }: { min?: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const ceiling = useThree((s) => s.viewport.initialDpr);
  const acc = useRef({ time: 0, frames: 0, dpr: ceiling });

  useFrame((_, delta) => {
    const a = acc.current;
    // A resumed loop or a backgrounded tab reports one huge delta; ignore it.
    if (delta > 0.25) return;
    a.time += delta;
    a.frames++;
    if (a.frames < 90) return;
    const avg = a.time / a.frames;
    if (avg > 1 / 50 && a.dpr > min) {
      a.dpr = Math.max(min, a.dpr - 0.25);
      setDpr(a.dpr);
    } else if (avg < 1 / 58 && a.dpr < ceiling) {
      a.dpr = Math.min(ceiling, a.dpr + 0.25);
      setDpr(a.dpr);
    }
    a.time = 0;
    a.frames = 0;
  });

  return null;
}
