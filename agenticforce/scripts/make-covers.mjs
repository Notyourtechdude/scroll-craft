// Renders the project cover art in public/work/ with headless Chromium.
//
// The covers are generated rather than downloaded so they are same-origin:
// WebGL refuses to upload a cross-origin image without CORS headers, and the
// helix waits for every card's texture before it plays its arrival.
//
//   node scripts/make-covers.mjs
//
// Swap any cover for a real screenshot of the site (2:1, ~1600x800 JPEG) and
// keep the filename.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright"));
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "public", "work");
await mkdir(out, { recursive: true });

const covers = [
  { file: "connect-agentic", label: "connect-agentic.com", hues: [190, 260], seed: 3 },
  { file: "elite-professional", label: "eliteprofessionaluae.com", hues: [38, 18], seed: 7 },
  { file: "white-aardvark", label: "white-aardvark", hues: [150, 200], seed: 11 },
  { file: "goldenrod-eagle", label: "goldenrod-eagle", hues: [48, 330], seed: 19 },
  { file: "arena", label: "arena.site", hues: [280, 210], seed: 23 },
];

const page = (c) => `<!doctype html><html><body style="margin:0;background:#0b0b0d">
<canvas id="c" width="1600" height="800"></canvas>
<script>
// Scoped: setContent reuses the page's global realm between covers.
(() => {
const c = document.getElementById('c'), x = c.getContext('2d');
let s = ${c.seed};
const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const [h1, h2] = ${JSON.stringify(c.hues)};
const g = x.createLinearGradient(0, 0, 1600, 800);
g.addColorStop(0, 'hsl(' + h1 + ' 45% 9%)');
g.addColorStop(1, 'hsl(' + h2 + ' 50% 14%)');
x.fillStyle = g; x.fillRect(0, 0, 1600, 800);
for (let i = 0; i < 7; i++) {
  const cx = r() * 1600, cy = r() * 800;
  const rg = x.createRadialGradient(cx, cy, 0, cx, cy, 260 + r() * 420);
  const h = i % 2 ? h1 : h2;
  rg.addColorStop(0, 'hsla(' + h + ', 85%, ' + (45 + r()*20) + '%, .55)');
  rg.addColorStop(1, 'hsla(' + h + ', 85%, 50%, 0)');
  x.fillStyle = rg; x.fillRect(0, 0, 1600, 800);
}
x.lineWidth = 1.2;
for (let k = 0; k < 90; k++) {
  x.beginPath();
  let px = -20, py = r() * 800;
  x.moveTo(px, py);
  const f = 0.002 + r() * 0.004, a = 40 + r() * 120, ph = r() * 6.28;
  for (px = 0; px <= 1620; px += 10) x.lineTo(px, py + Math.sin(px * f + ph) * a + Math.sin(px * f * 2.7) * a * 0.3);
  x.strokeStyle = 'hsla(' + (k % 2 ? h1 : h2) + ', 90%, 75%, ' + (0.04 + r() * 0.12) + ')';
  x.stroke();
}
x.fillStyle = 'rgba(255,255,255,.92)';
x.font = '600 92px system-ui, sans-serif';
x.textBaseline = 'alphabetic';
x.fillText(${JSON.stringify(c.label)}, 96, 690);
x.font = '500 26px ui-monospace, monospace';
x.fillStyle = 'rgba(255,255,255,.6)';
x.fillText('AGENTICFORCE  /  SELECTED WORK', 100, 128);
})();
</script></body></html>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const tab = await browser.newPage({ viewport: { width: 1600, height: 800 } });
for (const c of covers) {
  await tab.setContent(page(c));
  await tab.locator("#c").screenshot({ path: path.join(out, c.file + ".jpg"), type: "jpeg", quality: 72 });
  console.log("wrote", c.file + ".jpg");
}
await browser.close();
