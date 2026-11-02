// Tests for the skill's command-line scripts: serve, doctor, kie, encode.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { MEDIA, OUT, REPO, SCRIPTS, ensureMedia, runScript, startServe } from "./helpers.mjs";

before(() => {
  ensureMedia();
  fs.mkdirSync(OUT, { recursive: true });
});

/** A raw request, so paths reach the server exactly as written (no URL normalising). */
function raw(port, reqPath, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, "127.0.0.1", () => {
      const extra = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join("");
      sock.write(`${method} ${reqPath} HTTP/1.1\r\nHost: x\r\n${extra}Connection: close\r\n\r\n`);
    });
    const chunks = [];
    sock.on("data", (c) => chunks.push(c));
    sock.on("end", () => {
      const buf = Buffer.concat(chunks);
      const split = buf.indexOf("\r\n\r\n");
      const head = buf.subarray(0, split).toString();
      resolve({
        status: Number(head.split(" ")[1]),
        headers: Object.fromEntries(head.split("\r\n").slice(1).map((l) => {
          const i = l.indexOf(":");
          return [l.slice(0, i).toLowerCase(), l.slice(i + 1).trim()];
        })),
        body: buf.subarray(split + 4),
      });
    });
    sock.on("error", reject);
  });
}

describe("serve.mjs", () => {
  let server, root, sibling;
  before(async () => {
    // A served root and a sibling directory whose name starts with the root's
    // name: the classic prefix-check escape.
    root = path.join(OUT, "site");
    sibling = path.join(OUT, "site-secrets");
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(sibling, { recursive: true });
    fs.writeFileSync(path.join(root, "index.html"), "<p>hi</p>");
    fs.writeFileSync(path.join(sibling, "key.txt"), "SECRET");
    fs.copyFileSync(path.join(MEDIA, "clip.webm"), path.join(root, "clip.webm"));
    server = await startServe(root);
  });
  after(() => server?.stop());

  test("serves the root", async () => {
    const r = await raw(server.port, "/");
    assert.equal(r.status, 200);
    assert.match(r.body.toString(), /hi/);
  });

  test("does not serve a sibling directory that shares the root's name prefix", async () => {
    const r = await raw(server.port, "/../site-secrets/key.txt");
    assert.notEqual(r.status, 200, "served a file outside the root");
    assert.doesNotMatch(r.body.toString(), /SECRET/);
  });

  test("survives a malformed percent-escape", async () => {
    const r = await raw(server.port, "/%E0%A4%A");
    assert.equal(r.status, 400);
    const again = await raw(server.port, "/");
    assert.equal(again.status, 200, "server died after a bad request");
  });

  test("answers a Range request with 206 and exactly the requested bytes", async () => {
    const whole = fs.readFileSync(path.join(root, "clip.webm"));
    const r = await raw(server.port, "/clip.webm", { Range: "bytes=100-199" });
    assert.equal(r.status, 206);
    assert.equal(r.headers["content-range"], `bytes 100-199/${whole.length}`);
    assert.equal(r.body.length, 100);
    assert.ok(r.body.equals(whole.subarray(100, 200)));
  });

  test("rejects an unsatisfiable Range with 416", async () => {
    const r = await raw(server.port, "/clip.webm", { Range: "bytes=999999999-" });
    assert.equal(r.status, 416);
  });

  test("answers HEAD without a body", async () => {
    const r = await raw(server.port, "/clip.webm", {}, "HEAD");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 0);
    assert.equal(r.headers["content-type"], "video/webm");
  });

  test("reports a port that is already taken instead of crashing with a stack trace", async () => {
    const r = runScript("serve.mjs", ["--root", root, "--port", String(server.port)], { timeout: 5000 });
    assert.notEqual(r.code, 0);
    assert.match(r.out, /already in use/);
    assert.doesNotMatch(r.out, /at Server\./);
  });
});

describe("doctor.mjs", () => {
  test("does not accept the .env.example placeholder as an API key", () => {
    const dir = path.join(OUT, "doctor");
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(path.join(REPO, ".env.example"), path.join(dir, ".env"));
    const r = runScript("doctor.mjs", [], { cwd: dir, env: { KIE_AI_API_KEY: "" } });
    const line = r.out.split("\n").find((l) => l.includes("KIE_AI_API_KEY"));
    assert.doesNotMatch(line, / ok /, `placeholder accepted: ${line}`);
    assert.match(r.out, /placeholder/);
  });
});

