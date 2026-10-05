import * as THREE from 'three';
import { U, additive, CREAM } from '../shared.js';
import { CHAPTERS } from '../content.js';
import { sstep, lerp } from '../util.js';

function cardTex(i, title, accent) {
  const W = 640, H = 400, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5c0a33'); g.addColorStop(1, '#12040b');
  x.fillStyle = g; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 26); x.fill();
  x.save(); x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 26); x.clip();
  x.strokeStyle = accent; x.fillStyle = accent; x.lineWidth = 2; x.globalAlpha = .55;
  const k = i % 6, cx = 430, cy = 200;
  if (k === 0) for (let r = 20; r < 220; r += 26) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); }
  if (k === 1) for (let b = 0; b < 9; b++) x.fillRect(250 + b * 40, 360 - (30 + ((b * 53 + i * 31) % 190)), 26, 30 + ((b * 53 + i * 31) % 190));
  if (k === 2) for (let w = 0; w < 5; w++) { x.beginPath(); for (let px = 220; px < 640; px += 6) { const py = 200 + Math.sin(px * .03 + w) * (30 + w * 14); px === 220 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke(); }
  if (k === 3) for (let a = 0; a < 9; a++) for (let b = 0; b < 6; b++) { x.beginPath(); x.arc(260 + a * 44, 70 + b * 56, 3 + ((a * b + i) % 4), 0, 7); x.fill(); }
  if (k === 4) for (let d = -400; d < 640; d += 22) { x.beginPath(); x.moveTo(d + 260, 400); x.lineTo(d + 660, 0); x.stroke(); }
  if (k === 5) for (let a = 0; a < 36; a++) { const an = a / 36 * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(an) * 40, cy + Math.sin(an) * 40); x.lineTo(cx + Math.cos(an) * 220, cy + Math.sin(an) * 220); x.stroke(); }
  x.restore();
  x.globalAlpha = 1; x.strokeStyle = 'rgba(234,217,176,.5)'; x.lineWidth = 2; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 26); x.stroke();
  x.fillStyle = '#ead9b0'; x.font = '300 150px "Cormorant Garamond", serif'; x.textBaseline = 'alphabetic';
  x.fillText(String(i + 1).padStart(2, '0'), 44, 170);
  x.font = '500 34px "Space Grotesk Variable", sans-serif'; x.fillText(title.toUpperCase(), 44, 330);
  x.font = '400 18px "Space Grotesk Variable", sans-serif'; x.fillStyle = 'rgba(234,217,176,.6)'; x.fillText('BRIDGE SOCIAL · MARKETING', 44, 365);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createMarketing() {
  const ch = CHAPTERS.find((c) => c.id === 'marketing'), N = ch.cards.length;
  const g = new THREE.Group(); g.userData.focusY = 5;
  const core = new THREE.Group(); g.add(core);
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4f8b').multiplyScalar(1.8), wireframe: true, transparent: true, opacity: .8 }));
  const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 3), new THREE.MeshStandardMaterial({ color: '#2a0618', metalness: .9, roughness: .15, envMapIntensity: 1.8 }));
  core.add(ico, inner);
  // expanding broadcast rings
  const rings = []; const rg = new THREE.RingGeometry(.96, 1, 96);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7aa8').multiplyScalar(1.6), transparent: true, depthWrite: false, side: THREE.DoubleSide })); core.add(m); rings.push(m); }
  const cards = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.75), new THREE.MeshBasicMaterial({ map: cardTex(i, ch.cards[i], '#ff8fb5'), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    g.add(m); cards.push(m);
  }
  // orbiting data motes
  const n = 500, pp = new Float32Array(n * 3), rr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { pp.set([Math.random(), Math.random(), Math.random()], i * 3); rr.set([Math.random(), Math.random()], i * 2); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aR', new THREE.BufferAttribute(rr, 2));
  const motes = new THREE.Points(pg, new THREE.ShaderMaterial(additive({
    uniforms: U,
    vertexShader: `uniform float uTime,uScale; attribute vec2 aR; varying float vA;
      void main(){ float a=position.x*6.283+uTime*(.1+aR.x*.25); float r=6.+position.y*9.; vec3 p=vec3(cos(a)*r,(position.z-.5)*10.+sin(uTime+aR.y*9.)*.5,sin(a)*r);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp((.16+aR.y*.2)*uScale/-mv.z,1.,30.); vA=.4+.6*sin(uTime*2.+aR.x*30.); }`,
    fragmentShader: `varying float vA; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(1.,.55,.72)*a*vA,a*vA);}`,
  })));
  motes.frustumCulled = false; g.add(motes);
  const pl = new THREE.PointLight('#ff4f8b', 300, 34, 2); pl.position.set(0, 0, 4); g.add(pl);

  return {
    group: g,
    update(local, ctx) {
      const t = ctx.time, a = local * N;                    // fractional active card
      core.rotation.y = t * .3; core.rotation.x = Math.sin(t * .4) * .3; ico.scale.setScalar(1 + Math.sin(t * 2) * .03 + U.uPulse.value * .2);
      rings.forEach((r, i) => { const f = (t * .35 + i / rings.length) % 1; r.scale.setScalar(2.4 + f * 15); r.material.opacity = (1 - f) * .55 * (.4 + .6 * sstep(0, .3, local)); r.rotation.y = 0; r.lookAt(ctx.camera.position); });
      cards.forEach((c, i) => {
        let d = i - a + .5;                                  // offset in slots from the active one
        d = ((d + N / 2) % N + N) % N - N / 2;               // wrap
        const ang = d * (Math.PI * 2 / N) * 1.0, R = 9.5;
        c.position.set(Math.sin(ang) * R, Math.sin(t * .8 + i) * .2 + d * .05, Math.cos(ang) * R - R + 3);
        c.rotation.y = ang * .9;
        const act = 1 - Math.min(1, Math.abs(d) * 1.4);
        c.scale.setScalar(.5 + act * 1.15);
        c.material.opacity = .3 + act * .7; c.material.color.setScalar(.55 + act * .6);
        c.renderOrder = 10 + act * 5;
      });
    },
  };
}
