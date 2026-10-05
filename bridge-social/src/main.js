import './style.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { U, SP, zOf, WATER_Y } from './shared.js';
import { clamp, lerp, sstep, damp, isMobile } from './util.js';
import { CHAPTERS } from './content.js';
import { sampleLogo } from './logo.js';
import { createWorld } from './world.js';
import { createPost } from './post.js';
import { createAudio } from './audio.js';
import { buildUI } from './ui.js';
import { createAbout } from './stations/about.js';
import { createMarketing } from './stations/marketing.js';
import { createEvents } from './stations/events.js';
import { createFnb } from './stations/fnb.js';
import { createCorporate } from './stations/corporate.js';
import { createVip } from './stations/vip.js';
import { createLogoCloud, createGate } from './stations/finale.js';

const $ = (s) => document.getElementById(s);
const ldNum = $('ld-num'), ldBar = $('ld-bar'), ldEnter = $('ld-enter');
let loadPct = 0;
const setLoad = (v) => { loadPct = Math.max(loadPct, v); ldNum.textContent = Math.round(loadPct); ldBar.style.width = loadPct + '%'; };
const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// chapter keyframes: progress -> fractional chapter index (camera station along the bridge)
const KEYS = [[0, -0.5], [0.04, 0], [0.135, 1], [0.295, 2], [0.465, 3], [0.60, 4], [0.725, 5], [0.84, 6], [0.935, 6.85], [1, 7.0]];
function idxOf(p) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [p0, i0] = KEYS[i], [p1, i1] = KEYS[i + 1];
    if (p <= p1) { const t = clamp((p - p0) / (p1 - p0)); const e = lerp(t, t * t * (3 - 2 * t), 0.55); return lerp(i0, i1, e); }
  }
  return KEYS[KEYS.length - 1][1];
}
// per-chapter art direction, blended by fractional index
const FOG = ['#1a0613', '#220718', '#2a0820', '#2a0e12', '#2a1006', '#0a1424', '#241810', '#1c0611'].map((c) => new THREE.Color(c));
const FOGD = [0.0085, 0.0085, 0.0068, 0.0085, 0.0105, 0.0075, 0.0068, 0.0042];
const ACC = CHAPTERS.map((c) => new THREE.Color(c.accent || '#d4476f'));
const BLOOM = [.5, .55, .6, .62, .55, .55, .55, .45];

