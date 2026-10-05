export const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vn(p); p *= 2.03; a *= .5; } return s; }
`;

/* ---------------------------------------------------------------- sky */
export const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.);
  gl_Position = p.xyww;
}`;
export const SKY_FS = /* glsl */ `
uniform vec3 uTop, uHor, uSunCol, uFogCol; uniform vec3 uSunDir; uniform float uNight, uTime;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHor, uTop, pow(clamp(h, 0., 1.), .55));
  col = mix(col, uFogCol, smoothstep(.0, -.25, h));
  float s = max(dot(d, normalize(uSunDir)), 0.);
  col += uSunCol * (pow(s, 900.) * 2.5 + pow(s, 18.) * .35 + pow(s, 3.) * .08);
  // stars
  vec3 q = d * 140.;
  vec3 c = floor(q);
  float r = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float tw = .6 + .4 * sin(uTime * 2. + r * 40.);
  float star = step(.9965, r) * smoothstep(.5, 1., 1. - length(fract(q) - .5) * 1.6) * tw;
  col += vec3(.7, .85, 1.) * star * uNight * smoothstep(0., .25, h) * 2.2;
  gl_FragColor = vec4(col, 1.);
}`;

/* ------------------------------------------------------------ terrain */
export const TERRAIN_VS = /* glsl */ `
uniform float uExc;
varying vec3 vW; varying float vH;
${NOISE}
float height(vec2 p){
  float r = length(p);
  float und = (fbm(p * .05) - .35) * 3. * smoothstep(12., 40., r);
  float d = max(abs(p.x) - 7.4, abs(p.y) - 5.9);
  float pit = 1. - smoothstep(0., 2.8, d);
  return und - pit * 2.3 * uExc;
}
void main(){
  vec3 pos = position;
  float h = height(pos.xz);
  pos.y = h; vH = h;
  vec4 w = modelMatrix * vec4(pos, 1.);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
export const TERRAIN_FS = /* glsl */ `
uniform vec3 uHot, uCyan, uSunDir, uSunCol, uAmb, uFogCol;
uniform float uFogDen, uScanR, uDay, uTime;
varying vec3 vW; varying float vH;
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.) n = -n;
  float r = length(vW.xz);
  float f = vH * 1.1 + .37;
  float aa = max(fwidth(f), 1e-4);
  float line = (1. - smoothstep(0., aa * 1.6, abs(fract(f + .5) - .5))) * (1. - smoothstep(.25, .6, aa));
  vec2 gp = vW.xz / 4.;
  vec2 g = abs(fract(gp + .5) - .5), ga = max(fwidth(gp), vec2(1e-4));
  float grid = 1. - smoothstep(0., 1.4, min(g.x / ga.x, g.y / ga.y));
  float reveal = smoothstep(uScanR, uScanR - 12., r);
  float pitD = max(abs(vW.x) - 7.4, abs(vW.z) - 5.9);
  float pitK = smoothstep(-.5, 3.5, pitD);
  line *= pitK;
  float ring = exp(-pow((r - uScanR) / 1.3, 2.)) * step(uScanR, 119.);
  vec3 ground = mix(vec3(.012, .03, .06), vec3(.2, .185, .16), uDay);
  float diff = max(dot(n, normalize(uSunDir)), 0.);
  vec3 col = ground * (uAmb + uSunCol * diff);
  vec3 lc = mix(uCyan, vec3(.95, .7, .4), uDay * .7);
  col += lc * (line * .5 + grid * .28) * reveal * (1. - .55 * uDay);
  col += uHot * ring * 1.6;
  // sweeping survey pulse
  float pulse = exp(-pow(fract(r * .035 - uTime * .08) - .5, 2.) * 90.);
  col += uCyan * pulse * grid * reveal * .35 * (1. - uDay);
  float dist = length(vW - cameraPosition);
  col = mix(col, uFogCol, 1. - exp(-pow(dist * ${'0.0105'}, 2.)));
  gl_FragColor = vec4(col, 1.);
}`;

/* ------------------------------------------------- instanced build mat */
const BUILD_COMMON_VS = /* glsl */ `
uniform float uP; uniform vec2 uDeath;
attribute float aBirth; attribute float aDur; attribute float aMode; attribute vec3 aCol; attribute float aRnd;
varying vec3 vN, vW, vCol; varying vec2 vUv, vDim; varying float vEdge, vRnd;
float eo(float x){ return 1. - pow(1. - x, 3.); }
void main(){
  float t = clamp((uP - aBirth) / aDur, 0., 1.);
  float death = smoothstep(uDeath.x, uDeath.y, uP);
  float e = eo(t) * (1. - death);
  vec3 p = position;
  vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 s;
  if (aMode < .5){ p.y = (p.y + .5) * e - .5; s = sc * vec3(1., e, 1.); }
  else { p *= e; s = sc * e; }
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec3 an = abs(normal);
  vDim = an.x > .5 ? s.zy : (an.y > .5 ? s.xz : s.xy);
  vUv = uv; vCol = aCol; vRnd = aRnd;
  float act = (t > 0. && t < 1.) ? pow(1. - t, 1.4) : 0.;
  vEdge = max(act, death * (1. - death) * 4.);
  gl_Position = e < .0005 ? vec4(2., 2., 2., 1.) : projectionMatrix * viewMatrix * w;
}`;
export const BUILD_VS = BUILD_COMMON_VS;

export const BUILD_FS = /* glsl */ `
uniform vec3 uBase, uGlow, uHot, uSunCol, uAmb, uFogCol; uniform vec3 uSunDir;
uniform float uFogDen, uEdgeW, uRim, uDay, uLights, uWin, uTime;
varying vec3 vN, vW, vCol; varying vec2 vUv, vDim; varying float vEdge, vRnd;
${NOISE}
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 V = normalize(cameraPosition - vW);
  float diff = max(dot(n, normalize(uSunDir)), 0.);
  float hemi = .5 + .5 * n.y;
  vec3 col = uBase * vCol * (uAmb * (.6 + .6 * hemi) + uSunCol * diff);
  float fres = pow(1. - max(dot(n, V), 0.), 3.);
  float gs = mix(1., .14, uDay);
  col += uGlow * fres * uRim * gs;
  vec2 q = min(vUv, 1. - vUv) * vDim;
  float ed = 1. - smoothstep(0., uEdgeW, min(q.x, q.y));
  col += uGlow * ed * (.5 + vEdge * 2.) * gs;
  col += uHot * vEdge * (.5 + ed * 3.);
  if (uWin > .5 && abs(n.y) < .5){
    vec2 wp = vec2((vW.x + vW.z) * .7, vW.y * .6);
    vec2 cell = floor(wp), fr = fract(wp);
    float win = step(.2, fr.x) * step(fr.x, .8) * step(.22, fr.y) * step(fr.y, .78);
    float on = step(h21(cell + vRnd * 37.), .5);
    col = mix(col, col * .5 + uSunCol * .02, win * (1. - uLights));
    col += vec3(1., .72, .38) * win * on * uLights * 1.8;
  }
  float dist = length(vW - cameraPosition);
  col = mix(col, uFogCol, 1. - exp(-pow(dist * ${'0.0105'}, 2.)));
  gl_FragColor = vec4(col, 1.);
}`;

/* -------------------------------------------------------------- facade */
export const FACADE_FS = /* glsl */ `
uniform vec3 uTop, uHor, uGlow, uHot, uFogCol;
uniform float uFogDen, uLights, uTime, uDay;
varying vec3 vN, vW, vCol; varying vec2 vUv, vDim; varying float vEdge, vRnd;
${NOISE}
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 V = normalize(cameraPosition - vW);
  float ndv = max(dot(n, V), 0.);
  float fres = pow(1. - ndv, 2.4);
  vec3 R = reflect(-V, n);
  vec3 refl = mix(uHor, uTop, clamp(R.y * 1.3 + .15, 0., 1.));
  vec3 deep = vec3(.015, .05, .09) + uTop * .25;
  vec3 glass = mix(deep, refl, .25 + fres * .75);
  vec2 q = min(vUv, 1. - vUv) * vDim;
  float ed = 1. - smoothstep(0., .035, min(q.x, q.y));
  float flick = .85 + .15 * sin(uTime * 1.3 + vRnd * 60.);
  float lit = step(vRnd, .55) * uLights;
  vec3 warm = vec3(1., .74, .4) * (1.2 + vRnd) * flick;
  vec3 col = glass * (.55 + .5 * uDay);
  col = mix(col, warm, lit * .55 * (1. - fres * .6));
  col += uGlow * ed * .9 * mix(1., .35, uDay);
  col += uHot * vEdge * (.6 + ed * 3.);
  float dist = length(vW - cameraPosition);
  col = mix(col, uFogCol, 1. - exp(-pow(dist * ${'0.0105'}, 2.)));
  float alpha = clamp(mix(.28, .88, fres) + lit * .35 + ed * .6 + vEdge * .5, 0., 1.);
  gl_FragColor = vec4(col, alpha);
}`;

/* ------------------------------------------------------------ particles */
export const PART_VS = /* glsl */ `
uniform float uTime, uPix, uVel; uniform vec3 uRO, uRD; uniform vec3 uCenter;
attribute float aSeed; attribute float aSize;
varying float vA; varying float vSeed;
void main(){
  vec3 p = position;
  float t = uTime * .06;
  p.x += sin(t * 3. + aSeed * 40.) * 1.4 + t * 2.;
  p.y += sin(t * 2.3 + aSeed * 23.) * 1.1;
  p.z += cos(t * 2.7 + aSeed * 31.) * 1.4;
  p = uCenter + mod(p - uCenter + vec3(70., 30., 70.), vec3(140., 60., 140.)) - vec3(70., 30., 70.);
  // mouse ray repulsion
  vec3 oc = p - uRO; float tt = max(dot(oc, uRD), 0.);
  vec3 d = p - (uRO + uRD * tt); float dist = length(d);
  p += normalize(d + 1e-4) * smoothstep(7., 0., dist) * 4.5;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dd = -mv.z;
  vA = smoothstep(150., 10., dd) * (.35 + .65 * fract(aSeed * 7.1));
  vSeed = aSeed;
  gl_PointSize = aSize * uPix * (1. + abs(uVel) * 1.5) * (60. / max(dd, 1.));
}`;
export const PART_FS = /* glsl */ `
uniform vec3 uColA, uColB; uniform float uLights;
varying float vA; varying float vSeed;
void main(){
  vec2 c = gl_PointCoord - .5;
  float d = length(c);
  float a = smoothstep(.5, 0., d);
  vec3 col = mix(uColA, uColB, step(.82, fract(vSeed * 13.7)));
  gl_FragColor = vec4(col * a * vA * 1.6, a * vA);
}`;

/* ----------------------------------------------------------- rebar mesh */
export const REBAR_VS = /* glsl */ `
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
export const REBAR_FS = /* glsl */ `
uniform float uR; uniform vec3 uCol; uniform float uFade;
varying vec3 vP;
void main(){
  float k = (vP.x + 6.4) / 12.8;
  if (k > uR) discard;
  float head = smoothstep(.06, 0., uR - k);
  gl_FragColor = vec4(uCol * (1. + head * 3.), uFade);
}`;

/* ---------------------------------------------------------------- post */
export const POST_FS = /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime, uVel, uFade;
varying vec2 vUv;
void main(){
  vec2 c = vUv - .5;
  float r2 = dot(c, c);
  vec2 uv = .5 + c * (1. + r2 * uVel * .22);
  float ca = (.0014 + abs(uVel) * .011) * (r2 * 3.2 + .25);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + c * ca).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - c * ca).b;
  col *= 1. - smoothstep(.3, 1., length(c) * 1.3) * .62;
  float g = fract(sin(dot(uv * 900. + fract(uTime) * 61., vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - .5) * .016 * (.4 + dot(col, vec3(.33)));
  col *= uFade;
  gl_FragColor = vec4(col, 1.);
}`;
