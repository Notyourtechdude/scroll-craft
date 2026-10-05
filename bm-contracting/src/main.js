import * as THREE from 'three';
import './style.css';
import { createWorld } from './world.js';
import { applyEnvironment, U, smoothstep } from './env.js';
import { sampleRig } from './rig.js';
import { createPost } from './post.js';
import { createUI, createCursor } from './ui.js';
import { createAudio } from './audio.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#gl');
const mobile = matchMedia('(max-width: 800px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  $('#nogl').hidden = false; $('#loader').remove();
  throw e;
}
const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.NoToneMapping; // OutputPass tone-maps

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, .1, 700);
const world = createWorld(scene, { mobile });
const post = createPost(renderer, scene, camera, { mobile });
const audio = createAudio();

const state = { p: 0, target: 0, vel: 0, t0: 0, fixedT: null, unlocked: false, sfx: false, started: false, mx: 0, my: 0, smx: 0, smy: 0 };
const ui = createUI({
  onJump: (p) => scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' }),
  onSoundToggle: () => audio.toggle(),
});
const cursor = createCursor();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  post.setSize(w, h, DPR);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  world.setPixelRatio(DPR);
}
addEventListener('resize', resize);
resize();

const readScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (state.started && !state.unlocked) { state.target = 0; return; }
  state.target = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
};
addEventListener('scroll', readScroll, { passive: true });
addEventListener('pointermove', (e) => {
  state.mx = (e.clientX / innerWidth) * 2 - 1;
  state.my = -((e.clientY / innerHeight) * 2 - 1);
});
// device tilt as the "mouse" on phones
addEventListener('deviceorientation', (e) => {
  if (!mobile || e.gamma == null) return;
  state.mx = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
  state.my = THREE.MathUtils.clamp(-(e.beta - 45) / 30, -1, 1);
});
readScroll();
// allow ?p=0.5 for deep links / testing, ?introT=3.7 to freeze the intro at a moment
if (new URLSearchParams(location.search).has('introT')) state.fixedT = parseFloat(new URLSearchParams(location.search).get('introT'));
const q = new URLSearchParams(location.search);
if (q.has('p')) {
  const v = parseFloat(q.get('p'));
  state.p = state.target = v; state.fixedT = 99; state.unlocked = true;
  requestAnimationFrame(() => scrollTo(0, v * (document.documentElement.scrollHeight - innerHeight)));
}

const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
const introStart = new THREE.Vector3(0, 175, 16), yAxis = new THREE.Vector3(0, 1, 0);
const iv = $('#intro'), tkA = $('#tkA'), tkB = $('#tkB');
const timer = { last: performance.now(), t: 0 };
let lastCh = -1;

