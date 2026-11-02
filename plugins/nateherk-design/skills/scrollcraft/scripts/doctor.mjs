#!/usr/bin/env node
/**
 * Preflight. Run this BEFORE the interview, not after the first failure.
 *
 *   node scripts/doctor.mjs            check everything
 *   node scripts/doctor.mjs --probe    also spend one API call to read the balance
 *
 * Every check that can fail deep inside a build with a misleading message is
 * checked here with an honest one. The three that actually bite:
 *
 *   - a STRIPPED ffmpeg on PATH. It carries ~50 filters and silently lacks
 *     scale, fps, psnr and the webp muxer, then fails with "No option name
 *     near ..." or "Unable to choose an output format", both of which read as
 *     a mistake in your command rather than a missing feature.
 *   - no KIE_AI_API_KEY, which only matters if you are generating assets.
 *   - playwright-core resolving from the wrong directory. It is required from
 *     the BUILD folder, not from the skill.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { findChrome, findFfmpeg, isPlaceholderKey } from "./lib/tools.mjs";
import { paths } from "./workspace.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const rows = [];
const add = (sev, name, ok, detail, fix) => rows.push({ sev, name, ok, detail, fix });

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- node ----
const major = Number(process.versions.node.split(".")[0]);
add("required", "node", major >= 18, `v${process.versions.node}`,
  "Install Node 18 or newer.");

// -------------------------------------------------------------- ffmpeg ----
const ff = findFfmpeg();
const ffmpeg = ff?.path || null, filterCount = ff?.filters || 0;
add("required", "ffmpeg (full build)", Boolean(ff?.full),
  ffmpeg ? `${ffmpeg}  (${filterCount} filters)` : "not found",
  "A stripped ffmpeg lacks scale/fps/psnr and the webp muxer. Install a full build (Windows: winget install Gyan.FFmpeg) or set SCROLLCRAFT_FFMPEG to one.");

if (ffmpeg && filterCount > 200) {
  const enc = run(ffmpeg, ["-hide_banner", "-encoders"]) || "";
  add("optional", "  └ libwebp encoder", /libwebp/.test(enc),
    /libwebp/.test(enc) ? "present" : "missing",
    "Posters fall back to JPEG. Not fatal, just heavier.");
}

// ---------------------------------------------------------- playwright ----
let pw = false, pwWhere = "";
try {
  createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
  pw = true; pwWhere = "resolves from cwd";
} catch {
  try {
    createRequire(path.join(HERE, "package.json"))("playwright-core");
    pw = true; pwWhere = "resolves from the skill, but NOT from cwd";
  } catch { pwWhere = "not installed"; }
}
add("verify", "playwright-core", pw, pwWhere,
  "Run `npm i playwright-core` inside the build folder. Only needed for the verification pass.");

const chrome = findChrome();
add("verify", "Chrome", Boolean(chrome), chrome || "not found",
  "Install Chrome, or set SCROLLCRAFT_CHROME to an executable.");

// ------------------------------------------------------------- kie key ----
// Mirrors kie.mjs: the environment wins, then the nearest .env walking up.
function findKey() {
  if (process.env.KIE_AI_API_KEY) return { where: "env", value: process.env.KIE_AI_API_KEY };
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, ".env");
    const m = fs.existsSync(p) && fs.readFileSync(p, "utf8").match(/^\s*KIE_AI_API_KEY\s*=\s*(\S.*?)\s*$/m);
    if (m) return { where: p, value: m[1].replace(/^["']|["']$/g, "") };
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const key = findKey();
// .env.example ships a placeholder, and copying it to .env is the documented
// first step. Treating that as a key sends a guaranteed-401 request later.
const placeholder = key && isPlaceholderKey(key.value);
const keyWhere = key && !placeholder ? key.where : null;
add("optional", "KIE_AI_API_KEY", Boolean(keyWhere),
  placeholder ? `placeholder value in ${key.where}` : keyWhere || "not set",
  placeholder
    ? "Replace the placeholder with a real key from https://kie.ai, or leave it unset to build from your own assets."
    : "Only needed to GENERATE imagery. Building from your own photos and footage needs no key and no spend. Copy .env.example to .env to set one.");

// ----------------------------------------------------------- workspace ----
let ws = null;
try {
  ws = paths();
  add("required", "workspace", true, `${ws.workspace}\n      via ${ws.via}`, "");
  add("optional", "  └ registry", fs.existsSync(ws.fingerprints),
    fs.existsSync(ws.fingerprints) ? "present" : "not created yet",
    "Run `node scripts/workspace.mjs --ensure` to create it.");
} catch (e) {
  add("required", "workspace", false, e.message, "Fix or delete the offending .scrollcraft.json.");
}

// -------------------------------------------------------------- report ----
const mark = (r) => (r.ok ? "\u001b[32m ok \u001b[0m" : r.sev === "required" ? "\u001b[31mFAIL\u001b[0m" : "\u001b[33mwarn\u001b[0m");
console.log("\nscrollcraft preflight\n");
for (const r of rows) {
  console.log(` [${mark(r)}] ${r.name.padEnd(22)} ${r.detail}`);
  if (!r.ok && r.fix) console.log(`        ${"\u001b[2m"}${r.fix}${"\u001b[0m"}`);
}

const hardFails = rows.filter((r) => !r.ok && r.sev === "required");
const softFails = rows.filter((r) => !r.ok && r.sev !== "required");
console.log("");
if (hardFails.length) {
  console.log(`\u001b[31m${hardFails.length} required check(s) failed. Fix these before building.\u001b[0m\n`);
  process.exit(1);
}
console.log(softFails.length
  ? `\u001b[33mReady, with ${softFails.length} optional item(s) missing (see above).\u001b[0m\n`
  : "\u001b[32mReady.\u001b[0m\n");

if (process.argv.includes("--probe") && keyWhere) {
  try {
    console.log("credit: " + execFileSync(process.execPath, [path.join(HERE, "kie.mjs"), "probe"], { encoding: "utf8" }).trim().replace(/^credit:\s*/, ""));
  } catch (e) { console.log("balance probe failed: " + e.message); }
}
