import * as THREE from 'three';
import { U, GLSL, additive } from '../shared.js';
import { CHAPTERS } from '../content.js';
import { sstep, rng, lerp } from '../util.js';

const ll = (lat, lon, r) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r); };
// Dubai → six destinations, one per concierge service
const DEST = [[51.5, -0.1], [43.7, 7.4], [3.2, 73.2], [40.7, -74], [1.35, 103.8], [35.7, 139.7]];

export function createVip() {
  const g = new THREE.Group(); g.userData.focusY = 6;
  const globe = new THREE.Group(); g.add(globe); const RAD = 6.4, R = rng(77);
  // dotted globe with pseudo continents
  const N = 5200, gp = new Float32Array(N * 3), gl = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    gp.set([Math.cos(th) * r * RAD, y * RAD, Math.sin(th) * r * RAD], i * 3);
    const nx = Math.cos(th) * r, nz = Math.sin(th) * r;
    const land = Math.sin(nx * 3.1 + y * 2.3) * Math.cos(nz * 2.7 - y * 1.9) + Math.sin(nx * 7.3 + nz * 5.1) * .35 + Math.sin(y * 6. + nx * 4.) * .25;
    gl[i] = land > .22 ? 1 : 0;
  }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('aL', new THREE.BufferAttribute(gl, 1));
  globe.add(new THREE.Points(gg, new THREE.ShaderMaterial(additive({
    uniforms: U,
    vertexShader: `uniform float uScale,uTime; attribute float aL; varying float vL; varying float vF;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vec3 n=normalize(mat3(modelMatrix)*position); vec3 v=normalize(cameraPosition-w.xyz); vF=pow(1.-max(dot(n,v),0.),2.);
        vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp((aL>.5?.15:.085)*uScale/-mv.z,1.,12.); vL=aL; vF+=step(0.,dot(n,v))*0.; if(dot(n,v)<-.15) gl_PointSize*=.4; }`,
    fragmentShader: `uniform vec3 uAccent; varying float vL; varying float vF; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);
      vec3 c=mix(vec3(.45,.1,.28),vec3(1.,.88,.62),vL)+uAccent*vF*.6; gl_FragColor=vec4(c*a*(.35+vL*.9+vF*.5),a*(.35+vL*.7));}`,
  }))));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(RAD * .985, 48, 32), new THREE.MeshBasicMaterial({ color: '#0b0208' })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RAD * 1.12, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: U,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 uAccent; varying vec3 vN; varying vec3 vV; void main(){float f=pow(max(dot(-vN,vV),0.),3.5);gl_FragColor=vec4(uAccent*f*1.1+vec3(.3,.2,.1)*f*.3,f);}`,
  }));
  g.add(atm);

  // arcs
  const home = ll(25.2, 55.3, RAD), arcs = [], curves = [];
  DEST.forEach((d, i) => {
    const to = ll(d[0], d[1], RAD), mid = home.clone().add(to).normalize().multiplyScalar(RAD + home.distanceTo(to) * .5);
    const c = new THREE.QuadraticBezierCurve3(home, mid, to), pts = c.getPoints(80); curves.push(c);
    const geo = new THREE.BufferGeometry().setFromPoints(pts); const dist = new Float32Array(pts.length).map((_, k) => k / (pts.length - 1)); geo.setAttribute('aT', new THREE.BufferAttribute(dist, 1));
    const mat = new THREE.ShaderMaterial(additive({
      uniforms: { ...U, uAct: { value: 0 } }, vertexShader: `attribute float aT; varying float vT; void main(){vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float uAct,uTime; varying float vT; void main(){ float head=fract(uTime*.28); float d=mod(vT-head+1.,1.); float tr=exp(-d*5.)*uAct; float base=.1+uAct*.55; gl_FragColor=vec4(vec3(1.,.88,.6)*(base+tr*2.),base+tr); }`,
    }));
    const line = new THREE.Line(geo, mat); globe.add(line); arcs.push(line);
    const mk = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a0').multiplyScalar(2) })); mk.position.copy(to); globe.add(mk);
  });
  const hm = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7aa8').multiplyScalar(2.5) })); hm.position.copy(home); globe.add(hm);

  // private jet
  const jet = new THREE.Group(), jm = new THREE.MeshStandardMaterial({ color: '#f4e4d0', metalness: .9, roughness: .2, emissive: '#5a2a30', emissiveIntensity: .4, envMapIntensity: 2 });
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(.11, .9, 6, 12), jm); fus.rotation.x = Math.PI / 2; jet.add(fus);
  const wsh = new THREE.Shape(); wsh.moveTo(0, .3); wsh.lineTo(.9, -.25); wsh.lineTo(.9, -.38); wsh.lineTo(0, -.12); wsh.lineTo(-.9, -.38); wsh.lineTo(-.9, -.25); wsh.closePath();
  const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wsh, { depth: .03, bevelEnabled: false }), jm); wing.rotation.x = Math.PI / 2; wing.position.y = -.02; jet.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.03, .3, .22), jm); tail.position.set(0, .15, -.52); tail.rotation.x = -.3; jet.add(tail);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(.5, .02, .14), jm); tw.position.set(0, .02, -.55); jet.add(tw);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a4a').multiplyScalar(3) })); beacon.position.y = .13; jet.add(beacon);
  jet.scale.setScalar(1.35); globe.add(jet);
  // orbit rings
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(1.2), transparent: true, opacity: .35 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(8.6, .018, 6, 160), ringM), r2 = new THREE.Mesh(new THREE.TorusGeometry(10, .012, 6, 160), ringM);
  r1.rotation.set(1.2, .3, 0); r2.rotation.set(1.9, -.5, 0); g.add(r1, r2);
  const sat = new THREE.Mesh(new THREE.OctahedronGeometry(.28), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a0').multiplyScalar(2.2) })); g.add(sat);
  const pl = new THREE.PointLight('#f4e4b8', 260, 34, 2); pl.position.set(0, 6, 10); g.add(pl);

  const items = CHAPTERS.find((c) => c.id === 'vip').items.length;
  const q = new THREE.Quaternion(), qT = new THREE.Quaternion(), tmp = new THREE.Vector3(), tan = new THREE.Vector3(), up = new THREE.Vector3(), m = new THREE.Matrix4();
  let cur = 0;
  return {
    group: g,
    update(local, ctx) {
      const t = ctx.time, a = Math.min(items - 1, Math.floor(local * items)); cur = a;
      arcs.forEach((l, i) => { l.material.uniforms.uAct.value += ((i === a ? 1 : 0) - l.material.uniforms.uAct.value) * .1; });
      // rotate globe so the active route's midpoint faces the camera
      const mid = curves[a].getPoint(.5).clone().normalize(); qT.setFromUnitVectors(mid, new THREE.Vector3(.18, .15, 1).normalize());
      globe.quaternion.slerp(qT, .035);
      // jet flies along active arc (local space)
      const u = (t * .28) % 1, c = curves[a]; c.getPoint(u, tmp); c.getTangent(u, tan);
      jet.position.copy(tmp); up.copy(tmp).normalize();
      m.lookAt(tan, new THREE.Vector3(), up); jet.quaternion.setFromRotationMatrix(m);
      jet.visible = true;
      const ss = t * .5; sat.position.set(Math.cos(ss) * 10 * .98, Math.sin(ss * .7) * 3, Math.sin(ss) * 10 * .98); sat.rotation.y = t;
      r1.rotation.z = t * .08; r2.rotation.z = -t * .06;
      globe.rotation.y += 0;
    },
  };
}
