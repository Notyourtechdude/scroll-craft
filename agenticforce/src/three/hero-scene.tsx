import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { AdaptiveDpr } from "@/three/adaptive-dpr";
import { simplex3 } from "@/three/noise";

export interface HeroSceneProps {
  /** 0 at rest, 1 when the hero has handed over to the gallery. Mutated by GSAP. */
  progress: { value: number };
  /** False once the hero is covered, which stops the render loop entirely. */
  active: boolean;
  reduced: boolean;
  theme: "dark" | "light";
}

const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}

const blobVertex = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform vec2 uMouse;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vNoise;
${simplex3}
void main() {
  vec3 p = position;
  float t = uTime * 0.22;
  float freq = 0.95 + uProgress * 0.7;
  float amp = 0.2 + uProgress * 0.16;
  float n = snoise(p * freq + vec3(t, t * 0.7, -t) + vec3(uMouse * 0.55, 0.0));
  float detail = snoise(p * freq * 2.6 - t * 1.3) * 0.3;
  vNoise = n;
  p += normal * (n + detail) * amp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPos = mv.xyz;
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const blobFragment = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform vec3 uBase;
uniform float uLight;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vNoise;

vec3 palette(float t) {
  // Cyan to violet to warm white, tuned to the site's single accent.
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.9, 0.8, 0.7) * t + vec3(0.52, 0.62, 0.72)));
}

void main() {
  // Normals from screen-space derivatives follow the displaced surface, which
  // the undisplaced vertex normal does not.
  vec3 faceted = normalize(cross(dFdx(vPos), dFdy(vPos)));
  vec3 n = normalize(mix(vNormal, faceted, 0.3));
  float fres = pow(1.0 - clamp(dot(n, vView), 0.0, 1.0), 2.2);
  vec3 irid = palette(vNoise * 0.45 + fres * 0.8 + uTime * 0.025 + uProgress * 0.3);
  vec3 col = mix(uBase, irid, 0.18 + fres * 0.82);
  float spec = pow(max(dot(reflect(-normalize(vec3(-0.4, 0.6, 0.7)), n), vView), 0.0), 24.0);
  col += spec * mix(0.55, 0.25, uLight);
  gl_FragColor = vec4(col, 1.0);
}`;

function Blob({ progress, detail, reduced, theme }: Omit<HeroSceneProps, "active"> & { detail: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2());
  // Portrait screens get a smaller form lifted above the headline, so the copy
  // never sits on top of the brightest part of it.
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  const fit = aspect < 1 ? Math.max(0.55, aspect * 1.05) : 1;
  const lift = aspect < 1 ? 0.75 : 0;
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uBase: { value: new THREE.Color() },
      uLight: { value: 0 },
    }),
    [],
  );

  // R3F copies each uniform into the material on mount, so live values are
  // written through the material itself rather than the object passed in.
  useEffect(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uBase.value.set(theme === "dark" ? "#0e1018" : "#e9edf5");
    u.uLight.value = theme === "light" ? 1 : 0;
  }, [theme]);

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const dt = Math.min(delta, 0.05);
    if (!reduced) u.uTime.value += dt;
    mouse.current.x += (pointer.x - mouse.current.x) * 0.06;
    mouse.current.y += (pointer.y - mouse.current.y) * 0.06;
    u.uMouse.value.copy(mouse.current);
    u.uProgress.value = progress.value;
    const m = mesh.current;
    if (!m) return;
    const p = progress.value;
    m.rotation.y += reduced ? 0 : dt * 0.08;
    m.rotation.x = mouse.current.y * 0.25 + p * 0.8;
    m.rotation.z = mouse.current.x * -0.15;
    m.position.x = mouse.current.x * 0.12;
    m.position.y = lift * (1 - p);
    m.scale.setScalar(fit * (1 + p * 1.1));
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.25, detail]} />
      <shaderMaterial ref={material} vertexShader={blobVertex} fragmentShader={blobFragment} uniforms={uniforms} />
    </mesh>
  );
}

/** Soft round sprite so points read as specks of light, not square pixels. */
function useDotTexture() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d");
    if (x) {
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Dust({ count, progress, reduced, theme }: { count: number; progress: { value: number }; reduced: boolean; theme: "dark" | "light" }) {
  const points = useRef<THREE.Points>(null);
  const dot = useDotTexture();
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const p = points.current;
    if (!p) return;
    if (!reduced) p.rotation.y += Math.min(delta, 0.05) * 0.03;
    p.rotation.x = progress.value * 0.6;
    state.camera.position.z = 4.4 - progress.value * 1.5;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={dot}
        size={0.045}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={theme === "dark" ? 0.55 : 0.4}
        color={theme === "dark" ? "#bfeff5" : "#3a4a66"}
      />
    </points>
  );
}

export default function HeroScene({ progress, active, reduced, theme }: HeroSceneProps) {
  // Geometry and particle budget scale with the screen: a phone gets roughly a
  // quarter of the triangles, which keeps it inside the 16ms frame budget.
  const small = useMemo(() => window.matchMedia("(max-width: 767px)").matches, []);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, small ? 1.25 : 1.5]}
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      gl={{ antialias: !small, alpha: true, powerPreference: "high-performance", stencil: false }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Blob progress={progress} detail={small ? 28 : 40} reduced={reduced} theme={theme} />
      <Dust count={small ? 350 : 900} progress={progress} reduced={reduced} theme={theme} />
      <AdaptiveDpr />
    </Canvas>
  );
}
