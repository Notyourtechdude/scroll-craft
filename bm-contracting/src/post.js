import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { POST_FS } from './shaders.js';

export function createPost(renderer, scene, camera, { mobile }) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), mobile ? .5 : .75, .7, .85);
  composer.addPass(bloom);
  const fx = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVel: { value: 0 }, uFade: { value: 0 }, uFlash: { value: 0 }, uImpact: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: POST_FS,
  });
  composer.addPass(fx);
  composer.addPass(new OutputPass());
  return {
    composer,
    setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); },
    update(time, vel, fade, bloomK, flash = 0, impact = 0) {
      fx.uniforms.uTime.value = time;
      fx.uniforms.uVel.value = vel;
      fx.uniforms.uFade.value = fade;
      fx.uniforms.uFlash.value = flash;
      fx.uniforms.uImpact.value = impact;
      bloom.strength = (mobile ? .5 : .75) * bloomK;
    },
  };
}
