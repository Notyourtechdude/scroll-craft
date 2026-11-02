// The verification scripts, run against fixture pages exactly as a build would
// run them. They resolve playwright-core from the cwd, so they run from REPO.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { OUT, REPO, ensureMedia, runScript, startServe } from "./helpers.mjs";

let server;
before(async () => {
  ensureMedia();
  server = await startServe();
});
after(() => server?.stop());

const fixture = (f) => `${server.base}/tests/scrollcraft/fixtures/${f}`;

describe("shoot.mjs", () => {
  test("grades oklch and color-mix ink by its real colour", () => {
    const out = path.join(OUT, "shoot-contrast");
    const r = runScript("shoot.mjs", ["--url", fixture("contrast.html"), "--out", out, "--per-act", "2"], { cwd: REPO });
    assert.equal(r.code, 0, r.out);
    const { report } = JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8"));
    const worst = (needle) => Math.min(...report.flatMap((s) => s.contrast).filter((c) => c.t.includes(needle)).map((c) => c.worst));
    // Near-white oklch ink on #08090b is about 18:1. Read as rgb(0.97, 0.01, 90)
    // it comes out near 1:1 and the line is reported as failing.
    assert.ok(worst("Ink in oklch") > 15, `oklch ink graded ${worst("Ink in oklch")}:1`);
    // 70% ink composited over the ground: well above AA, well below full ink.
    const soft = worst("Soft ink");
    assert.ok(soft > 7 && soft < worst("Ink in oklch"), `color-mix ink graded ${soft}:1`);
    assert.doesNotMatch(r.out, /CONTRAST FAIL/);
  });

  test("the contact sheet never picks up frames from an earlier, longer run", () => {
    const out = path.join(OUT, "shoot-stale");
    fs.mkdirSync(out, { recursive: true });
    // Leftovers from a previous run with more positions.
    for (let i = 0; i < 60; i++) fs.writeFileSync(path.join(out, `${String(i).padStart(2, "0")}.png`), "stale");
    const r = runScript("shoot.mjs", ["--url", fixture("contrast.html"), "--out", out, "--per-act", "2"], { cwd: REPO });
    assert.equal(r.code, 0, r.out);
    const { report } = JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8"));
    const frames = fs.readdirSync(out).filter((f) => /^\d+\.png$/.test(f));
    assert.equal(frames.length, report.length, `${frames.length} frames on disk for ${report.length} positions`);
  });
});

describe("worldflight-assert.mjs", () => {
  test("runs against a page mounted exactly as worldflight.md documents", () => {
    const r = runScript("worldflight-assert.mjs", ["--url", fixture("world.html")], { cwd: REPO });
    assert.doesNotMatch(r.out, /TypeError|Cannot read prop/, r.out);
    assert.match(r.out, /\d+ passed, \d+ failed/, r.out);
    assert.equal(r.code, 0, r.out);
  });
});
