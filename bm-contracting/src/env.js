import * as THREE from 'three';

// Shared uniforms: every material references these same objects, so one
// update per frame re-lights the whole world.
export const U = {
  uP: { value: 0 },
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-.5, .2, -.85) },
  uSunCol: { value: new THREE.Color() },
  uAmb: { value: new THREE.Color() },
  uFogCol: { value: new THREE.Color() },
  uFogDen: { value: 0.0105 },
  uTop: { value: new THREE.Color() },
  uHor: { value: new THREE.Color() },
  uDay: { value: 0 },
  uNight: { value: 1 },
  uLights: { value: 0 },
  uExc: { value: 0 },
  uScanR: { value: 0 },
  uHot: { value: new THREE.Color(0xffa31a).multiplyScalar(1.7) },
  uCyan: { value: new THREE.Color(0x4cc9ff).multiplyScalar(1.1) },
};

// Time of day keyed to scroll progress: blueprint night -> day -> golden dusk -> lit night.
const K = [
  { p: 0.00, top: '#01030a', hor: '#07142b', amb: '#16233d', sun: '#000000', elev: -.2, fog: '#050c1b' },
  { p: 0.20, top: '#040c1c', hor: '#0d2a4d', amb: '#22385c', sun: '#243b66', elev: -.05, fog: '#08162b' },
  { p: 0.36, top: '#14406f', hor: '#6fa3cf', amb: '#6a8cb0', sun: '#ffe3b0', elev: .35, fog: '#5a86ad' },
  { p: 0.55, top: '#2468a8', hor: '#a9cbe3', amb: '#8aa9c4', sun: '#fff2d8', elev: .8, fog: '#9bbcd4' },
  { p: 0.70, top: '#2a5688', hor: '#e6c9a0', amb: '#98a0b2', sun: '#ffd9a0', elev: .45, fog: '#c9b79c' },
  { p: 0.82, top: '#2a2250', hor: '#ff8a4a', amb: '#7b6078', sun: '#ff9a50', elev: .08, fog: '#a8603f' },
  { p: 0.92, top: '#0a0a24', hor: '#46264d', amb: '#322f55', sun: '#6a3a60', elev: -.06, fog: '#2a1735' },
  { p: 1.00, top: '#03030c', hor: '#150f2c', amb: '#1d1d42', sun: '#1a1a40', elev: -.15, fog: '#0b0820' },
].map((k) => ({
  ...k,
  top: new THREE.Color(k.top), hor: new THREE.Color(k.hor), amb: new THREE.Color(k.amb),
  sun: new THREE.Color(k.sun), fog: new THREE.Color(k.fog),
}));

const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
export { ss as smoothstep };

export function applyEnvironment(p, time) {
  let i = 0;
  while (i < K.length - 2 && p > K[i + 1].p) i++;
  const a = K[i], b = K[i + 1];
  const t = ss(0, 1, THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1));
  U.uTop.value.copy(a.top).lerp(b.top, t);
  U.uHor.value.copy(a.hor).lerp(b.hor, t);
  U.uAmb.value.copy(a.amb).lerp(b.amb, t);
  U.uSunCol.value.copy(a.sun).lerp(b.sun, t).multiplyScalar(1.05);
  U.uFogCol.value.copy(a.fog).lerp(b.fog, t);
  const elev = a.elev + (b.elev - a.elev) * t;
  U.uSunDir.value.set(-.5, elev, -.85).normalize();
  U.uDay.value = THREE.MathUtils.clamp(elev * 2.2 + .15, 0, 1);
  U.uNight.value = 1 - ss(-.1, .2, elev);
  U.uLights.value = ss(.76, .9, p);
  U.uExc.value = ss(.12, .26, p);
  U.uScanR.value = ss(.0, .2, p) * 130;
  U.uP.value = p;
  U.uTime.value = time;
}
