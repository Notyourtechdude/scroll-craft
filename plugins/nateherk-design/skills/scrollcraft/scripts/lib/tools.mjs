/**
 * Locating the binaries the skill depends on. One copy, so doctor.mjs reports
 * exactly the Chrome and ffmpeg that shoot.mjs and worldflight-assert.mjs will
 * then use. (encode.sh keeps a bash twin of findFfmpeg; keep the two in step.)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const home = () => process.env.USERPROFILE || process.env.HOME || "";

/**
 * An INSTALLED Chrome or Edge, never Playwright's bundled Chromium: that build
 * ships without an h264 decoder, so every scrub clip would silently fail to
 * paint and a verification run would "pass" against posters.
 */
export function chromeCandidates() {
  const local = process.env.LOCALAPPDATA || path.join(home(), "AppData/Local");
  return [
    process.env.SCROLLCRAFT_CHROME,
    // Windows (machine-wide, then the per-user installer's location)
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    path.join(local, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(home(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ].filter(Boolean);
}

export function findChrome() {
  return chromeCandidates().find((p) => fs.existsSync(p)) || null;
}

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

function wingetFfmpegs() {
  const base = path.join(home(), "AppData/Local/Microsoft/WinGet/Packages");
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const d of fs.readdirSync(base)) {
    if (!/^Gyan\.FFmpeg/i.test(d)) continue;
    const inner = path.join(base, d);
    for (const e of fs.readdirSync(inner)) {
      const p = path.join(inner, e, "bin/ffmpeg.exe");
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

/**
 * The ffmpeg with the most filters. Toolchains such as Remotion put a stripped
 * build first on PATH that carries ~50 filters and lacks scale/fps/tile, then
 * reports the missing filter as a syntax error in your command. A full build
 * has several hundred.
 *
 * Returns { path, filters, full } or null if no ffmpeg runs at all.
 */
export function findFfmpeg() {
  const candidates = [
    process.env.SCROLLCRAFT_FFMPEG,
    "ffmpeg",
    ...wingetFfmpegs(),
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "/snap/bin/ffmpeg",
  ].filter(Boolean);
  let best = null;
  for (const c of candidates) {
    const out = run(c, ["-hide_banner", "-filters"]);
    if (!out) continue;
    const filters = out.split("\n").length;
    if (!best || filters > best.filters) best = { path: c, filters };
    if (filters > 200) break;
  }
  return best && { ...best, full: best.filters > 200 };
}

/** Plain text a .env.example ships with; never a real key. */
export const isPlaceholderKey = (v) => !v || /^(your[-_ ]?key[-_ ]?here|changeme|xxx+|<.*>)$/i.test(v.trim());
