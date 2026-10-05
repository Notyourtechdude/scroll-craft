import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { U } from './shared.js';
import { isMobile } from './util.js';

const FX = {
  uniforms: { tDiffuse: { value: null }, uTime: U.uTime, uVel: { value: 0 }, uAccent: U.uAccent, uPulse: U.uPulse, uAspect: { value: 1 }, uFlash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uVel,uPulse,uAspect,uFlash; uniform vec3 uAccent; varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uTime)*43758.5453);}
    void main(){
      vec2 d=vUv-.5; float r=length(d*vec2(uAspect,1.)); float v=clamp(abs(uVel),0.,1.);
      float ca=.0003+v*.0022+uPulse*.0015+r*r*.0012;
      // radial speed blur
      vec3 c=vec3(0.); float tot=0.;
      for(int i=0;i<6;i++){ float k=float(i)/5.; float s=1.-k*v*.03; vec2 u=.5+d*s;
        c.r+=texture2D(tDiffuse,.5+d*s*(1.+ca*3.)).r; c.g+=texture2D(tDiffuse,u).g; c.b+=texture2D(tDiffuse,.5+d*s*(1.-ca*3.)).b; tot+=1.; }
      c/=tot;
      c*=1.-smoothstep(.45,1.05,r)*.82;                              // vignette
      c=mix(c,c*vec3(1.06,.93,1.0),.6);                              // wine grade
      float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.12);
      c+=(h(vUv*vec2(1920.,1080.))-.5)*.035;                          // grain
      c+=vec3(1.,.9,.7)*uFlash;
      gl_FragColor=vec4(c,1.);
    }`,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .6, .92);
  composer.addPass(bloom);
  const fx = new ShaderPass(FX); composer.addPass(fx);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, fx,
    setSize(w, h, dpr) { composer.setPixelRatio(dpr); composer.setSize(w, h); fx.uniforms.uAspect.value = w / h; bloom.resolution.set(w / 2, h / 2); },
  };
}
