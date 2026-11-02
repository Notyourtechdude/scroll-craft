#!/usr/bin/env node
/**
 * scrollcraft static server.
 *
 * A scrollcraft page cannot be verified from file://. The engine fetches each
 * clip as a Blob, and file:// fetches are blocked by CORS in every browser, so
 * the page silently falls back to posters and looks fine while proving nothing.
 * Serve it.
 *
 *   node serve.mjs --root builds/perkform --port 4500
 *
 * Byte ranges are honoured. The engine's own clips do not need them (it fetches
 * whole files), but a plain <video src> does: Safari refuses to play media from
 * a server that answers a Range request with the whole file.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };

const ROOT = path.resolve(arg("--root", "."));
const PORT = parseInt(arg("--port", "4500"), 10);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
};

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`serve.mjs: --root ${ROOT} is not a directory`);
  process.exit(1);
}

const fail = (res, code, msg) => res.writeHead(code, { "Content-Type": "text/plain" }).end(msg);

/** Maps a request path to a file inside ROOT, or null if it would leave it. */
function resolveFile(urlPath) {
  const file = path.resolve(ROOT, "." + path.posix.normalize("/" + urlPath));
  // A bare prefix check is not enough: ROOT "/srv/site" is a string prefix of
  // "/srv/site-secrets". Compare against ROOT plus a separator.
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  return file;
}

/** Parses a single "bytes=a-b" range. Returns null for none, false if unsatisfiable. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start, end;
  if (m[1] === "") {
    // "bytes=-500" is the last 500 bytes.
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return false;
  return { start, end };
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return fail(res, 405, "method not allowed");

  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    // A malformed %-escape used to throw out of the handler and take the whole
    // server down mid-verification.
    return fail(res, 400, "bad request");
  }

  let file = resolveFile(urlPath);
  if (!file) return fail(res, 403, "forbidden");
  let stat = fs.statSync(file, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    file = path.join(file, "index.html");
    stat = fs.statSync(file, { throwIfNoEntry: false });
  }
  if (!stat?.isFile()) return fail(res, 404, "not found");

  const headers = {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    // No caching: verification loops re-shoot the same URLs after edits, and a
    // cached clip or stylesheet makes you screenshot the previous build.
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
  };

  const range = parseRange(req.headers.range, stat.size);
  if (range === false) {
    res.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}` }).end();
    return;
  }
  const { start, end } = range || { start: 0, end: stat.size - 1 };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
  headers["Content-Length"] = stat.size ? end - start + 1 : 0;
  res.writeHead(range ? 206 : 200, headers);

  if (req.method === "HEAD" || !stat.size) return res.end();
  const stream = fs.createReadStream(file, { start, end });
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});

server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE"
    ? `serve.mjs: port ${PORT} is already in use. Pick another with --port, or stop the server holding it.`
    : `serve.mjs: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`scrollcraft: ${ROOT}\n  http://localhost:${server.address().port}`);
});
