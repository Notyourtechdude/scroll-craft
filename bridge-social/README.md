# Bridge Social — Cross the Bridge

A scroll-scrubbed, WebGL scrollytelling experience built from the Bridge Social company profile
(Active Theory–style: one persistent 3D world, camera on a spline driven by scroll, HTML narrative scrubbed against it).

**Concept.** The company's whole pitch is *being the bridge* (the logo is a B standing on arches, the profile is full of
misty gothic bridges and chess pieces). So the page is a night crossing: you walk a checkerboard viaduct across dark water
toward a rising sun, and every service pillar is a 3D "station" you pass.

| # | Chapter | 3D station (scrubbed by scroll) |
|---|---------|----------------------------------|
| 01 | Arrive | The B + three-arch logo condensing from ~9k particles (cursor pushes them) |
| 02 | Overview | Chrome chess king on a checkerboard — Vision / Mission |
| 03 | Marketing | Broadcast rings + a 12-card orbit; scroll rotates the active service to the front |
| 04 | Event Entertainment | 1,500-light drone swarm morphing dome → starburst → logo → grid, plus GPU fireworks |
| 05 | F&B Advisory | Wine glass filling as you scroll, steam, five orbiting service beads, a ScanConnect QR panel |
| 06 | Corporate Events | Towers rising on a stage, spotlight sweeps, trophy star, trade-show booths |
| 07 | VIP Luxury Concierge | Dotted globe, Dubai → six destination arcs (one per service), a private jet flying the active route |
| 08 | Contact | The logo reforms inside a giant gate against the sunrise; torn-paper "Contact us !" |

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Interaction

- Scroll / drag / touch · `↑ ↓ Space` jump chapters · `Chapters` menu · rail dots
- Move the mouse: camera parallax + the particle logo parts around your cursor
- Click anywhere: shockwave (water ripples, bloom, ember burst, chime)
- Sound toggle: generative pad that shifts chord per chapter and opens its filter with scroll speed

## Under the hood

- `three` + custom `ShaderMaterial`s for nearly everything (sky, water, gates, swarm, fireworks, globe…), no model files
- Post chain: UnrealBloom → custom pass (scroll-velocity radial blur + chromatic aberration, vignette, wine grade, grain) → ACES output
- `lenis` smooth scroll; one master progress value `p` → fractional chapter index → camera rig, fog, accent colour, sun, bloom
- Adaptive pixel ratio; reduced particle counts on touch/small screens
- Copy and contact details are taken verbatim from the company profile (`src/content.js`)
