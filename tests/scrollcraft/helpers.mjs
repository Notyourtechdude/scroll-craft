// Shared plumbing for the scrollcraft regression suite.
//
// The suite drives the real engine, the real scripts and a real browser. Media
// is generated with ffmpeg at test time (the repo ignores *.mp4/*.webm), and
// fixture clips are VP9 WebM because Playwright's bundled Chromium ships
// without an h264 decoder. Point SCROLLCRAFT_CHROME at an installed Chrome to
// run against the browser the skill itself requires.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SKILL = path.join(REPO, "plugins/nateherk-design/skills/scrollcraft");
export const SCRIPTS = path.join(SKILL, "scripts");
export const MEDIA = path.join(REPO, "tests/scrollcraft/.media");
export const OUT = path.join(REPO, "tests/scrollcraft/.out");

export const CHROME = process.env.SCROLLCRAFT_CHROME || chromium.executablePath();

const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(" ")}\n${r.stderr}`);
};

/** Builds the fixture media once per run: a scrub clip, a poster, a frame sequence. */
export function ensureMedia() {
  const done = path.join(MEDIA, ".complete");
  if (fs.existsSync(done)) return;
  fs.mkdirSync(path.join(MEDIA, "frames"), { recursive: true });
  // Dense GOP for the same reason encode.sh uses one: the suite seeks it.
  ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=320x180:rate=24", "-t", "2",
    "-c:v", "libvpx-vp9", "-g", "4", "-b:v", "300k", "-an", path.join(MEDIA, "clip.webm")]);
  ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=320x180", "-frames:v", "1", path.join(MEDIA, "poster.png")]);
  ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=160x90:rate=10", "-t", "1",
    path.join(MEDIA, "frames", "f%02d.png")]);
  ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=640x360:rate=24", "-t", "2", "-an",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(MEDIA, "src-360p.mp4")]);
  fs.writeFileSync(done, "");
}

export async function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Starts the skill's own serve.mjs over the repo root. */
export async function startServe(root = REPO) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(SCRIPTS, "serve.mjs"), "--root", root, "--port", String(port)],
    { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serve.mjs did not start")), 5000);
    child.stdout.on("data", () => { clearTimeout(t); resolve(); });
    child.on("exit", (code) => { clearTimeout(t); reject(new Error(`serve.mjs exited ${code}`)); });
  });
  return { port, base: `http://127.0.0.1:${port}`, child, stop: () => child.kill() };
}

export async function launch() {
  return chromium.launch({ executablePath: CHROME });
}

/** Runs a skill script to completion and returns its exit code and output. */
export function runScript(file, args, opts = {}) {
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, file), ...args], {
    encoding: "utf8", timeout: 180_000, ...opts,
    env: { ...process.env, SCROLLCRAFT_CHROME: CHROME, ...(opts.env || {}) },
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

/** Scrolls and waits two frames so the engine's rAF read has run. */
export async function scrollTo(page, y) {
  await page.evaluate((y) => new Promise((res) => {
    scrollTo({ top: y, behavior: "instant" });
    requestAnimationFrame(() => requestAnimationFrame(res));
  }), y);
}

/** [r, g, b] from a CSS colour string in #rgb, #rrggbb or rgb()/rgba() form. */
export const rgbOf = (s) => {
  const str = String(s).trim();
  const hex = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  return (str.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
};
