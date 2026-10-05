import * as THREE from 'three';
import { U, GLSL, SPRITE_FRAG, additive, WATER_Y, CREAM } from './shared.js';
import { rng, isMobile } from './util.js';

const Z0 = 90, Z1 = -640, LEN = Z0 - Z1, ZC = (Z0 + Z1) / 2;

const skyMat = () => new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { ...U, uSun: { value: 0 }, uTop: { value: new THREE.Color('#06010a') }, uMid: { value: new THREE.Color('#2a0620') }, uHor: { value: new THREE.Color('#7a1a4a') } },
  vertexShader: `varying vec3 vDir; void main(){vDir=position;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}`,
  fragmentShader: `${GLSL}
  uniform vec3 uTop,uMid,uHor,uAccent; uniform float uSun,uTime; varying vec3 vDir;
  void main(){
    vec3 d=normalize(vDir); float h=d.y;
    vec3 col=mix(uHor,uMid,smoothstep(0.,.28,h)); col=mix(col,uTop,smoothstep(.2,.95,h));
    col=mix(col,uHor*.25,smoothstep(0.,-.25,h));
    vec3 sd=normalize(vec3(0.,.09,-1.)); float s=max(dot(d,sd),0.);
    col+=uAccent*pow(s,10.)*.16*uSun+vec3(1.,.55,.4)*pow(s,38.)*.55*uSun+vec3(1.,.9,.65)*pow(s,260.)*3.*uSun;
    col+=uAccent*exp(-abs(h)*13.)*.22;
    // stars
    vec3 sp=d*160.; vec3 ip=floor(sp); float n=fract(sin(dot(ip,vec3(12.9898,78.233,37.719)))*43758.5453);
    float tw=.6+.4*sin(uTime*2.+n*80.); float star=step(.9965,n)*tw*smoothstep(.12,.45,h)*(1.-uSun*.9);
    vec2 f=fract(sp.xy)-.5; col+=vec3(1.,.93,.85)*star*smoothstep(.5,.1,length(fract(sp)-.5))*1.4;
    // moon
    vec3 md=normalize(vec3(.55,.42,-.5)); float m=dot(d,md);
    col+=vec3(1.,.93,.82)*smoothstep(.9988,.9994,m)*1.7*(1.-uSun*.8)+uAccent*pow(max(m,0.),60.)*.18*(1.-uSun);
    gl_FragColor=vec4(col,1.);
  }`,
});

const gateMat = () => new THREE.ShaderMaterial({
  side: THREE.DoubleSide, transparent: true, depthWrite: false,
  uniforms: U,
  vertexShader: `varying float vZ; varying float vD; varying float vY;
    void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vZ=w.z; vY=w.y; vD=length(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float uTime,uVel,uPulse; uniform vec3 uCam,uAccent,uFogCol; uniform float uFogDen; varying float vZ,vD,vY;
    void main(){
      float wave=uCam.z-60.-mod(uTime*55.,260.); float gq=(vZ-wave)/16.; float g=exp(-gq*gq);
      float wave2=uCam.z-18.*uVel*3.; float gr=(vZ-wave2+10.)/22.; float g2=exp(-gr*gr)*min(abs(uVel)*2.,1.);
      vec3 c=mix(vec3(.92,.8,.55),uAccent*1.3+vec3(.25),clamp(g+g2,0.,1.));
      c*=1.05+g*2.4+g2*1.6+uPulse*1.2;
      float f=exp(-pow(vD*uFogDen*1.15,2.)); float near=smoothstep(9.,34.,vD);
      gl_FragColor=vec4(mix(uFogCol,c,f),near*(vY<-1.?.45:1.));
    }`,
});

