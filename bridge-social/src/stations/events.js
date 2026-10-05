import * as THREE from 'three';
import { U, additive } from '../shared.js';
import { sstep, rng, isMobile } from '../util.js';

export function createEvents(logoPts) {
  const g = new THREE.Group(); g.userData.focusY = 8;
  const N = isMobile ? 700 : 1500, R = rng(21);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), D = new Float32Array(N * 3), S = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    // A: dome of lights (fibonacci sphere)
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    A.set([Math.cos(th) * r * 6.2, y * 6.2, Math.sin(th) * r * 6.2], i * 3);
    // B: star burst (spikes)
    const k = i % 10, an = (k / 10) * Math.PI * 2, rad = 1 + (i / N) * 8.5;
    const wob = Math.sin(an * 5) * .0;
    B.set([Math.cos(an) * rad, Math.sin(an) * rad, (R() - .5) * 2.4 + wob], i * 3);
    // C: the B logo, big
    const lp = (i * 2) % logoPts.length; C.set([logoPts[lp] * 14, logoPts[lp + 1] * 14, (R() - .5) * .8], i * 3);
    // D: aerial grid / stage lattice
    const gx = i % 40, gz = Math.floor(i / 40) % 40; D.set([(gx - 20) * .55, (R() - .5) * 1.2 + Math.sin(gx * .5) * Math.cos(gz * .5) * 1.4, (gz - 20) * .5 - 0], i * 3);
    S.set([R(), R(), R(), R()], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(A, 3));
  geo.setAttribute('aB', new THREE.BufferAttribute(B, 3)); geo.setAttribute('aC', new THREE.BufferAttribute(C, 3)); geo.setAttribute('aD', new THREE.BufferAttribute(D, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(S, 4));
  const uMorph = { value: 0 }, uShow = { value: 0 };
  const swarm = new THREE.Points(geo, new THREE.ShaderMaterial(additive({
    uniforms: { ...U, uMorph, uShow },
    vertexShader: `uniform float uTime,uScale,uMorph,uShow,uPulse; attribute vec3 aB,aC,aD; attribute vec4 aS; varying float vA; varying vec3 vCol;
      float e(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
      void main(){
        vec3 p=position;
        p=mix(p,aB,e(uMorph-0.)); p=mix(p,aC,e(uMorph-1.)); p=mix(p,aD,e(uMorph-2.));
        float m=uMorph; vec3 sc=(aS.xyz-.5)*50.; p=mix(sc,p,e(uShow*1.2-aS.w*.2));
        p+=vec3(sin(uTime*1.3+aS.x*40.),cos(uTime*1.1+aS.y*40.),sin(uTime*.9+aS.z*40.))*.12;
        // slow rotation
        float a=uTime*.12*(1.-e(m-.5)*0.6); float c=cos(a),s=sin(a); p.xz=mat2(c,-s,s,c)*p.xz*(1.-e(m-1.)*.0);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float blink=.55+.45*sin(uTime*(2.+aS.w*4.)+aS.x*60.);
        gl_PointSize=clamp((.2+aS.y*.12+uPulse*.2)*uScale/-mv.z,1.,40.); vA=blink*e(uShow*3.);
        vCol=mix(vec3(1.,.82,.5),vec3(1.,.4,.62),aS.z)*(1.+step(.96,aS.x)*2.); }`,
    fragmentShader: `varying float vA; varying vec3 vCol; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vCol*a*vA,a*vA);}`,
  })));
  swarm.frustumCulled = false; g.add(swarm);

  // fireworks: 6 bursts looping on the GPU
  const BN = 6, PER = isMobile ? 110 : 220, FN = BN * PER, fp = new Float32Array(FN * 3), fd = new Float32Array(FN * 4);
  const centers = [[-8, 7, -4], [9, 10, -8], [0, 13, -2], [-13, 11, -12], [13, 5, 2], [2, 8, -14]];
  for (let b = 0; b < BN; b++) for (let k = 0; k < PER; k++) {
    const i = b * PER + k, u = R() * 2 - 1, ph = R() * 6.2832, rr = Math.sqrt(1 - u * u), sp = .5 + R() * .5;
    fp.set(centers[b], i * 3); fd.set([Math.cos(ph) * rr * sp, u * sp, Math.sin(ph) * rr * sp, b + R() * .02], i * 4);
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('aD', new THREE.BufferAttribute(fd, 4));
  const uInt = { value: 0 };
  const fw = new THREE.Points(fg, new THREE.ShaderMaterial(additive({
    uniforms: { ...U, uInt },
    vertexShader: `uniform float uTime,uScale,uInt,uPulse; attribute vec4 aD; varying float vA; varying vec3 vC;
      void main(){ float b=floor(aD.w); float T=3.2; float t=mod(uTime*.7+b*.57,T); float q=t/T; float ex=1.-exp(-q*7.);
        vec3 p=position+aD.xyz*ex*12.; p.y-=q*q*7.; 
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float life=pow(1.-q,1.6)*smoothstep(0.,.03,q); float fl=.6+.4*sin(uTime*30.+aD.x*90.);
        gl_PointSize=clamp((.22+uPulse*.15)*uScale/-mv.z*(1.+(1.-q)),1.,60.); vA=life*fl*uInt;
        vec3 pal[4]; pal[0]=vec3(1.,.78,.35);pal[1]=vec3(1.,.35,.55);pal[2]=vec3(.7,.5,1.);pal[3]=vec3(1.,.95,.85);
        int ci=int(mod(b+floor(uTime*.7/T+b*.17),4.)); vC=ci==0?pal[0]:ci==1?pal[1]:ci==2?pal[2]:pal[3]; }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*a*vA*1.6,a*vA);}`,
  })));
  fw.frustumCulled = false; g.add(fw);
  // launch pad ring + stage
  const pad = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.7, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46b').multiplyScalar(1.8), side: THREE.DoubleSide, transparent: true, opacity: .8 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = -6; g.add(pad);
  const pad2 = pad.clone(); pad2.scale.setScalar(.6); g.add(pad2);

  return {
    group: g,
    update(local, ctx) {
      uShow.value += (sstep(0.0, .22, local) - uShow.value) * .06;
      uMorph.value += (Math.min(2.99, Math.max(0, local * 3.0 - .2)) - uMorph.value) * .07;
      uInt.value = sstep(.12, .5, local) * (.7 + .3 * Math.sin(ctx.time));
      pad.rotation.z = ctx.time * .2; pad2.rotation.z = -ctx.time * .3;
    },
  };
}
