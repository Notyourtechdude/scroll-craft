import * as THREE from 'three';
import { U, GLSL, additive } from '../shared.js';
import { sstep, rng } from '../util.js';

export function createCorporate() {
  const g = new THREE.Group(); g.userData.focusY = 5;
  const R = rng(33), G = 6, N = G * G, sp = 3.1;
  const box = new THREE.BoxGeometry(2.2, 1, 2.2); box.translate(0, .5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U }, 
    vertexShader: `varying vec2 vUv; varying float vH; varying vec3 vN; varying vec3 vV; varying float vId;
      void main(){ vUv=uv; vH=length(instanceMatrix[1].xyz); vId=instanceMatrix[3].x*7.+instanceMatrix[3].z*13.;
        vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal/vec3(1.));
        vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL} uniform float uTime; uniform vec3 uAccent; varying vec2 vUv; varying float vH; varying vec3 vN; varying vec3 vV; varying float vId;
      void main(){ vec2 g=vec2(vUv.x*5.,vUv.y*vH*1.1); vec2 id=floor(g); vec2 f=fract(g);
        float lit=step(.58,hash21(id+vId)); float tw=.6+.4*sin(uTime*(1.+hash21(id)*3.)+hash21(id)*30.);
        float win=lit*tw*step(.12,f.x)*step(f.x,.88)*step(.2,f.y)*step(f.y,.8);
        float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
        vec3 c=vec3(.05,.015,.05)+vec3(.45,.08,.22)*fr*.6+win*mix(vec3(1.,.82,.5),uAccent*1.6,hash21(id+3.))*1.4+uAccent*fr*.25;
        gl_FragColor=vec4(c,1.); }`,
  });
  const towers = new THREE.InstancedMesh(box, mat, N); towers.frustumCulled = false; g.add(towers);
  const T = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const cx = (i - (G - 1) / 2) * sp, cz = (j - (G - 1) / 2) * sp, d = Math.hypot(cx, cz);
    T.push({ x: cx, z: cz, h: 3 + R() * 6 + Math.max(0, 7 - d * 1.1) * 1.4, o: R() });
  }
  const tops = T.map((t) => new THREE.Vector3(t.x, t.h, t.z));
  // connection lines (team building)
  const lp = []; for (let k = 0; k < 40; k++) { const a = T[(R() * N) | 0], b = T[(R() * N) | 0]; if (a !== b) lp.push(a.x, 0, a.z, b.x, 0, b.z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial(additive({ color: new THREE.Color('#8fd3ff').multiplyScalar(1.4), opacity: 0 })));
  g.add(lines);

  // stage + ring
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.4, .5, 80), new THREE.MeshStandardMaterial({ color: '#1a0612', metalness: .8, roughness: .25, envMapIntensity: 1.2 }));
  stage.position.y = -.25; g.add(stage);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(11.1, .07, 6, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fd3ff').multiplyScalar(2) })); rim.rotation.x = Math.PI / 2; g.add(rim);

  // spotlight beams
  const beamM = new THREE.ShaderMaterial(additive({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: `varying float vY; void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uAccent; varying float vY; void main(){ float a=(1.-vY/30.)*.16; gl_FragColor=vec4(mix(vec3(.6,.85,1.),uAccent,.4)*a,a); }`,
  }));
  const beamG = new THREE.CylinderGeometry(2.4, .12, 30, 20, 1, true); beamG.translate(0, 15, 0);
  const beams = []; for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(beamG, beamM); b.position.set(Math.cos(i * 1.5708) * 9, 0, Math.sin(i * 1.5708) * 9); g.add(b); beams.push(b); }
  beamM.uniforms = { ...U };
  beamG.attributes.position.needsUpdate = true;

  // trophy star
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.1 : 2.6, a = (i / 10) * 6.2832 + Math.PI / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .7, bevelEnabled: true, bevelSize: .12, bevelThickness: .12, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: '#f1cf86', metalness: 1, roughness: .18, emissive: '#7a4a10', emissiveIntensity: .6, envMapIntensity: 2 }));
  star.position.y = 22; g.add(star);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(4.2, .05, 6, 90), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd98a').multiplyScalar(2.2) })); halo.position.y = 22; g.add(halo);

  // trade-show booths
  const booths = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 1.6).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: '#3a0a24', metalness: .6, roughness: .3, emissive: '#2a6a9a', emissiveIntensity: .45, envMapIntensity: 1.2 }), 18);
  g.add(booths);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const pl = new THREE.PointLight('#8fd3ff', 240, 36, 2); pl.position.set(0, 14, 8); g.add(pl);
  return {
    group: g,
    update(local, ctx) {
      const t = ctx.time, grow = sstep(0, .5, local), boothK = sstep(.62, .95, local);
      T.forEach((tw, i) => { const k = sstep(tw.o * .5, tw.o * .5 + .5, grow); p.set(tw.x, 0, tw.z); s.set(1, Math.max(.01, tw.h * k * (1 + Math.sin(t * .8 + i) * .03)), 1); m4.compose(p, q, s); towers.setMatrixAt(i, m4); });
      towers.instanceMatrix.needsUpdate = true;
      lines.material.opacity = sstep(.3, .6, local) * (1 - sstep(.62, .75, local)) * .9 + .15 * grow;
      lines.position.y = 0; lines.scale.y = 1; lines.rotation.y = 0;
      // lines drawn at tower-top height
      const pos = lg.attributes.position; for (let k = 0; k < pos.count; k++) { const idx = T.findIndex((tw) => Math.abs(tw.x - pos.getX(k)) < 1e-3 && Math.abs(tw.z - pos.getZ(k)) < 1e-3); if (idx >= 0) pos.setY(k, Math.max(.01, T[idx].h * sstep(T[idx].o * .5, T[idx].o * .5 + .5, grow))); }
      pos.needsUpdate = true;
      beams.forEach((b, i) => { b.rotation.z = Math.sin(t * .7 + i * 1.7) * .5 * (1 + (i % 2)); b.rotation.x = Math.cos(t * .5 + i * 2.1) * .5; });
      star.rotation.y = t * .6; star.position.y = 15 + 3 * grow + Math.sin(t) * .3; halo.position.y = star.position.y; halo.rotation.x = Math.PI / 2 + Math.sin(t) * .3; halo.rotation.y = t * .4;
      booths.visible = boothK > .01;
      for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.2832, r = 8.4 + (i % 2) * 1.2; p.set(Math.cos(a) * r, 0, Math.sin(a) * r); q.setFromAxisAngle(v.set(0, 1, 0), -a); s.set(1, .01 + boothK * (.6 + (i % 3) * .35), 1); m4.compose(p, q, s); booths.setMatrixAt(i, m4); }
      booths.instanceMatrix.needsUpdate = true;
    },
  };
}
