import * as THREE from 'three';
import { U, additive, CREAM } from '../shared.js';
import { rng, isMobile } from '../util.js';

/** Particle logo: scatters into mist or condenses into the B-and-bridge mark. */
export function createLogoCloud(pts, { size = 16, seed = 3, count, bright = .8, dot = 1, solid = false } = {}) {
  const N = count || Math.floor(pts.length / 2), R = rng(seed);
  const tg = new Float32Array(N * 3), rd = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const k = (i % (pts.length / 2)) * 2; tg.set([pts[k] * size, pts[k + 1] * size, (R() - .5) * .6], i * 3); rd.set([R(), R(), R(), R()], i * 4); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(tg, 3)); geo.setAttribute('aR', new THREE.BufferAttribute(rd, 4));
  const uForm = { value: 0 }, uMouse = { value: new THREE.Vector3(999, 999, 0) };
  const mat = new THREE.ShaderMaterial((solid ? (o) => Object.assign({ transparent: true, depthWrite: false }, o) : additive)({
    uniforms: { ...U, uForm, uMouse, uSize: { value: size * .011 * dot }, uBright: { value: bright } },
    vertexShader: `uniform float uTime,uScale,uForm,uSize,uPulse; uniform vec3 uMouse; attribute vec4 aR; varying float vA; varying float vC;
      float ez(float x){x=clamp(x,0.,1.);return x*x*x*(x*(x*6.-15.)+10.);}
      void main(){
        float f=ez(uForm*1.25-aR.w*.25);
        vec3 sc=(aR.xyz-.5)*vec3(90.,60.,70.); float t=uTime*.2+aR.w*6.28;
        sc+=vec3(sin(t*1.3+aR.y*9.),cos(t+aR.x*9.),sin(t*.7+aR.z*9.))*3.;
        vec3 tg=position+vec3(sin(uTime*.9+aR.x*30.),cos(uTime*.8+aR.y*30.),sin(uTime*.7+aR.z*30.))*.09;
        vec3 p=mix(sc,tg,f);
        vec2 dm=p.xy-uMouse.xy; float md=length(dm); float push=smoothstep(3.6,0.,md)*f; p.xy+=normalize(dm+1e-4)*push*1.6; p.z+=push*2.*(aR.x-.5)+uPulse*(aR.y-.5)*3.*f;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(uSize*(.7+aR.y*.9+push)*uScale/-mv.z,1.,34.);
        vA=(.35+.65*(.5+.5*sin(uTime*2.+aR.x*60.)))*(.45+.55*f)*smoothstep(.5,6.,-mv.z); vC=aR.z+push; }`,
    fragmentShader: `uniform vec3 uAccent; uniform float uBright; varying float vA; varying float vC; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);
      vec3 c=mix(vec3(1.,.88,.62),uAccent*1.5+vec3(.3),smoothstep(.55,1.,vC)); ${solid ? 'gl_FragColor=vec4(c*uBright,smoothstep(.0,.35,a)*vA);' : 'gl_FragColor=vec4(c*a*vA*uBright,a*vA);'}}`,
  }));
  const pts3 = new THREE.Points(geo, mat); pts3.frustumCulled = false;
  return { points: pts3, uForm, uMouse };
}

/** Giant bridge gate, rising sun and light rays at the end of the journey. */
export function createGate() {
  const g = new THREE.Group();
  const mk = (r, tube, k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 120, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(k) })); m.position.y = 1; return m; };
  g.add(mk(9.5, .14, 1.15), mk(12.5, .09, .9), mk(16, .06, .7));
  for (const s of [-1, 1]) for (const [r, h] of [[9, 1], [12.5, 1], [16, 1]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(.9) })); c.position.set(s * r, -.5, 0); g.add(c); }
  // sun
  const sunMat = new THREE.ShaderMaterial(additive({
    uniforms: { ...U, uK: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uK,uTime; uniform vec3 uAccent; varying vec2 vUv; void main(){ vec2 p=vUv-.5; float r=length(p)*2.; float core=smoothstep(.13,.1,r); float halo=exp(-r*6.); float rays=pow(abs(sin(atan(p.y,p.x)*14.+uTime*.08)),8.)*exp(-r*4.)*.35;
      vec3 c=vec3(1.,.93,.75)*core*2.2+mix(vec3(1.,.5,.4),uAccent,.4)*halo*1.1+vec3(1.,.8,.55)*rays; gl_FragColor=vec4(c*uK,(core+halo+rays)*uK); }`,
  }));
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), sunMat); sun.position.set(0, -4, -150); sun.renderOrder = -5; g.add(sun);
  return { group: g, sunMat };
}
