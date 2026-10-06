import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { gsap } from "@/lib/gsap";

const SIZE = 240;

interface FollowerState {
  hover: number;
  targetHover: number;
  visible: number;
  targetVisible: number;
  vx: number;
  vy: number;
  lastX: number;
  lastY: number;
}

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// A soft-edged blob that stretches along its own velocity and wobbles at the
// rim, drawn white and composited with mix-blend-mode: difference so it inverts
// whatever it passes over, in either theme.
const fragment = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform float uVisible;
uniform vec2 uVel;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float speed = clamp(length(uVel) / 45.0, 0.0, 1.0);
  vec2 dir = length(uVel) > 0.01 ? normalize(vec2(uVel.x, -uVel.y)) : vec2(1.0, 0.0);
  vec2 q = vec2(dot(p, dir), dot(p, vec2(-dir.y, dir.x)));
  q.x /= 1.0 + speed * 1.1;
  q.y *= 1.0 + speed * 0.45;
  float a = atan(q.y, q.x);
  float wobble = sin(a * 3.0 + uTime * 2.2) * 0.012 + sin(a * 5.0 - uTime * 3.1) * 0.008;
  float radius = mix(0.075, 0.36, uHover) + wobble * (1.0 + uHover * 2.0);
  float d = length(q) - radius;
  float alpha = (1.0 - smoothstep(-0.01, 0.015 + speed * 0.02, d)) * uVisible;
  gl_FragColor = vec4(vec3(alpha), alpha);
}`;

function Blob({ state, box }: { state: React.RefObject<FollowerState>; box: React.RefObject<HTMLDivElement | null> }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uVisible: { value: 0 },
      uVel: { value: new THREE.Vector2() },
    }),
    [],
  );

  useFrame((_, delta) => {
    const s = state.current;
    const el = box.current;
    // R3F copies uniforms into the material on mount; write to its copies.
    const u = material.current?.uniforms;
    if (!s || !el || !u) return;
    // Velocity of the eased position, not the raw pointer, so the stretch
    // settles together with the motion instead of snapping off.
    const x = Number(gsap.getProperty(el, "x"));
    const y = Number(gsap.getProperty(el, "y"));
    s.vx += (x - s.lastX - s.vx) * 0.35;
    s.vy += (y - s.lastY - s.vy) * 0.35;
    s.lastX = x;
    s.lastY = y;
    s.hover += (s.targetHover - s.hover) * 0.14;
    s.visible += (s.targetVisible - s.visible) * 0.12;
    u.uTime.value += Math.min(delta, 0.05);
    u.uHover.value = s.hover;
    u.uVisible.value = s.visible;
    u.uVel.value.set(s.vx, s.vy);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthTest={false} />
    </mesh>
  );
}

export default function CursorFollower() {
  const box = useRef<HTMLDivElement>(null);
  const state = useRef<FollowerState>({
    hover: 0,
    targetHover: 0,
    visible: 0,
    targetVisible: 0,
    vx: 0,
    vy: 0,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
    let placed = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const s = state.current;
      if (!placed) {
        // First sighting: appear where the pointer is, not glide in from 0,0.
        gsap.set(el, { x: e.clientX, y: e.clientY });
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        placed = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
      s.targetVisible = 1;
    };
    const onOver = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      state.current.targetHover = target?.closest("a, button, [data-cursor]") ? 1 : 0;
    };
    const onLeave = () => {
      state.current.targetVisible = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] mix-blend-difference"
      style={{ width: SIZE, height: SIZE, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" }}
        style={{ pointerEvents: "none" }}
      >
        <Blob state={state} box={box} />
      </Canvas>
    </div>
  );
}
