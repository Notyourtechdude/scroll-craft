# AgenticForce

Marketing site for AgenticForce: a WebGL hero, a scroll-scrubbed handoff into a
dithered helix gallery of client work, a lazy-loading photo gallery, and a
shader cursor.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then bundles to dist/
npm run preview
```

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn token layout in `src/index.css` |
| Components | shadcn structure: `components.json`, `@/components/ui`, `cn()` in `@/lib/utils` |
| Motion | GSAP 3 with ScrollTrigger and ScrollSmoother, via `@gsap/react` |
| 3D | three + React Three Fiber (hero scene, cursor follower) |
| Icons | lucide-react |

## Where things live

```
src/
  components/ui/dither-helix-carousel.tsx   the integrated helix component (unchanged)
  components/demo/                          its original demo
  components/site-nav.tsx                   persistent nav + animated menu overlay
  components/lazy-image.tsx                 IntersectionObserver lazy image
  sections/hero.tsx                         pinned hero, scrubbed handoff to #work
  sections/work.tsx                         helix + project index
  sections/gallery.tsx                      lazy, parallax photo grid
  three/hero-scene.tsx                      R3F noise-displaced form + dust
  three/cursor-follower.tsx                 shader blob that trails the pointer
  lib/preferences.tsx                       localStorage-backed preferences
  data/site.ts                              projects, photos, contact link
scripts/make-covers.mjs                     regenerates public/work/*.jpg
```

### Why `components/ui`

shadcn's CLI installs every component into the folder named by `aliases.ui` in
`components.json` (here `@/components/ui`). Keeping hand-copied components such
as the helix in the same folder means `npx shadcn add ...` drops new pieces next
to them, imports stay `@/components/ui/<name>`, and nothing has to be moved later.

## Editing content

All copy that changes per client is in `src/data/site.ts`:

- `projects`: the five sites shown in the helix and the index. Names for the
  Hostinger and Arena preview builds come from their hostnames; rename freely.
- `site.contactHref`: where "Start a project" goes. It currently points at
  connect-agentic.com; swap in a `mailto:` or booking link.
- `shots`: Unsplash photo ids for the gallery.

The helix covers in `public/work/` are generated, not screenshots. WebGL can
only sample cross-origin images that send CORS headers, and the helix waits for
every texture before it plays, so covers are kept same-origin. To use real
screenshots, save them as 2:1 JPEGs (about 1600x800) under the same filenames.

## Performance notes

- three and R3F (~245 kB gzip) load in their own lazy chunk, after the page has
  painted.
- The hero stops its render loop once the gallery panel covers it, and steps
  its pixel ratio down if frames run over budget (`three/adaptive-dpr.tsx`).
  Phones get about a quarter of the geometry.
- The helix mounts only within about a screen of the viewport and releases its
  WebGL context when you scroll well away, because it renders every frame while
  mounted.
- Gallery photos are requested only as they approach, with `srcset` sized to
  the screen.
- On touch devices, and when motion is reduced, ScrollSmoother is off and native
  scrolling is used.

## Preferences (localStorage)

`agenticforce:prefs:v1` holds theme (dark by default), motion (system, full or
reduced) and cursor (shader or system). They are applied before first paint by
an inline script in `index.html`, so a saved light theme never flashes dark,
and they sync across open tabs. `agenticforce:visit:v1` records that the intro
has been seen, so returning visitors skip it and can use the page straight away.

## Browser support

Current Chrome, Edge, Firefox and Safari (desktop and iOS). The hero and the
cursor need WebGL2; without it the hero falls back to a CSS gradient and the
helix to a native scroll-snap list. Every localStorage call is wrapped, so
private browsing that blocks storage still works, just without memory.

## Known trade-off

The helix captures the wheel (and vertical drags on touch) while the pointer is
over it. That is how you turn it, but it also means page scrolling pauses there.
The frame is kept shorter than the viewport so there is always room around it
to keep scrolling.