async function boot() {
  const canvas = $('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false }); }
  catch (e) { $('nogl').hidden = false; $('loader').remove(); return; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor('#0d0309');
  let dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 1.75);

  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#1a0613', 0.0085);
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 3200);
  const post = createPost(renderer, scene, camera);
  setLoad(6); await tick();

  const world = await createWorld(scene, renderer); setLoad(30); await tick();
  const logoPts = await sampleLogo(isMobile ? 4000 : 9000); setLoad(40); await tick();

  // ----- stations
  const SIDE = {}; CHAPTERS.forEach((c, i) => (SIDE[i] = c.side || 0));
  const defs = [
    null,
    { make: createAbout(), y: .5, look: 5.5 },
    { make: createMarketing(), y: 7, look: 7, face: true },
    { make: createEvents(logoPts), y: 9, look: 10 },
    { make: createFnb(), y: .5, look: 6.5, scale: 1.45 },
    { make: createCorporate(), y: .5, look: 8 },
    { make: createVip(), y: 7.5, look: 7.5 },
  ];
  const stations = defs.map((d, i) => {
    if (!d) return null;
    const g = d.make.group; g.position.set(SIDE[i] * 15, d.y, zOf(i) - 24); scene.add(g);
    return { ...d, g, i, update: d.make.update };
  });
  setLoad(62); await tick();

  // ----- logo clouds + gate
  const intro = createLogoCloud(logoPts, { size: 22, seed: 3, bright: .62 }); intro.points.position.set(0, 7.5, -6); scene.add(intro.points);
  const fin = createLogoCloud(logoPts, { size: 9, seed: 9, bright: .78, dot: 1.2, solid: true }); fin.points.position.set(0, 10.2, zOf(7) - 26); scene.add(fin.points);
  const gate = createGate(); gate.group.position.set(0, 0, zOf(7) - 30); scene.add(gate.group);
  setLoad(78); await tick();

  // ----- ui, scroll, audio
  const lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9, touchMultiplier: 1.4 });
  lenis.stop();
  const audio = createAudio();
  const target = (i) => { const c = CHAPTERS[i]; if (i === 0) return 0; if (i === CHAPTERS.length - 1) return 1; return c.range[0] + (c.range[1] - c.range[0]) * (c.items ? .24 : .3); };
  const goTo = (i) => { const k = clamp(i, 0, CHAPTERS.length - 1); lenis.scrollTo(target(k) * lenis.limit, { duration: 2.6, easing: (t) => 1 - Math.pow(1 - t, 4) }); };
  const ui = buildUI(lenis, goTo);
  $('brand').onclick = (e) => { e.preventDefault(); goTo(0); };

  // ----- sizing
  const resize = () => {
    const w = innerWidth, h = innerHeight; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); post.setSize(w, h, dpr);
  };
  resize(); addEventListener('resize', resize);

  // warm-up: render everything once so shaders compile behind the loader
  stations.forEach((s) => s && (s.g.visible = true)); camera.position.set(0, 4, 20); camera.lookAt(0, 4, -40);
  post.composer.render(); setLoad(94); await tick();
  stations.forEach((s) => s && (s.g.visible = false));
  setLoad(100);

  // ----- state
  const S = { p: 0, pT: 0, vel: 0, mx: 0, my: 0, mxT: 0, myT: 0, enter: 0, assemble: 0, started: false };
  const look = new THREE.Vector3(0, 4, -30), camPos = new THREE.Vector3(), tmp = new THREE.Vector3(), fp = new THREE.Vector3();
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const mouseNDC = new THREE.Vector2();
  lenis.on('scroll', ({ scroll, limit }) => { S.pT = limit > 0 ? clamp(scroll / limit) : 0; });

  addEventListener('pointermove', (e) => { S.mxT = (e.clientX / innerWidth) * 2 - 1; S.myT = -((e.clientY / innerHeight) * 2 - 1); mouseNDC.set(S.mxT, S.myT); curT.x = e.clientX; curT.y = e.clientY; });
  addEventListener('pointerdown', (e) => { if (!S.started || e.target.closest('a,button,#menu')) return; U.uPulse.value = 1; cursorEl.classList.add('down'); audio.chime([0, 7, 12, 16, 19][(Math.random() * 5) | 0], .06); });
  addEventListener('pointerup', () => cursorEl.classList.remove('down'));
  addEventListener('keydown', (e) => {
    if (!S.started) return; const cur = ui.cur ?? 0;
    const idx = chapterNow;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goTo(idx + 1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(idx - 1); }
    if (e.key === 'Home') goTo(0); if (e.key === 'End') goTo(CHAPTERS.length - 1);
  });
  let chapterNow = 0;

  // ----- cursor
  const cursorEl = $('cursor'), curT = { x: -100, y: -100 }, cur = { x: -100, y: -100 }, curLabel = cursorEl.querySelector('span');
  document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('[data-cursor],a,button'); cursorEl.classList.toggle('hov', !!t); curLabel.textContent = t?.dataset.cursor || ''; });

  // ----- sound ui
  const sndBtn = $('snd'), setSnd = async (v) => { await audio.enable(v); sndBtn.classList.toggle('on', audio.on); };
  sndBtn.onclick = () => setSnd(!audio.on);

  // ----- enter
  ldEnter.disabled = false; ldEnter.querySelector('span').textContent = 'Enter the experience';
  ldEnter.onclick = async () => {
    S.started = true; $('loader').classList.add('gone'); lenis.start(); lenis.scrollTo(0, { immediate: true });
    if ($('ld-sound').checked) setSnd(true);
    gsap.fromTo(S, { assemble: 0, enter: 0 }, { assemble: 1, enter: 1, duration: 4.2, ease: 'power3.out' });
    gsap.fromTo('#flash', { opacity: .9 }, { opacity: 0, duration: 2.2, ease: 'power2.out' });
  };
  // dev/test hook
  window.__bridge = { scene, post, goTo, lenis, S, ui, enter: () => ldEnter.click(), setP: (p) => { S.started = true; $('loader').classList.add('gone'); lenis.start(); S.assemble = 1; S.enter = 1; lenis.scrollTo(p * lenis.limit, { immediate: true }); } };

  // ----- frame loop
  const clock = new THREE.Clock(); let slow = 0, frames = 0;
  const fogC = new THREE.Color(), accC = new THREE.Color();
  const portrait = () => camera.aspect < 0.9;

  function frame() {
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime; window.__frames = (window.__frames || 0) + 1;
    lenis.raf(performance.now());
    U.uTime.value = time;
    const prev = S.p; S.p = damp(S.p, S.pT, 7, dt);
    S.vel = damp(S.vel, clamp((S.p - prev) / Math.max(dt, 1e-3) * 4, -1, 1), 8, dt);
    S.mx = damp(S.mx, S.mxT, 3, dt); S.my = damp(S.my, S.myT, 3, dt);
    U.uPulse.value = damp(U.uPulse.value, 0, 2.4, dt);
    U.uVel.value = S.vel;

    const idx = idxOf(S.p), fl = clamp(Math.floor(idx), 0, 6), fr = clamp(idx - fl, 0, 1), e = fr * fr * (3 - 2 * fr);
    const mixI = (arr) => lerp(arr[fl], arr[Math.min(fl + 1, arr.length - 1)], e);
    accC.copy(ACC[Math.max(0, fl)]).lerp(ACC[Math.min(fl + 1, ACC.length - 1)], e); U.uAccent.value.lerp(accC, .06);
    fogC.copy(FOG[fl]).lerp(FOG[Math.min(fl + 1, 7)], e);

    // camera rig
    const z = zOf(idx), enterOff = (1 - S.enter) * 18 * (idx < .3 ? 1 : 0);
    const calm = 1 - sstep(6.2, 6.9, idx);
    camPos.set(Math.sin(idx * 1.1) * 1.6 * calm + S.mx * .9, 3.5 + Math.sin(idx * .8) * .5 + S.my * .35 + Math.sin(time * .5) * .06, z + enterOff);
    camera.position.copy(camPos);
    const aheadY = 3.7 + S.my * .8;
    tmp.set(camPos.x * .2 + S.mx * 2.4, aheadY, z - 30 - Math.abs(S.vel) * 6);
    // intro: look at the logo, then release
    const wIntro = 1 - sstep(-.5, .02, idx); fp.set(0, 7.5, -6); tmp.lerp(fp, wIntro * .9);
    fp.set(0, 4.2, fin.points.position.z); tmp.lerp(fp, 1 - calm);
    // station focus
    let st = null;
    stations.forEach((s) => {
      if (!s) return; const d = Math.abs(idx - s.i), vis = d < 1.55; s.g.visible = vis;
      if (d < .6 + .01) st = s;
    });
    if (st) {
      const w = 1 - sstep(0, .6, Math.abs(idx - st.i));
      fp.set(st.g.position.x, st.look, st.g.position.z); tmp.lerp(fp, w * (portrait() ? .95 : .32));
    }
    look.lerp(tmp, 1 - Math.exp(-5 * dt)); camera.lookAt(look);
    camera.rotation.z += -S.mx * .012 + Math.sin(idx * 2.1) * .006;
    const fov = 55 + Math.abs(S.vel) * 9 + wIntro * 5 + (portrait() ? 8 : 0);
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    U.uScale.value = (innerHeight * dpr) / (2 * Math.tan((camera.fov * Math.PI / 180) / 2));
    U.uCam.value.copy(camera.position);

    // ui + stations
    const act = ui.update(S.p); chapterNow = act;
    stations.forEach((s) => {
      if (!s || !s.g.visible) return;
      const pn = ui.panels[s.i], local = pn.local ?? pn.t;
      s.g.scale.setScalar((s.scale || 1) * (portrait() ? .6 : 1));
      if (s.face) { const yaw = Math.atan2(camera.position.x - s.g.position.x, camera.position.z - s.g.position.z); s.g.rotation.y += (yaw * .8 - s.g.rotation.y) * .08; }
      s.update(local, { time, dt, idx, camera, mouse: S });
    });

    // logo clouds
    intro.uForm.value = S.assemble * (1 - sstep(-.35, .22, idx));
    fin.uForm.value = sstep(6.1, 6.95, idx);
    intro.points.visible = idx < .7; fin.points.visible = idx > 5.6;
    for (const [c, pos, zz] of [[intro, intro.points.position, -6], [fin, fin.points.position, fin.points.position.z]]) {
      if (!c.points.visible) continue;
      ray.setFromCamera(mouseNDC, camera); plane.constant = -zz; if (ray.ray.intersectPlane(plane, hit)) c.uMouse.value.set(hit.x - pos.x, hit.y - pos.y, 0);
    }
    // gate + sun
    gate.sunMat.uniforms.uK.value = sstep(5.6, 7.0, idx) * .18;
    gate.group.visible = idx > 5;

    // world + post
    const sun = sstep(6.0, 7.0, idx) * .22;
    world.update(camera, sun, mixI(FOGD), fogC);
    post.bloom.strength = mixI(BLOOM) + Math.abs(S.vel) * .25 + U.uPulse.value * .5 + sun * .2;
    post.fx.uniforms.uVel.value = S.vel;
    if (location.search.includes('raw')) renderer.render(scene, camera); else post.composer.render();
    audio.update(act, S.vel, idx);

    // cursor
    cur.x = damp(cur.x, curT.x, 16, dt); cur.y = damp(cur.y, curT.y, 16, dt);
    cursorEl.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;

    // adaptive quality
    frames++; if (dt > .026) slow++; else slow = Math.max(0, slow - .25);
    if (slow > 50 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); slow = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot().catch((e) => { console.error(e); const n = $('nogl'); if (n) n.hidden = false; });
