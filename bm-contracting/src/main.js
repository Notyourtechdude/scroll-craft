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

const state = { p: 0, target: 0, vel: 0, intro: 0, started: false, mx: 0, my: 0, smx: 0, smy: 0 };
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
// allow ?p=0.5 for deep links / testing
const q = new URLSearchParams(location.search);
if (q.has('p')) {
  const v = parseFloat(q.get('p'));
  state.p = state.target = v; state.intro = 1;
  requestAnimationFrame(() => scrollTo(0, v * (document.documentElement.scrollHeight - innerHeight)));
}

const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
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

  if (state.started && state.intro < 1) state.intro = Math.min(state.intro + dt / 3.2, 1);
  const intro = 1 - Math.pow(1 - state.intro, 3);

  const p = Math.min(Math.max(state.p, 0), 1);
  applyEnvironment(p, time);

  sampleRig(p, pos, tgt);
  const far = mobile ? 1.22 : 1;
  const dolly = (1 - intro) * 1;
  camera.position.set(pos.x * far, pos.y + dolly * 14, pos.z * far + dolly * 34);
  // mouse parallax + a little handheld drift
  camera.position.x += state.smx * 1.8 + Math.sin(time * .31) * .12;
  camera.position.y += state.smy * 1.1 + Math.cos(time * .27) * .1;
  camera.lookAt(tgt);
  camera.rotateZ(vel * .035 + state.smx * -.012);
  const fov = (mobile ? 62 : 50) + Math.abs(vel) * 7 + (1 - intro) * 12;
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }

  world.update(p, time, vel, { x: state.smx, y: state.smy }, camera);
  post.update(time, vel, state.started ? Math.min(state.intro * 3, 1) : 0, 1 + Math.abs(vel) * .6 - U.uDay.value * .35);
  post.composer.render(dt);

  ui.update(p, camera.position, (c) => { if (lastCh !== -1) audio.clank(520 + c * 90); lastCh = c; });
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
    enter.disabled = false;
    enter.focus({ preventScroll: true });
    if (q.has('p')) enter.click();
  })();
  frame();
});

enter.addEventListener('click', () => {
  state.started = true;
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-live');
  $('#loader').classList.add('gone');
  setTimeout(() => $('#loader').remove(), 1400);
  if (!reduced) audio.clank(330);
});

// debug hook
window.__bm = { state };