describe("kie.mjs", () => {
  test("prints usage without an API key instead of crashing", () => {
    const r = runScript("kie.mjs", [], { cwd: OUT, env: { KIE_AI_API_KEY: "" } });
    assert.equal(r.code, 1);
    assert.match(r.out, /usage|node kie\.mjs probe/i);
    assert.doesNotMatch(r.out, /at file:\/\//, "printed a stack trace");
  });

  test("refuses the .env.example placeholder before spending a request", () => {
    const r = runScript("kie.mjs", ["probe"], { cwd: OUT, env: { KIE_AI_API_KEY: "your-key-here" } });
    assert.equal(r.code, 1);
    assert.match(r.out, /placeholder/);
  });

  test("keeps polling a paid job through a transient failure, then downloads it", async () => {
    // Out of process: runScript blocks this event loop, so an in-process mock
    // could never answer. The first poll returns a proxy's 502 HTML page.
    const png = path.join(MEDIA, "poster.png");
    const mock = path.join(OUT, "kie-mock.mjs");
    fs.writeFileSync(mock, `
      import http from "node:http"; import fs from "node:fs";
      let polls = 0;
      const s = http.createServer((req, res) => {
        if (req.url.startsWith("/api/v1/jobs/createTask"))
          return res.end(JSON.stringify({ code: 200, data: { taskId: "task-123" } }));
        if (req.url.startsWith("/api/v1/jobs/recordInfo")) {
          if (++polls === 1) return res.writeHead(502, { "Content-Type": "text/html" }).end("<html>Bad Gateway</html>");
          const url = "http://127.0.0.1:" + s.address().port + "/file.png";
          return res.end(JSON.stringify({ code: 200, data: { state: "success", resultJson: JSON.stringify({ resultUrls: [url] }) } }));
        }
        if (req.url === "/file.png") return res.end(fs.readFileSync(${JSON.stringify(png)}));
        res.writeHead(404).end();
      }).listen(0, "127.0.0.1", () => console.log(s.address().port));
    `);
    const srv = spawn(process.execPath, [mock], { stdio: ["ignore", "pipe", "inherit"] });
    const port = await new Promise((r) => srv.stdout.once("data", (d) => r(String(d).trim())));
    const out = path.join(OUT, "kie", "still.png");
    fs.rmSync(out, { force: true });
    try {
      const r = runScript("kie.mjs", ["still", "a quiet room", out], {
        cwd: OUT,
        env: { KIE_AI_API_KEY: "test-key", KIE_AI_API_BASE: `http://127.0.0.1:${port}`, KIE_POLL_MS: "50" },
      });
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /task-123/, "the task id was never printed, so a lost job cannot be resumed");
      assert.ok(fs.existsSync(out) && fs.statSync(out).size === fs.statSync(png).size, "image was not downloaded");
    } finally {
      srv.kill();
    }
  });
});

describe("encode.sh", () => {
  const probe = (file, args) => spawnSync("ffprobe", ["-v", "error", ...args, file], { encoding: "utf8" }).stdout.trim();

  test("encodes a dense-GOP, audio-free clip and never upscales a small source", () => {
    const out = path.join(OUT, "enc", "desktop.mp4");
    const r = spawnSync("bash", [path.join(SCRIPTS, "encode.sh"), path.join(MEDIA, "src-360p.mp4"), out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(probe(out, ["-select_streams", "v:0", "-show_entries", "stream=height", "-of", "csv=p=0"]), "360",
      "a 360p source was upscaled");
    assert.equal(probe(out, ["-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0"]), "");
    // Keyframes every 8 frames (desktop GOP): frame 0, 8, 16, ... Read the
    // per-frame key flag; pts lines can carry trailing side-data fields.
    const flags = probe(out, ["-select_streams", "v:0", "-show_entries", "frame=key_frame", "-of", "csv=p=0"])
      .split("\n").filter(Boolean).map((l) => l.split(",")[0] === "1");
    const keys = flags.flatMap((k, i) => (k ? [i] : []));
    assert.ok(keys.length >= 5, `only ${keys.length} keyframes in ${flags.length} frames`);
    assert.ok(keys.every((k, i) => k === i * 8), `keyframes at ${keys.join(",")}, expected every 8th frame`);
  });

  test("rejects an unknown mode instead of silently encoding as desktop", () => {
    const r = spawnSync("bash", [path.join(SCRIPTS, "encode.sh"), path.join(MEDIA, "src-360p.mp4"), path.join(OUT, "enc", "x.mp4"), "mobil"], { encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /mode/);
  });

  test("still encodes when ffprobe is not available", () => {
    // A PATH that holds ffmpeg and the coreutils encode.sh needs, and no
    // ffprobe. (Not /bin: on merged-usr systems that is /usr/bin, ffprobe and all.)
    const bin = path.join(OUT, "no-ffprobe");
    fs.rmSync(bin, { recursive: true, force: true });
    fs.mkdirSync(bin, { recursive: true });
    for (const tool of ["ffmpeg", "dirname", "mkdir", "du", "cut", "wc"]) {
      const where = spawnSync("bash", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
      fs.symlinkSync(where, path.join(bin, tool));
    }
    const out = path.join(OUT, "enc", "noprobe.mp4");
    fs.rmSync(out, { force: true });
    // Resolved here: with PATH narrowed, spawn could not find bash itself.
    const bash = spawnSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();
    const r = spawnSync(bash, [path.join(SCRIPTS, "encode.sh"), path.join(MEDIA, "src-360p.mp4"), out],
      { encoding: "utf8", env: { HOME: process.env.HOME, PATH: bin } });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(out));
  });
});
