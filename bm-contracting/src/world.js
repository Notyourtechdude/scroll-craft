import * as THREE from 'three';
import { U, smoothstep as ss } from './env.js';
import { FLOORS } from './content.js';
import {
  SKY_VS, SKY_FS, TERRAIN_VS, TERRAIN_FS, BUILD_VS, BUILD_FS, FACADE_FS,
  PART_VS, PART_FS, REBAR_VS, REBAR_FS,
} from './shaders.js';

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const H = 1.1;           // floor height
const BASE = -1.3;       // top of foundation slab
const CX = [-5, -2.5, 0, 2.5, 5];
const CZ = [-3.75, -1.25, 1.25, 3.75];

function buildMaterial({ base, glow, edgeW = .035, rim = .6, win = 0, death = [9, 10] }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uBase: { value: new THREE.Color(base) },
      uGlow: { value: new THREE.Color(glow).multiplyScalar(1.4) },
      uEdgeW: { value: edgeW }, uRim: { value: rim }, uWin: { value: win },
      uDeath: { value: new THREE.Vector2(death[0], death[1]) },
    },
    vertexShader: BUILD_VS, fragmentShader: BUILD_FS,
  });
}

// Collects instances and turns them into one InstancedMesh with per-instance build timing.
class Batch {
  constructor() { this.items = []; }
  add(pos, scale, birth, dur, mode, col = [1, 1, 1], rot = 0, rnd = Math.random()) {
    this.items.push({ pos, scale, birth, dur, mode, col, rot, rnd });
  }
  mesh(geo, mat) {
    const n = this.items.length;
    const g = geo.clone();
    const aBirth = new Float32Array(n), aDur = new Float32Array(n), aMode = new Float32Array(n);
    const aCol = new Float32Array(n * 3), aRnd = new Float32Array(n);
    const m = new THREE.InstancedMesh(g, mat, n);
    const o = new THREE.Object3D();
    this.items.forEach((it, i) => {
      o.position.set(...it.pos); o.rotation.set(0, it.rot, 0); o.scale.set(...it.scale);
      o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      aBirth[i] = it.birth; aDur[i] = it.dur; aMode[i] = it.mode; aRnd[i] = it.rnd;
      aCol.set(it.col, i * 3);
    });
    g.setAttribute('aBirth', new THREE.InstancedBufferAttribute(aBirth, 1));
    g.setAttribute('aDur', new THREE.InstancedBufferAttribute(aDur, 1));
    g.setAttribute('aMode', new THREE.InstancedBufferAttribute(aMode, 1));
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(aRnd, 1));
    m.frustumCulled = false;
    return m;
  }
}

function latticeMast(w, h, segs) {
  const v = [];
  const s = h / segs, a = w / 2;
  const c = [[-a, -a], [a, -a], [a, a], [-a, a]];
  for (let i = 0; i < segs; i++) {
    const y0 = i * s, y1 = y0 + s;
    for (let k = 0; k < 4; k++) {
      const [x0, z0] = c[k], [x1, z1] = c[(k + 1) % 4];
      v.push(x0, y0, z0, x0, y1, z0);                       // post
      v.push(x0, y1, z0, x1, y1, z1);                       // ring
      if ((i + k) % 2) v.push(x0, y0, z0, x1, y1, z1); else v.push(x1, y0, z1, x0, y1, z0); // diagonal
    }
  }
  return new Float32Array(v);
}

function latticeJib(x0, x1, w, hgt, segs) {
  const v = [];
  const s = (x1 - x0) / segs;
  for (let i = 0; i < segs; i++) {
    const a = x0 + i * s, b = a + s, m = a + s / 2;
    v.push(a, 0, -w / 2, b, 0, -w / 2, a, 0, w / 2, b, 0, w / 2);        // bottom chords
    v.push(a, 0, -w / 2, a, 0, w / 2);                                   // cross
    v.push(a, 0, -w / 2, m, hgt, 0, m, hgt, 0, b, 0, -w / 2);            // zigzag
    v.push(a, 0, w / 2, m, hgt, 0, m, hgt, 0, b, 0, w / 2);
    v.push(a, hgt, 0, b, hgt, 0);                                        // top chord
  }
  return new Float32Array(v);
}

