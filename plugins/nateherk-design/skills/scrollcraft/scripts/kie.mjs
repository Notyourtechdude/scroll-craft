#!/usr/bin/env node
/**
 * scrollcraft asset generator: kie.ai unified jobs API.
 *
 *   POST https://api.kie.ai/api/v1/jobs/createTask   { model, input }
 *   GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...
 *
 * COMMANDS
 *   still  <prompt> <out.png> [--ar 16:9] [--ref a.png]
 *          seedream/5-pro-text-to-image (or -image-to-image with --ref).
 *          Photoreal by default. Stills are cheap; generate, look, reroll.
 *
 *   shot   <prompt> <in.png> <out.mp4> [--tail b.png] [--dur 5]
 *          kling/v2-1-pro image-to-video. --tail pins the LAST frame, which is
 *          the whole trick behind a seamless chain: leg N's tail is leg N+1's
 *          head, so the cut between them is frame-identical and invisible.
 *
 *   fetch  <taskId> <out>
 *          download the result of a job that already ran. Every job's id is
 *          printed the moment it is created, so a run that dies while polling
 *          (network drop, closed laptop) does not mean paying twice.
 *
 *   probe  print account credit and exit.
 *
 * Env: KIE_AI_API_KEY, read from the nearest .env walking up if not already set.
 */

import fs from "node:fs";
import path from "node:path";
import { isPlaceholderKey } from "./lib/tools.mjs";

// The base is overridable so the polling and download path can be exercised
// against a local stand-in without spending credit.
const API = process.env.KIE_AI_API_BASE || "https://api.kie.ai";
const UPLOAD = process.env.KIE_AI_UPLOAD_URL || "https://kieai.redpandaai.co/api/file-base64-upload";
const POLL_MS = Number(process.env.KIE_POLL_MS) || 4000;

const MODELS = {
  still:     "seedream/5-pro-text-to-image",
  stillEdit: "seedream/5-pro-image-to-image",
  shot:      "kling/v2-1-pro",
};

