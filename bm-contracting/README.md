# BM Contracting: Scroll-Scrubbed 3D Build Experience

An Active Theory-inspired immersive scrollytelling site. One continuous WebGL world; scroll is the timeline.
A construction site is surveyed, excavated, founded, framed in steel, glazed and finally lit up inside a city
at night while the camera, sky, sun and soundtrack move with your scroll position.

## Run

    npm install
    npm run dev       # http://localhost:5173
    npm run build     # static site in dist/

Deep link to any moment: `/?p=0.5` (0 to 1).

## What is in the scene

- **Scrubbed build**: every beam, column, slab, glass panel and building is an instance with its own birth time,
  grown in the vertex shader from the scroll value, with a hot leading edge as it appears (`src/shaders.js`).
- **Camera rail**: Catmull-Rom spline through 15 keyframes (`src/rig.js`), plus mouse parallax, drift, scroll-velocity FOV and roll.
- **Time of day**: blueprint night, day, golden hour, lit night. Sky, fog, sun, ambient and window lights all keyed to scroll (`src/env.js`).
- **Terrain**: contour-line shader with a survey pulse, and a pit that excavates as you scroll.
- **Tower crane** with moving trolley, cable and load. It lifts steel while the frame rises and retracts at handover.
- **City** ripples up around the finished tower, windows lighting on.
- **Particles** that your cursor pushes away (ray-distance displacement in the vertex shader).
- **Post**: bloom, scroll-velocity chromatic aberration and lens warp, grain, vignette.
- **Generative sound** (opt-in): drone and wind driven by scroll speed, metallic clank on each chapter.
- Custom cursor, chapter rail, live HUD readouts, per-character scrubbed headlines, mobile layout, reduced-motion support.

## Editing the copy

Everything is in `src/content.js`. Chapters, headlines, body text, tags, site URL and CTA label.
The reference site could not be fetched when this was built, so the wording is written for a general
contractor. Replace it with the company's real services and claims.
