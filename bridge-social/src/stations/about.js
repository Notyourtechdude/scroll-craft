import * as THREE from 'three';
import { U, GLSL, additive } from '../shared.js';

const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

export function createAbout() {
  const g = new THREE.Group(); g.userData.focusY = 5;
  const mat = new THREE.MeshStandardMaterial({ color: '#e0a8c6', metalness: 1, roughness: .13, envMapIntensity: 2.1 });
  const king = new THREE.Group();
  king.add(new THREE.Mesh(lathe([[0, 0], [2.4, 0], [2.5, .2], [2.2, .5], [1.6, 1], [1.25, 1.7], [.95, 2.8], [.8, 3.8], [1, 4.1], [1.5, 4.3], [1.55, 4.6], [1.2, 4.75], [1.7, 5.6], [1.95, 6.5], [1.8, 6.8], [0, 6.8]]), mat));
  const bx = (w, h, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; king.add(m); };
  bx(.5, 1.7, .5, 7.7); bx(1.4, .5, .5, 8.1);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.38, 24, 16), mat); orb.position.y = 6.95; king.add(orb);
  g.add(king);

  const pawnP = [[0, 0], [1.1, 0], [1.15, .1], [.9, .3], [.45, .9], [.4, 1.5], [.75, 1.7], [.75, 1.9], [.35, 2.05], [.5, 2.5], [.45, 3], [0, 3.3]];
  const pawnG = lathe(pawnP, 40), pawns = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + .4, p = new THREE.Mesh(pawnG, mat);
    p.position.set(Math.cos(a) * 6.2, 0, Math.sin(a) * 6.2); p.scale.setScalar(.85 + (i % 3) * .12); g.add(p); pawns.push(p);
  }

  // checkerboard disc
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: `varying vec2 vP; void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uTime; uniform vec3 uAccent; varying vec2 vP;
      void main(){ vec2 q=vP/1.6; float c=mod(floor(q.x)+floor(q.y),2.); float r=length(vP);
        vec3 col=mix(vec3(.03,0.,.02),vec3(.36,.06,.2),c); float edge=smoothstep(10.,5.5,r);
        float ring=smoothstep(.12,0.,abs(fract(r*.25-uTime*.05)-.5)-.4)*.0;
        col+=uAccent*.25*exp(-(r-9.4)*(r-9.4)*8.); gl_FragColor=vec4(col,edge*.95); }`,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; g.add(floor);

  const glow = new THREE.PointLight('#ff7aa8', 260, 30, 2); glow.position.set(3, 6, 6); g.add(glow);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(4.6, .05, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(2.4) }));
  halo.position.y = 9.4; halo.rotation.x = Math.PI / 2; g.add(halo);
  const halo2 = halo.clone(); halo2.scale.setScalar(.7); halo2.position.y = 9.9; g.add(halo2);
  // trio of arches behind: the bridge in the logo
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 1.2, .06, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(1.6), transparent: true, opacity: .8 }));
    a.position.set(0, 0, -5 - i * 1.5); g.add(a);
  }
  return {
    group: g,
    update(local, ctx) {
      const t = ctx.time;
      king.rotation.y = t * .18 + local * 2.4; king.position.y = Math.sin(t * .8) * .12 + 1.2;
      halo.rotation.z = t * .3; halo2.rotation.z = -t * .5; halo.position.y = 9.4 + Math.sin(t) * .15 + 1.2; halo2.position.y = 9.9 + Math.sin(t * 1.2) * .15 + 1.2;
      pawns.forEach((p, i) => { p.position.y = Math.sin(t * .9 + i) * .15; p.rotation.y = t * .3 + i; });
      glow.intensity = 260 + Math.sin(t * 2) * 60;
    },
  };
}