function frame() {
  const now = performance.now();
  const dt = Math.min((now - timer.last) / 1000, .05);
  timer.last = now; timer.t += dt;
  const time = timer.t;
  const k = reduced ? 1 - Math.exp(-dt * 12) : 1 - Math.exp(-dt * 4.2);
  const prev = state.p;
  state.p += (state.target - state.p) * k;
  const rawVel = (state.p - prev) / Math.max(dt, 1e-3);
  state.vel += (rawVel * 1.1 - state.vel) * (1 - Math.exp(-dt * 8));
  const vel = reduced ? 0 : THREE.MathUtils.clamp(state.vel, -1.2, 1.2);
  state.smx += (state.mx - state.smx) * (1 - Math.exp(-dt * 3));
  state.smy += (state.my - state.smy) * (1 - Math.exp(-dt * 3));

  // ---- cinematic intro clock (seconds since "Enter"); 99 = finished
  const T = !state.started ? 0 : state.fixedT ?? (reduced ? 99 : (now - state.t0) / 1000);
  const DUR = 5.6, HIT = 3.55;
  const u = state.started ? Math.min(T / DUR, 1) : 0;
  const e = 1 - Math.pow(1 - u, 2.6);
  const inv = 1 - e;
  const tI = T - HIT;
  const imp = state.started && tI > 0 ? Math.exp(-tI * 2.1) : 0;
  const flash = state.started && tI > 0 ? Math.exp(-tI * 6.5) : 0;
  const preFlash = state.started ? Math.max(0, 1 - Math.abs(T - (HIT - .04)) * 40) * .6 : 0;
  const introK = !state.started ? 0 : smoothstep(HIT - .05, HIT + 2.1, T);

  const p = Math.min(Math.max(state.p, 0), 1);
  applyEnvironment(p, time);
  U.uScanR.value = Math.max(U.uScanR.value, state.started ? Math.min(Math.max(tI, 0) * 48, 130) : 0);

  sampleRig(p, pos, tgt);
  const far = mobile ? 1.22 : 1;
  const camP = new THREE.Vector3(pos.x * far, pos.y, pos.z * far);
  if (inv > 0) {
    const rel = camP.sub(tgt).lerp(introStart, inv);
    rel.applyAxisAngle(yAxis, inv * inv * 2.1);
    camP.copy(rel).add(tgt);
  }
  camera.position.copy(camP);
  // mouse parallax + a little handheld drift
  camera.position.x += state.smx * 1.8 + Math.sin(time * .31) * .12 + (Math.random() - .5) * imp * 1.1;
  camera.position.y += state.smy * 1.1 + Math.cos(time * .27) * .1 + (Math.random() - .5) * imp * 1.1;
  camera.lookAt(tgt);
  camera.rotateZ(vel * .035 + state.smx * -.012 + inv * inv * .55 + (Math.random() - .5) * imp * .02);
  const fov = (mobile ? 62 : 50) + Math.abs(vel) * 7 + inv * inv * 52 + imp * 9;
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const vfx = THREE.MathUtils.clamp(vel + inv * inv * 1.1 + imp * .5, -1.3, 1.3);

  // overlay: letterbox, reticle, brackets, ticker, flash
  if (state.started && T < 7) {
    const bar = 15 * (1 - smoothstep(4.4, 5.8, T));
    iv.style.setProperty('--bar', bar + 'vh');
    iv.style.setProperty('--retO', (smoothstep(.5, 1.2, T) * (1 - smoothstep(HIT - .02, HIT + .35, T))).toFixed(3));
    iv.style.setProperty('--retS', (tI > 0 ? 1 + tI * 9 : 3.2 - 2.5 * Math.min(T / HIT, 1)).toFixed(3));
    iv.style.setProperty('--ret', Math.min(T / HIT, 1).toFixed(3));
    iv.style.setProperty('--br', (smoothstep(.3, 1, T) * (1 - smoothstep(4.4, 5.2, T))).toFixed(3));
    iv.style.setProperty('--tk', (smoothstep(.4, 1, T) * (1 - smoothstep(4.6, 5.4, T))).toFixed(3));
    iv.style.setProperty('--fl', Math.min(1, flash + preFlash).toFixed(3));
    const alt = Math.round(inv * 480);
    tkA.textContent = T < 1 ? 'Acquiring site' : tI < 0 ? 'Descending · altitude' : 'Ground lock · breaking ground';
    tkB.textContent = tI < 0 ? (T < 1 ? '' : alt + ' m') : '00 m';
    document.body.classList.toggle('hud-on', T > 4.7);
  } else if (state.started && iv.isConnected) {
    iv.remove();
    document.body.classList.add('hud-on');
  }
  if (state.started && !state.unlocked && T > 5.2) { state.unlocked = true; document.body.classList.remove('is-loading'); readScroll(); }
  if (state.started) world.setIntro(T);
  if (state.started && !state.sfx && T >= 0) { state.sfx = true; audio.intro(); }

  world.update(p, time, vfx, { x: state.smx, y: state.smy }, camera);
  post.update(time, vfx, state.started ? Math.min(T / .9, 1) : 0, 1 + Math.abs(vfx) * .6 - U.uDay.value * .35 + imp * 1.3, Math.min(1, flash + preFlash) * .9, imp);
  post.composer.render(dt);

  ui.update(p, camera.position, (c) => { if (lastCh !== -1) audio.clank(520 + c * 90); lastCh = c; }, introK);
  audio.update(p, vel);
  document.body.style.setProperty('--vel', Math.abs(vel).toFixed(3));
  requestAnimationFrame(frame);
}

/* loader: compile shaders behind the loading screen, then wait for the user to enter */
const ldNum = $('#ldNum'), ldStatus = $('#ldStatus'), enter = $('#enter');
const steps = ['Initialising survey', 'Staking the plot', 'Pouring foundations', 'Raising steel', 'Glazing the facade', 'Ready'];
let shown = 0;
requestAnimationFrame(() => {
  post.update(0, 0, 0, 1);
  applyEnvironment(0, 0);
  post.composer.render(0); // warm up programs
  const t0 = performance.now();
  (function tick() {
    const t = Math.min((performance.now() - t0) / (q.has('p') ? 100 : 1900), 1);
    shown = Math.round(t * 100);
    ldNum.textContent = shown;
    ldStatus.textContent = steps[Math.min(Math.floor(t * steps.length), steps.length - 1)];
    $('.ld-mark').style.setProperty('--k', t);
    if (t < 1) return requestAnimationFrame(tick);
    enter.disabled = false; $('#enterSound').disabled = false;
    enter.focus({ preventScroll: true });
    if (q.has('p')) enter.click();
  })();
  frame();
});

function begin(withSound) {
  if (state.started) return;
  if (withSound) { audio.toggle(); $('#sound').setAttribute('aria-pressed', true); $('#sound i').textContent = 'on'; }
  state.started = true;
  state.t0 = performance.now();
  scrollTo(0, 0);
  document.body.classList.add('is-live');
  $('#loader').classList.add('gone');
  setTimeout(() => $('#loader')?.remove(), 1400);
  if (q.has('p')) { document.body.classList.remove('is-loading'); document.body.classList.add('hud-on'); }
}
enter.addEventListener('click', () => begin(false));
$('#enterSound').addEventListener('click', () => begin(true));

// debug hook
window.__bm = { state };
