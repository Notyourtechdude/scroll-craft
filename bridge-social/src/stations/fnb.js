import * as THREE from 'three';
import { U, GLSL, additive } from '../shared.js';
import { sstep, rng } from '../util.js';

const OUT = [[0, 0], [1.5, 0], [1.55, .08], [1.4, .18], [.3, .3], [.14, .5], [.12, 2.6], [.3, 2.9], [1, 3.3], [1.75, 4.2], [2.05, 5.2], [2.05, 6.1], [1.9, 7], [1.6, 7.8], [1.5, 8.1]];
const INN = [[0, 3.45], [.9, 3.7], [1.65, 4.4], [1.95, 5.3], [1.95, 6.1], [1.8, 7], [1.5, 7.8]];
const radiusAt = (y) => { for (let i = 0; i < INN.length - 1; i++) { const a = INN[i], b = INN[i + 1]; if (y >= a[1] && y <= b[1]) return a[0] + (b[0] - a[0]) * ((y - a[1]) / (b[1] - a[1])); } return 1.5; };

function qrTex() {
  const n = 25, S = 400, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), r = rng(5);
  x.fillStyle = '#12040b'; x.fillRect(0, 0, S, S); const k = (S - 40) / n; x.fillStyle = '#ead9b0';
  const finder = (ox, oy) => { x.fillRect(20 + ox * k, 20 + oy * k, 7 * k, 7 * k); x.fillStyle = '#12040b'; x.fillRect(20 + (ox + 1) * k, 20 + (oy + 1) * k, 5 * k, 5 * k); x.fillStyle = '#ead9b0'; x.fillRect(20 + (ox + 2) * k, 20 + (oy + 2) * k, 3 * k, 3 * k); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9); if (!inF && r() > .52) x.fillRect(20 + i * k, 20 + j * k, k - 1, k - 1); }
  x.fillStyle = '#12040b'; x.fillRect(20, 20, 8 * k, 8 * k); x.fillRect(20 + (n - 8) * k, 20, 8 * k, 8 * k); x.fillRect(20, 20 + (n - 8) * k, 8 * k, 8 * k); x.fillStyle = '#ead9b0';
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createFnb() {
  const g = new THREE.Group(); g.userData.focusY = 6;
  const glassM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 uAccent; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); vec3 c=mix(vec3(.5,.2,.35),vec3(1.,.9,.75),f)+uAccent*f*.4; gl_FragColor=vec4(c*(.4+f*2.),.06+f*.75); }`,
  });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(OUT.map(([x, y]) => new THREE.Vector2(x, y)), 72), glassM); g.add(glass);

  const level = { v: 4.2 };
  const wineM = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { ...U, uLevel: level },
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `${GLSL} uniform float uLevel,uTime; varying vec3 vP; varying vec3 vN; void main(){ if(vP.y>uLevel) discard;
      float sw=sin(atan(vP.z,vP.x)*3.+vP.y*2.-uTime*1.4)*.5+.5; vec3 wine=mix(vec3(.18,.0,.06),vec3(.5,.04,.16),sw*.6+smoothstep(3.4,5.,vP.y)*.4);
      float edge=pow(1.-abs(vN.y),2.); gl_FragColor=vec4(wine+edge*vec3(.3,.04,.1),1.); }`,
  });
  const wine = new THREE.Mesh(new THREE.LatheGeometry(INN.map(([x, y]) => new THREE.Vector2(x * .97, y)), 56), wineM); g.add(wine);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9a1448').multiplyScalar(1.6), side: THREE.DoubleSide, transparent: true, opacity: .95 }));
  surf.rotation.x = -Math.PI / 2; g.add(surf);

  // pouring stream
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 1, 8, 1, true), new THREE.MeshBasicMaterial(additive({ color: new THREE.Color('#ff3a6a').multiplyScalar(1.6), opacity: .8, side: THREE.DoubleSide })));
  g.add(stream);
  const dN = 160, dp = new Float32Array(dN * 3); for (let i = 0; i < dN; i++) dp.set([Math.random(), Math.random(), Math.random()], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const drops = new THREE.Points(dg, new THREE.ShaderMaterial(additive({
    uniforms: { ...U, uTop: { value: 20 }, uLvl: level, uPour: { value: 0 } },
    vertexShader: `uniform float uTime,uScale,uTop,uLvl,uPour; varying float vA;
      void main(){ float f=fract(position.x+uTime*(.6+position.y*.4)); vec3 p=vec3((position.z-.5)*.25*f*3.,mix(uTop,uLvl,f),(position.y-.5)*.25*f*3.);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(.2*uScale/-mv.z,1.,20.); vA=uPour*(1.-f*.3); }`,
    fragmentShader: `varying float vA; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(1.,.3,.5)*a*vA,a*vA);}`,
  })));
  drops.frustumCulled = false; g.add(drops);

  // steam
  const sN = 260, sp = new Float32Array(sN * 3); for (let i = 0; i < sN; i++) sp.set([Math.random(), Math.random(), Math.random()], i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const steam = new THREE.Points(sg, new THREE.ShaderMaterial(additive({
    uniforms: { ...U, uAmt: { value: 0 } },
    vertexShader: `${GLSL} uniform float uTime,uScale,uAmt; varying float vA;
      void main(){ float f=fract(position.x+uTime*.08*(.6+position.y)); float ang=position.y*40.+f*5.; float r=f*(1.2+position.z*2.2);
        vec3 p=vec3(cos(ang)*r+sin(uTime+position.z*9.+f*6.)*.5,8.+f*14.,sin(ang)*r); vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv; gl_PointSize=clamp((1.8+f*5.)*uScale/-mv.z,1.,300.); vA=sin(f*3.1416)*uAmt; }`,
    fragmentShader: `varying float vA; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;gl_FragColor=vec4(vec3(1.,.55,.35)*a*vA*.12,a*vA*.12);}`,
  })));
  steam.frustumCulled = false; g.add(steam);

  // orbit of five service beads
  const orb = new THREE.Group(); g.add(orb);
  const beads = [];
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.34, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb25c').multiplyScalar(1.6) })); orb.add(b); beads.push(b); }
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(6.6, .02, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(1.3), transparent: true, opacity: .55 }));
  ringL.rotation.x = Math.PI / 2; orb.add(ringL); orb.position.y = 4.2; orb.rotation.z = .18;

  // ScanConnect panel
  const qr = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShaderMaterial({
    transparent: true, uniforms: { ...U, uMap: { value: qrTex() }, uA: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D uMap; uniform float uTime,uA; varying vec2 vUv; void main(){ vec4 t=texture2D(uMap,vUv); float sc=fract(uTime*.5); float line=exp(-(vUv.y-sc)*(vUv.y-sc)*484.);
      vec3 c=t.rgb+vec3(1.,.4,.55)*line*2.; float edge=step(.02,vUv.x)*step(vUv.x,.98)*step(.02,vUv.y)*step(vUv.y,.98); gl_FragColor=vec4(c,uA*(.25+t.r*.75)*edge); }`,
  }));
  qr.position.set(-7.5, 7.5, 3); qr.rotation.y = .5; g.add(qr);
  const pl = new THREE.PointLight('#ff9a3c', 240, 30, 2); pl.position.set(3, 8, 6); g.add(pl);

  return {
    group: g,
    update(local, ctx) {
      const t = ctx.time, a = local * 5, fill = sstep(0, .25, local) * .65 + .35 * sstep(.25, .8, local);
      level.v = 3.55 + fill * 3.4;
      surf.position.y = level.v; surf.scale.setScalar(radiusAt(Math.min(level.v, 7.7)) * .97);
      const pour = sstep(0.0, .1, local) * (1 - sstep(.72, .88, local));
      stream.visible = pour > .01; stream.scale.set(1, 17, 1); stream.position.y = level.v + 8.5; stream.material.opacity = .8 * pour;
      drops.material.uniforms.uPour.value = pour; drops.material.uniforms.uTop.value = level.v + 17;
      steam.material.uniforms.uAmt.value = sstep(.1, .6, local);
      glass.rotation.y = t * .1; wine.rotation.y = t * .1; surf.rotation.z = t * .4;
      beads.forEach((b, i) => { const an = (i / 5) * 6.2832 + t * .22; b.position.set(Math.cos(an) * 6.6, 0, Math.sin(an) * 6.6); const act = Math.max(0, 1 - Math.abs(a - i - .5) * 1.2); b.scale.setScalar(.7 + act * 1.2); });
      qr.material.uniforms.uA.value += (sstep(.58, .72, local) * (1 - sstep(.78, .86, local)) - qr.material.uniforms.uA.value) * .1;
      qr.position.y = 7.5 + Math.sin(t) * .25; qr.lookAt(ctx.camera.position);
    },
  };
}
