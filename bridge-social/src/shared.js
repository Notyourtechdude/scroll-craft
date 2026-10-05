import * as THREE from 'three';

export const SP = 70;                 // distance between chapter stops along the bridge
export const zOf = (i) => -SP * i;
export const WATER_Y = -9;

export const U = {
  uTime: { value: 0 },
  uScale: { value: 600 },             // point-size scale (px per world unit at depth 1)
  uVel: { value: 0 },
  uPulse: { value: 0 },
  uAccent: { value: new THREE.Color('#d4476f') },
  uCam: { value: new THREE.Vector3() },
  uFogCol: { value: new THREE.Color('#1a0613') },
  uFogDen: { value: 0.0075 },
};

export const CREAM = new THREE.Color('#ead9b0');

export const GLSL = /* glsl */`
float hash11(float n){return fract(sin(n)*43758.5453123);}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 hash31(float n){return fract(sin(vec3(n,n+1.7,n+4.3))*vec3(43758.5453,22578.1459,19642.3490));}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}
`;

// soft round sprite fragment
export const SPRITE_FRAG = /* glsl */`
float spriteAlpha(){float d=length(gl_PointCoord-.5);return smoothstep(.5,.0,d);}
`;

export function additive(extra = {}) {
  return Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }, extra);
}