// ---------------------------------------------------------------- key ----
function findEnv(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, ".env");
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
function readKey() {
  if (process.env.KIE_AI_API_KEY) return { key: process.env.KIE_AI_API_KEY, from: "the environment" };
  const envPath = findEnv(process.cwd());
  if (!envPath) throw new Error("KIE_AI_API_KEY not set and no .env found walking up from " + process.cwd());
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*KIE_AI_API_KEY\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    let v = m[1];
    // Quoted values keep everything inside the quotes; unquoted ones end at an
    // inline comment, the way dotenv reads them.
    const q = v.match(/^(["'])(.*)\1/);
    v = q ? q[2] : v.replace(/\s+#.*$/, "");
    return { key: v, from: envPath };
  }
  throw new Error("KIE_AI_API_KEY not found in " + envPath);
}
// Read on first use, not at import: printing the usage text must not need a key.
let headers = null;
function H() {
  if (headers) return headers;
  const { key, from } = readKey();
  if (isPlaceholderKey(key)) {
    throw new Error(`KIE_AI_API_KEY in ${from} is still the .env.example placeholder. Put a real key from https://kie.ai there.`);
  }
  headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
  return headers;
}

// ------------------------------------------------------------- helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The API answers errors with JSON, but the proxy in front of it answers some
// with an HTML page, and res.json() on that throws "Unexpected token <" with
// no hint of the status. Say what actually came back.
async function json(res, what) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error(`${what}: HTTP ${res.status}, not JSON: ${text.replace(/\s+/g, " ").slice(0, 120)}`);
    err.status = res.status;
    throw err;
  }
}
const transient = (err) => !err.status || err.status === 408 || err.status === 429 || err.status >= 500;

async function uploadLocal(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error("input not found: " + abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const dataUrl = `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
  const res = await fetch(UPLOAD, {
    method: "POST", headers: H(),
    body: JSON.stringify({ base64Data: dataUrl, uploadPath: "scrollcraft", fileName: path.basename(abs) }),
  });
  const j = await json(res, "upload " + path.basename(abs));
  const url = j?.data?.downloadUrl || j?.data?.fileUrl || j?.data?.url;
  if (!url) throw new Error("upload failed: " + JSON.stringify(j));
  return url;
}

// A local path becomes a hosted URL; an http(s) string passes straight through.
const asUrl = (v) => (/^https?:\/\//i.test(v) ? Promise.resolve(v) : uploadLocal(v));

async function createTask(model, input) {
  const res = await fetch(`${API}/api/v1/jobs/createTask`, {
    method: "POST", headers: H(), body: JSON.stringify({ model, input }),
  });
  const j = await json(res, `createTask ${model}`);
  if (j.code !== 200 || !j?.data?.taskId) throw new Error(`createTask ${model}: ${JSON.stringify(j)}`);
  // From here on the job is paid for. Print the id before anything else can
  // fail, so the result can still be collected with `kie.mjs fetch`.
  process.stderr.write(`  task ${j.data.taskId} (${model})\n`);
  return j.data.taskId;
}

async function waitTask(taskId, { label = "job", timeoutMs = 15 * 60 * 1000 } = {}) {
  const t0 = Date.now();
  let delay = POLL_MS;
  let blips = 0;
  const resume = `Collect it later with: node kie.mjs fetch ${taskId} <out>`;
  for (;;) {
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`${label}: timed out after ${Math.round((Date.now() - t0) / 1000)}s. ${resume}`);
    }
    // A poll that fails in transit says nothing about the job, which is still
    // running and already paid for. Keep polling through blips; give up only
    // on a run of them, and say how to pick the job up afterwards.
    let j;
    try {
      const res = await fetch(`${API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: H() });
      j = await json(res, `poll ${taskId}`);
      blips = 0;
    } catch (err) {
      if (!transient(err) || ++blips > 6) throw new Error(`${err.message}. ${resume}`);
      process.stderr.write(`  ${label}: poll failed (${err.message}), retrying\n`);
      await sleep(delay);
      continue;
    }
    const d = j?.data || {};
    const state = d.state || d.status;
    if (state === "success") {
      let out = d.resultJson;
      if (typeof out === "string") { try { out = JSON.parse(out); } catch {} }
      const urls = out?.resultUrls || out?.result_urls || out?.urls || [];
      if (!urls.length) throw new Error(`${label}: success with no result url: ${JSON.stringify(d)}`);
      return urls;
    }
    if (state === "fail" || state === "failed") {
      throw new Error(`${label} failed: ${d.failMsg || d.failCode || JSON.stringify(d)}`);
    }
    process.stderr.write(`  ${label}: ${state || "queued"} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    await sleep(delay);
    delay = Math.min(delay * 1.25, Math.max(POLL_MS, 15000));
  }
}

async function download(url, out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  fs.writeFileSync(path.resolve(out), Buffer.from(await res.arrayBuffer()));
  return out;
}

function flag(argv, name, dflt = null) {
  const i = argv.indexOf(name);
  return i > -1 && argv[i + 1] ? argv[i + 1] : dflt;
}
function flags(argv, name) {
  const out = [];
  argv.forEach((a, i) => { if (a === name && argv[i + 1]) out.push(argv[i + 1]); });
  return out;
}

// ---------------------------------------------------------------- main ----
const [cmd, ...rest] = process.argv.slice(2);

try {
  if (cmd === "probe") {
    const r = await fetch(`${API}/api/v1/chat/credit`, { headers: H() });
    const j = await json(r, "probe");
    console.log("credit:", j.data);

  } else if (cmd === "fetch") {
    const [taskId, out] = rest;
    if (!taskId || !out) throw new Error("usage: kie.mjs fetch <taskId> <out>");
    const urls = await waitTask(taskId, { label: path.basename(out) });
    await download(urls[0], out);
    console.log(out);

  } else if (cmd === "still") {
    const [prompt, out] = rest;
    if (!prompt || !out) throw new Error('usage: kie.mjs still "<prompt>" <out.png> [--ar 16:9] [--ref a.png]');
    const ar = flag(rest, "--ar", "16:9");
    const refs = flags(rest, "--ref");
    let model = MODELS.still;
    // aspect_ratio, quality and output_format are all required by seedream;
    // omitting any one returns a bare "This field is required" that does not
    // name the field, so keep them explicit rather than relying on defaults.
    const input = {
      prompt,
      aspect_ratio: ar,
      quality: flag(rest, "--quality", "high"),
      output_format: "png",
      nsfw_checker: false,
    };
    if (refs.length) {
      model = MODELS.stillEdit;
      input.image_urls = await Promise.all(refs.map(asUrl));
    }
    const id = await createTask(model, input);
    const urls = await waitTask(id, { label: path.basename(out) });
    await download(urls[0], out);
    console.log(out);

  } else if (cmd === "shot") {
    const [prompt, head, out] = rest;
    if (!prompt || !head || !out) {
      throw new Error('usage: kie.mjs shot "<prompt>" <head.png> <out.mp4> [--tail b.png] [--dur 5]');
    }
    const dur = flag(rest, "--dur", "5");
    // Kling bills and renders 5s or 10s; anything else is rejected after upload.
    if (!["5", "10"].includes(String(dur))) throw new Error(`--dur must be 5 or 10, got ${dur}`);
    const tail = flag(rest, "--tail");
    const input = {
      prompt,
      image_url: await asUrl(head),
      duration: String(dur),
      // Camera-move clips are graded on smoothness, so the negative prompt
      // targets exactly what breaks a scrub: judder, warping, cuts.
      negative_prompt: "blur, distortion, low quality, warping, morphing, jitter, flicker, text, watermark, cut, scene change",
      cfg_scale: 0.5,
    };
    if (tail) input.tail_image_url = await asUrl(tail);
    const id = await createTask(MODELS.shot, input);
    const urls = await waitTask(id, { label: path.basename(out), timeoutMs: 20 * 60 * 1000 });
    await download(urls[0], out);
    console.log(out);

  } else {
    console.error(`scrollcraft asset generator

  node kie.mjs probe
  node kie.mjs still "<prompt>" <out.png> [--ar 16:9] [--ref ref.png]
  node kie.mjs shot  "<prompt>" <head.png> <out.mp4> [--tail tail.png] [--dur 5|10]
  node kie.mjs fetch <taskId> <out>        collect a job that already ran
`);
    process.exit(1);
  }
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
}