export function createWorld(scene, { mobile }) {
  const rand = rng(7);
  const group = new THREE.Group();
  scene.add(group);

  /* sky */
  const sky = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.ShaderMaterial({ uniforms: { ...U }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: false }),
  );
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  /* terrain */
  const tg = new THREE.PlaneGeometry(420, 420, mobile ? 220 : 340, mobile ? 220 : 340);
  tg.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(tg, new THREE.ShaderMaterial({ uniforms: { ...U }, vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS }));
  terrain.frustumCulled = false;
  group.add(terrain);

  /* structure: one instanced mesh, everything keyed to scroll progress */
  const box = new THREE.BoxGeometry(1, 1, 1);
  const S = new Batch();
  const steel = [.55, .62, .72], conc = [.75, .74, .72], dark = [.4, .4, .42];
  // foundation slab
  S.add([0, BASE - .5, 0], [12.8, 1, 9.8], .27, .06, 0, dark);
  for (let i = 0; i < FLOORS; i++) {
    const y = BASE + i * H;
    const b = .34 + (i / FLOORS) * .26;
    CX.forEach((x) => CZ.forEach((z) => S.add([x, y + H / 2, z], [.3, H, .3], b + rand() * .01, .03, 0, steel)));
    CZ.forEach((z) => S.add([0, y + H - .3, z], [11, .2, .16], b + .015, .035, 1, steel));
    CX.forEach((x) => S.add([x, y + H - .3, 0], [.16, .2, 8.6], b + .02, .035, 1, steel));
    S.add([0, y + H - .07, 0], [12, .14, 9], b + .025, .035, 1, conc);
  }
  // roof plant + antenna
  const top = BASE + FLOORS * H;
  S.add([-2.5, top + .6, -1], [3.2, 1.2, 2.6], .6, .03, 0, dark);
  S.add([2.6, top + .45, 1.2], [2.4, .9, 2], .61, .03, 0, dark);
  S.add([0, top + 3, 0], [.14, 6, .14], .62, .04, 0, steel);
  const structure = S.mesh(box, buildMaterial({ base: 0x8a96a8, glow: 0x4cc9ff, edgeW: .04, rim: .7 }));
  group.add(structure);

  /* facade glass: planes around each floor */
  const F = new Batch();
  for (let i = 0; i < FLOORS; i++) {
    const y = BASE + i * H + H / 2 - .02;
    const b = .34 + (i / FLOORS) * .26 + .09;
    for (let k = 0; k < 12; k++) {
      const x = -5.5 + k;
      F.add([x, y, 4.5], [.98, H * .86, 1], b + rand() * .03, .04, 1, [1, 1, 1], 0, rand());
      F.add([x, y, -4.5], [.98, H * .86, 1], b + rand() * .03, .04, 1, [1, 1, 1], Math.PI, rand());
    }
    for (let k = 0; k < 9; k++) {
      const z = -4 + k;
      F.add([6, y, z], [.98, H * .86, 1], b + rand() * .03, .04, 1, [1, 1, 1], Math.PI / 2, rand());
      F.add([-6, y, z], [.98, H * .86, 1], b + rand() * .03, .04, 1, [1, 1, 1], -Math.PI / 2, rand());
    }
  }
  const facadeMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uGlow: { value: new THREE.Color(0x4cc9ff).multiplyScalar(1.3) }, uEdgeW: { value: .03 }, uDeath: { value: new THREE.Vector2(9, 10) } },
    vertexShader: BUILD_VS, fragmentShader: FACADE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const facade = F.mesh(new THREE.PlaneGeometry(1, 1), facadeMat);
  facade.renderOrder = 2;
  group.add(facade);

  /* survey stakes */
  const ST = new Batch();
  for (let i = 0; i < 36; i++) {
    const t = i / 36, per = 2 * (18 + 14);
    let d = t * per, x, z;
    if (d < 18) { x = -9 + d; z = -7; } else if ((d -= 18) < 14) { x = 9; z = -7 + d; } else if ((d -= 14) < 18) { x = 9 - d; z = 7; } else { d -= 18; x = -9; z = 7 - d; }
    ST.add([x, -.1, z], [.12, 2.6, .12], .015 + t * .1, .03, 0, [1, 1, 1]);
    ST.add([x, 2.4, z], [.34, .34, .34], .03 + t * .1, .02, 1, [1, 1, 1]);
  }
  const stakes = ST.mesh(box, buildMaterial({ base: 0xffa31a, glow: 0xffb84a, edgeW: .05, rim: 1.2, death: [.27, .31] }));
  group.add(stakes);

  /* plot outline */
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[-9, .06, -7], [9, .06, -7], [9, .06, 7], [-9, .06, 7]].map((a) => new THREE.Vector3(...a))),
    new THREE.LineBasicMaterial({ color: new THREE.Color(0xffa31a).multiplyScalar(2.4), transparent: true, opacity: 0, fog: false }),
  );
  group.add(outline);

  /* rebar grid (reveals along x) */
  const rb = [];
  for (let z = -4.8; z <= 4.801; z += .6) rb.push(-6.4, 0, z, 6.4, 0, z);
  for (let x = -6.4; x <= 6.401; x += .6) rb.push(x, 0, -4.8, x, 0, 4.8);
  const rebarGeo = new THREE.BufferGeometry();
  rebarGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rb), 3));
  const rebarMat = new THREE.ShaderMaterial({
    uniforms: { uR: { value: 0 }, uCol: { value: new THREE.Color(0xffa31a).multiplyScalar(1.4) }, uFade: { value: 1 } },
    vertexShader: REBAR_VS, fragmentShader: REBAR_FS, transparent: true,
  });
  const rebar = new THREE.LineSegments(rebarGeo, rebarMat);
  rebar.position.y = BASE + .02;
  rebar.frustumCulled = false;
  group.add(rebar);

  /* city: rises in a ripple as the project completes */
  const C = new Batch();
  const cityN = mobile ? 380 : 900;
  for (let i = 0; i < cityN; i++) {
    const r = 32 + Math.pow(rand(), .8) * 95, a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 3 + Math.pow(rand(), 2.4) * 46 * (1 - r / 190);
    const w = 2 + rand() * 4.5, d = 2 + rand() * 4.5;
    const c = .45 + rand() * .3;
    C.add([x, -3 + (h + 3) / 2, z], [w, h + 3, d], .7 + ((r - 32) / 95) * .16 + rand() * .02, .06, 0, [c * .9, c, c * 1.1], rand() * Math.PI, rand());
  }
  const city = C.mesh(box, buildMaterial({ base: 0x56637a, glow: 0x4cc9ff, edgeW: .03, rim: .4, win: 1 }));
  group.add(city);

  /* tower crane */
  const crane = new THREE.Group();
  crane.position.set(9.6, 0, -6.4);
  const craneMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xffa31a).multiplyScalar(1.8), transparent: true, opacity: .95, fog: false });
  const MAST = 27;
  const mast = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(latticeMast(.9, MAST, 27), 3)), craneMat);
  crane.add(mast);
  const jibPivot = new THREE.Group(); crane.add(jibPivot);
  const jib = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(latticeJib(-6, 19, .8, 1.1, 25), 3)), craneMat);
  jibPivot.add(jib);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1), new THREE.MeshBasicMaterial({ color: 0x2a2f3a }));
  cw.position.set(-5, -.2, 0); jibPivot.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(.9, .8, .8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa31a).multiplyScalar(1.3) }));
  cab.position.set(.4, -.7, .8); jibPivot.add(cab);
  const trolley = new THREE.Group(); jibPivot.add(trolley);
  const cableGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: .8, fog: false }));
  cable.frustumCulled = false; trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa31a).multiplyScalar(1.6) }));
  trolley.add(hook);
  const load = new THREE.Mesh(new THREE.BoxGeometry(3.2, .22, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4cc9ff).multiplyScalar(1.3) }));
  trolley.add(load);
  group.add(crane);

  // beacon on the antenna
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(4) }));
  beacon.position.set(0, top + 6.1, 0); group.add(beacon);

  /* particles */
  const N = mobile ? 1800 : 4200;
  const pp = new Float32Array(N * 3), ps = new Float32Array(N), pz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = (rand() - .5) * 140; pp[i * 3 + 1] = rand() * 60 - 5; pp[i * 3 + 2] = (rand() - .5) * 140;
    ps[i] = rand(); pz[i] = .6 + rand() * 1.6;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(ps, 1));
  pg.setAttribute('aSize', new THREE.BufferAttribute(pz, 1));
  const partMat = new THREE.ShaderMaterial({
    uniforms: {
      ...U, uPix: { value: 1 }, uVel: { value: 0 },
      uRO: { value: new THREE.Vector3() }, uRD: { value: new THREE.Vector3(0, 0, -1) }, uCenter: { value: new THREE.Vector3() },
      uColA: { value: new THREE.Color(0x7fd8ff) }, uColB: { value: new THREE.Color(0xffa31a) },
    },
    vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(pg, partMat);
  particles.frustumCulled = false;
  group.add(particles);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  return {
    top,
    setPixelRatio(r) { partMat.uniforms.uPix.value = r; },
    update(p, time, vel, mouse, camera) {
      sky.position.copy(camera.position);
      // survey outline
      outline.material.opacity = ss(.06, .12, p) * (1 - ss(.27, .31, p));
      // rebar
      rebarMat.uniforms.uR.value = ss(.29, .37, p);
      rebarMat.uniforms.uFade.value = 1 - ss(.5, .56, p) * .85;
      // crane
      const grow = ss(.3, .4, p) * (1 - ss(.8, .88, p));
      crane.visible = grow > .001;
      mast.scale.y = Math.max(grow, .0001);
      jibPivot.position.y = MAST * grow;
      jibPivot.scale.setScalar(Math.max(ss(.34, .42, p) * (1 - ss(.78, .84, p)), .0001));
      jibPivot.rotation.y = 2.4 + p * 14 + Math.sin(time * .3) * .1;
      const tx = 8 + Math.sin(time * .5 + p * 20) * 4 + p * 6;
      trolley.position.set(tx, 0, 0);
      const drop = 6 + (MAST * grow - (top * ss(.34, .6, p) + 3)) * (.5 + .5 * Math.sin(p * 40));
      const len = THREE.MathUtils.clamp(drop, 3, MAST * grow - 1);
      cableGeo.attributes.position.setXYZ(1, 0, -len, 0); cableGeo.attributes.position.needsUpdate = true;
      hook.position.y = -len;
      load.position.y = -len - .3;
      load.visible = p > .36 && p < .62;
      // beacon blink
      beacon.visible = p > .62;
      beacon.scale.setScalar(.7 + .6 * (Math.sin(time * 4) > 0 ? 1 : 0));
      // particles
      partMat.uniforms.uVel.value = vel;
      partMat.uniforms.uCenter.value.copy(camera.position);
      ndc.set(mouse.x, mouse.y);
      ray.setFromCamera(ndc, camera);
      partMat.uniforms.uRO.value.copy(ray.ray.origin);
      partMat.uniforms.uRD.value.copy(ray.ray.direction);
      partMat.uniforms.uColA.value.set(0x7fd8ff).lerp(new THREE.Color(0xffffff), U.uDay.value * .8);
    },
  };
}
