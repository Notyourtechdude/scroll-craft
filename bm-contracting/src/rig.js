import * as THREE from 'three';

// [progress, camera position, look-at target]
const KEYS = [
  [0.00, [0, 7, 40], [0, 4, 0]],
  [0.07, [-9, 6, 30], [0, 2, 0]],
  [0.14, [-18, 10, 18], [0, 0, 0]],
  [0.21, [4, 26, 12], [0, -1, 0]],
  [0.28, [10, 3.5, 13], [0, -2, 0]],
  [0.34, [-11, 1.5, 11], [0, 1, 0]],
  [0.42, [-13, 5, 9], [0, 4, 0]],
  [0.50, [13, 9, 8], [0, 9, 0]],
  [0.58, [7, 19, 15], [0, 12, 0]],
  [0.66, [-7, 14, 19], [0, 10, 0]],
  [0.73, [-17, 10, 7], [0, 10, 0]],
  [0.80, [-10, 15, -15], [0, 9, 0]],
  [0.87, [9, 20, -24], [0, 10, 0]],
  [0.93, [0, 28, 34], [0, 9, 0]],
  [1.00, [0, 15, 38], [0, 10, 0]],
].map(([p, c, t]) => ({ p, c: new THREE.Vector3(...c), t: new THREE.Vector3(...t) }));

const cr = (a, b, c, d, u, out) => {
  const u2 = u * u, u3 = u2 * u;
  for (const k of ['x', 'y', 'z']) {
    out[k] = .5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3);
  }
  return out;
};

export function sampleRig(p, outPos, outTgt) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const k1 = KEYS[i], k2 = KEYS[i + 1];
  const k0 = KEYS[Math.max(i - 1, 0)], k3 = KEYS[Math.min(i + 2, KEYS.length - 1)];
  const u = THREE.MathUtils.clamp((p - k1.p) / (k2.p - k1.p), 0, 1);
  cr(k0.c, k1.c, k2.c, k3.c, u, outPos);
  cr(k0.t, k1.t, k2.t, k3.t, u, outTgt);
}