export async function createWorld(scene, renderer) {
  const g = new THREE.Group(); scene.add(g);
  const R = rng(11);

  /* ---------- sky + environment ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), skyMat());
  sky.renderOrder = -10; scene.add(sky);

  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat()); envSky.material.uniforms.uHor.value = new THREE.Color('#34081f');
  envScene.add(envSky);
  const bar = (w, h, p, c, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); envScene.add(m);
  };
  bar(30, 4, [-20, 18, 10], '#ffe9c4', 9); bar(4, 30, [24, 4, -10], '#ff7aa8', 6); bar(26, 3, [4, 22, -22], '#ffffff', 7); bar(14, 14, [0, -4, 24], '#9b2b66', 3);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(envScene, 0.02).texture;
  scene.environment = env; scene.environmentIntensity = 0.35;

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight('#a8507c', '#1a0612', 0.45));
  const moon = new THREE.DirectionalLight('#ffe3c4', 0.6); moon.position.set(40, 50, -30); scene.add(moon);
  const rig = new THREE.PointLight('#ff6fa0', 55, 40, 2); scene.add(rig);

  /* ---------- deck (checkerboard) ---------- */
  const cc = document.createElement('canvas'); cc.width = cc.height = 256;
  const cx = cc.getContext('2d');
  cx.fillStyle = '#1a0612'; cx.fillRect(0, 0, 256, 256);
  cx.fillStyle = '#4a0a2b'; cx.fillRect(0, 0, 128, 128); cx.fillRect(128, 128, 128, 128);
  cx.strokeStyle = 'rgba(234,217,176,.35)'; cx.lineWidth = 2; cx.strokeRect(1, 1, 254, 254);
  const checker = new THREE.CanvasTexture(cc);
  checker.wrapS = checker.wrapT = THREE.RepeatWrapping; checker.colorSpace = THREE.SRGBColorSpace;
  checker.anisotropy = renderer.capabilities.getMaxAnisotropy();
  checker.repeat.set(3, LEN / 4);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, LEN), [
    new THREE.MeshStandardMaterial({ color: '#2a0a1c', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#2a0a1c', roughness: .8 }),
    new THREE.MeshStandardMaterial({ map: checker, roughness: .38, metalness: .25, envMapIntensity: .45 }),
    new THREE.MeshStandardMaterial({ color: '#12040b' }), new THREE.MeshStandardMaterial({ color: '#2a0a1c' }), new THREE.MeshStandardMaterial({ color: '#2a0a1c' }),
  ]);
  deck.position.set(0, -0.4, ZC); g.add(deck);

  // parapets + balusters
  const stone = new THREE.MeshStandardMaterial({ color: '#2b0c1e', roughness: .6, metalness: .2, envMapIntensity: .8 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .55, LEN), stone); p.position.set(s * 5.85, .27, ZC); g.add(p);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.18, .12, LEN), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ead9b0').multiplyScalar(.8) }));
    rail.position.set(s * 5.85, 1.35, ZC); g.add(rail);
  }
  const bal = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .09, .8, 6), stone, Math.floor(LEN / 0.8) * 2);
  { const m = new THREE.Matrix4(); let k = 0; for (let z = Z0; z > Z1; z -= 0.8) for (const s of [-1, 1]) { m.makeTranslation(s * 5.85, .95, z); bal.setMatrixAt(k++, m); } bal.count = k; }
  g.add(bal);

  /* ---------- gates (emissive arches, the logo's bridge motif) ---------- */
  const gateGeo = new THREE.TorusGeometry(6, .09, 8, 56, Math.PI);
  const colGeo = new THREE.CylinderGeometry(.09, .09, 1.3, 8); colGeo.translate(0, .65, 0);
  const gates = []; for (let z = Z0; z > Z1; z -= 14) gates.push(z);
  const gm = gateMat();
  const gateI = new THREE.InstancedMesh(gateGeo, gm, gates.length);
  const colI = new THREE.InstancedMesh(colGeo, gm, gates.length * 2);
  { const m = new THREE.Matrix4(); gates.forEach((z, i) => {
      m.makeTranslation(0, 1.3, z); gateI.setMatrixAt(i, m);
      m.makeTranslation(-6, 0, z); colI.setMatrixAt(i * 2, m); m.makeTranslation(6, 0, z); colI.setMatrixAt(i * 2 + 1, m); }); }
  gateI.frustumCulled = colI.frustumCulled = false; g.add(gateI, colI);
  // mirrored reflection in the water
  for (const mesh of [gateI, colI]) {
    const r = new THREE.InstancedMesh(mesh.geometry, mesh.material, mesh.count); r.instanceMatrix = mesh.instanceMatrix;
    r.scale.y = -1; r.position.y = WATER_Y * 2; r.frustumCulled = false; g.add(r);
  }

  /* ---------- viaduct arches under the deck ---------- */
  {
    const span = 14, H = 9.2, hr = 5.3;
    const sh = new THREE.Shape(); sh.moveTo(-span / 2, 0); sh.lineTo(span / 2, 0); sh.lineTo(span / 2, -H); sh.lineTo(-span / 2, -H); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-hr, -H - 1); hole.lineTo(-hr, -H * .35); hole.absarc(0, -H * .35, hr, Math.PI, 0, true); hole.lineTo(hr, -H - 1); hole.closePath();
    sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 11.2, bevelEnabled: false, curveSegments: 20 }); geo.translate(0, 0, -5.6); geo.rotateY(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#240a18', roughness: .85, metalness: .1, envMapIntensity: .6 });
    const n = Math.ceil(LEN / span); const arc = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m.makeTranslation(0, -.8, Z0 - i * span - span / 2); arc.setMatrixAt(i, m); }
    arc.frustumCulled = false; g.add(arc);
  }

  /* ---------- lamps ---------- */
  const lampPos = [];
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(3) });
  const post = new THREE.CylinderGeometry(.05, .07, 2.2, 6); post.translate(0, 1.1, 0);
  const posts = new THREE.InstancedMesh(post, stone, Math.floor(LEN / 14) * 2 + 2);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 12, 8), lampMat, Math.floor(LEN / 14) * 2 + 2);
  { const m = new THREE.Matrix4(); let k = 0;
    for (let z = Z0 - 7; z > Z1; z -= 14) for (const s of [-1, 1]) {
      m.makeTranslation(s * 5.85, 1.4, z); posts.setMatrixAt(k, m); m.makeTranslation(s * 5.85, 3.7, z); bulbs.setMatrixAt(k, m); lampPos.push(s * 5.85, 3.7, z); k++; }
    posts.count = bulbs.count = k; }
  g.add(posts, bulbs);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  const lampGlow = new THREE.Points(lg, new THREE.ShaderMaterial(additive({
    uniforms: U, vertexShader: `uniform float uScale; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(7.*uScale/-mv.z,2.,260.);}`,
    fragmentShader: `${SPRITE_FRAG} void main(){float a=spriteAlpha();gl_FragColor=vec4(vec3(1.,.74,.45)*a*a*.9,a*a);}`,
  })));
  lampGlow.frustumCulled = false; g.add(lampGlow);

  /* ---------- water ---------- */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...U, uSun: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `${GLSL} uniform float uTime,uPulse,uSun,uFogDen; uniform vec3 uCam,uAccent,uFogCol; varying vec3 vW;
    float H(vec2 p){float t=uTime*.25;return fbm(p*.22+vec2(t,-t*.7))+.5*fbm(p*.7-vec2(t*1.7,t))+.25*vnoise(p*2.4+uTime*.6);}
    void main(){
      vec2 p=vW.xz; float e=.35; float h=H(p);
      vec3 n=normalize(vec3((H(p+vec2(e,0))-h)*-1.4,1.,(H(p+vec2(0,e))-h)*-1.4));
      float pr=uPulse; float dd=length(p-uCam.xz); n.xz+=vec2(sin(dd*1.4-uTime*6.))*pr*.05*exp(-dd*.05);
      vec3 v=normalize(uCam-vW); float fr=pow(1.-max(dot(n,v),0.),3.);
      vec3 deep=vec3(.025,.006,.02), hor=mix(vec3(.2,.04,.12),uAccent*.4,.35);
      vec3 refl=mix(deep*2.,hor,smoothstep(.0,.8,fr+.15));
      vec3 sd=normalize(vec3(0.,.09,-1.)); vec3 r=reflect(-v,n); float s=pow(max(dot(r,sd),0.),90.);
      refl+=vec3(1.,.8,.55)*s*(2.5+uSun*6.);
      vec3 mn=normalize(vec3(.55,.42,-.5)); refl+=vec3(1.,.93,.82)*pow(max(dot(r,mn),0.),600.)*5.;
      float glint=smoothstep(.78,.97,vnoise(p*3.+uTime*.8)*vnoise(p*1.7-uTime*.4)*2.6);
      refl+=uAccent*glint*.3*(0.4+fr)*exp(-length(vW-uCam)*.012);
      vec3 col=mix(deep,refl,.35+fr*.65);
      float d=length(vW-uCam); float f=exp(-pow(d*uFogDen*.8,2.));
      col=mix(uFogCol,col,f);
      gl_FragColor=vec4(col,.9);
    }`,
  }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; g.add(water);

  /* ---------- far skyline (silhouettes + lit windows) ---------- */
  {
    const n = 150, box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, .5, 0);
    const tw = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: '#1d0817' }), n);
    const m = new THREE.Matrix4(), win = [];
    for (let i = 0; i < n; i++) {
      const s = R() < .5 ? -1 : 1, x = s * (95 + R() * 220), z = Z0 + 40 - R() * (LEN + 120);
      const w = 6 + R() * 14, h = 30 + Math.pow(R(), 2.2) * 170, d = 6 + R() * 12;
      m.compose(new THREE.Vector3(x, WATER_Y - 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h + 2, d)); tw.setMatrixAt(i, m);
      const cnt = Math.floor(h / 5);
      for (let k = 0; k < cnt; k++) win.push(x - s * (w / 2 + .1), WATER_Y + R() * h, z + (R() - .5) * d);
    }
    tw.frustumCulled = false; g.add(tw);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(win, 3));
    const wp = new THREE.Points(wg, new THREE.ShaderMaterial(additive({
      uniforms: U, vertexShader: `uniform float uScale; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(1.3*uScale/-mv.z,1.,6.);}`,
      fragmentShader: `void main(){gl_FragColor=vec4(1.,.8,.52,.8);}`,
    }))); wp.frustumCulled = false; g.add(wp);
    // spire at the far end
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(.3, 5, 260, 6), new THREE.MeshBasicMaterial({ color: '#240a1c' }));
    spire.position.set(70, 90, -700); g.add(spire);
  }

  /* ---------- mist ---------- */
  const mistN = isMobile ? 500 : 1100, mp = new Float32Array(mistN * 3), mr = new Float32Array(mistN * 2);
  for (let i = 0; i < mistN; i++) { mp.set([(R() - .5) * 150, WATER_Y + R() * 26, Z0 - R() * LEN], i * 3); mr.set([R(), R()], i * 2); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aR', new THREE.BufferAttribute(mr, 2));
  const mist = new THREE.Points(mg, new THREE.ShaderMaterial(additive({
    uniforms: U,
    vertexShader: `uniform float uScale,uTime; attribute vec2 aR; varying float vA; varying float vT;
      void main(){ vec3 p=position; p.x+=sin(uTime*.1+aR.x*20.)*4.; p.y+=sin(uTime*.07+aR.y*20.)*1.5; vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv; gl_PointSize=clamp((26.+aR.x*40.)*uScale/-mv.z,0.,900.); vA=smoothstep(4.,26.,-mv.z)*smoothstep(260.,80.,-mv.z); vT=aR.y; }`,
    fragmentShader: `uniform vec3 uAccent; varying float vA; varying float vT; ${SPRITE_FRAG}
      void main(){float a=spriteAlpha();a*=a;gl_FragColor=vec4(mix(vec3(.55,.16,.34),uAccent*.7,vT)*a*vA*.075,a*vA*.075);}`,
  })));
  mist.frustumCulled = false; g.add(mist);

  /* ---------- embers (follow the camera) ---------- */
  const emN = isMobile ? 260 : 650, ep = new Float32Array(emN * 3), er = new Float32Array(emN * 2);
  for (let i = 0; i < emN; i++) { ep.set([R(), R(), R()], i * 3); er.set([R(), R()], i * 2); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('aR', new THREE.BufferAttribute(er, 2));
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial(additive({
    uniforms: U,
    vertexShader: `uniform float uScale,uTime,uVel,uPulse; uniform vec3 uCam; attribute vec2 aR; varying float vA; varying float vC;
      void main(){ vec3 box=vec3(46.,28.,80.);
        vec3 p=position*box + vec3(sin(uTime*.3+aR.x*30.)*1.2,uTime*(.5+aR.y*1.2),uTime*.15*aR.x);
        p=mod(p-uCam+box*.5,box)-box*.5; p.y+=2.; p+=uCam; p.z+=0.;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float tw=.55+.45*sin(uTime*3.+aR.x*60.);
        gl_PointSize=clamp((.1+aR.y*.18+uPulse*.2)*uScale/-mv.z*(1.+abs(uVel)*2.),1.,22.); vA=tw*smoothstep(3.,14.,-mv.z); vC=aR.y; }`,
    fragmentShader: `uniform vec3 uAccent; varying float vA; varying float vC; ${SPRITE_FRAG}
      void main(){float a=spriteAlpha();gl_FragColor=vec4(mix(vec3(1.,.82,.5),uAccent*1.4,vC)*a*vA*1.3,a*vA);}`,
  })));
  embers.frustumCulled = false; g.add(embers);

  /* ---------- per-frame ---------- */
  const fogCol = new THREE.Color();
  return {
    env,
    update(cam, sun, fogDen, fogTarget) {
      sky.position.copy(cam.position);
      sky.material.uniforms.uSun.value = sun; envSky.material.uniforms.uSun.value = 0;
      water.material.uniforms.uSun.value = sun;
      water.position.set(cam.position.x, WATER_Y, cam.position.z);
      rig.position.set(cam.position.x * .5, 5.5, cam.position.z - 7);
      rig.color.copy(U.uAccent.value);
      fogCol.copy(fogTarget); U.uFogCol.value.lerp(fogCol, .08); scene.fog.color.copy(U.uFogCol.value);
      scene.fog.density = fogDen; U.uFogDen.value = fogDen;
    },
  };
}
