// Engine regression tests: the real scrollcraft.js in a real browser.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { ensureMedia, launch, rgbOf, scrollTo, startServe } from "./helpers.mjs";

let server, browser;
before(async () => {
  ensureMedia();
  server = await startServe();
  browser = await launch();
});
after(async () => {
  await browser?.close();
  server?.stop();
});

async function open(file = "engine.html", { viewport = { width: 1200, height: 800 }, init } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = [], warnings = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "warning") warnings.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(`${server.base}/tests/scrollcraft/fixtures/${file}`);
  if (file !== "failsafe.html") await page.waitForSelector("html.sc-ready");
  page.errors = errors;
  page.warnings = warnings;
  return page;
}

const actTop = (page, id) => page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id);
const canvasVar = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sc-canvas").trim());

describe("background drift", () => {
  test("eases in from the page ground instead of cutting to the first drift colour", async () => {
    const page = await open();
    const top = await actTop(page, "drift");
    // 10% into the act's travel: the ramp is under way but not finished.
    await scrollTo(page, top + 0.1 * (await page.evaluate(() => innerHeight)) * 2);
    const [r] = rgbOf(await canvasVar(page));
    assert.ok(r > 8 && r < 200, `expected a colour part-way from #08090b to #ff0000, got ${await canvasVar(page)}`);
    await page.close();
  });

  test("returns to the page ground when the reader scrolls back above every drift act", async () => {
    const page = await open();
    const top = await actTop(page, "drift");
    await scrollTo(page, top + 600);
    assert.deepEqual(rgbOf(await canvasVar(page)), [255, 0, 0]);
    await scrollTo(page, 0);
    const [r, g, b] = rgbOf(await canvasVar(page));
    assert.ok(r < 20 && g < 20 && b < 20, `ground stayed drifted at the top: ${await canvasVar(page)}`);
    await page.close();
  });
});

describe("clip loading", () => {
  test("a clip that fails to fetch is not refetched on every scroll frame", async () => {
    const page = await open();
    let hits = 0;
    page.on("request", (r) => { if (r.url().includes("does-not-exist")) hits++; });
    const top = await actTop(page, "missing");
    for (let i = 0; i < 25; i++) await scrollTo(page, top - 400 + i * 40);
    await page.waitForTimeout(300);
    assert.ok(hits <= 1, `missing clip was requested ${hits} times`);
    await page.close();
  });

  test("a scrub clip loads, paints and settles on its scroll target", async () => {
    const page = await open();
    const top = await actTop(page, "clip");
    const vh = await page.evaluate(() => innerHeight);
    await scrollTo(page, top + vh * 0.5);
    await page.waitForFunction(() => document.querySelector("#clip").classList.contains("sc-has-clip"), null, { timeout: 8000 });
    await page.waitForFunction(() => {
      const c = window.__api.clips.find((c) => c.host.id === "clip");
      return Math.abs(c.cur - c.target) < 0.002 && !c.el.seeking;
    }, null, { timeout: 8000 });
    const { t, want } = await page.evaluate(() => {
      const c = window.__api.clips.find((c) => c.host.id === "clip");
      return { t: c.el.currentTime, want: c.target * c.el.duration };
    });
    assert.ok(Math.abs(t - want) < 0.1, `currentTime ${t} vs target ${want}`);
    await page.close();
  });
});

describe("per-frame cost", () => {
  test("scrolling never forces a layout read of scrollWidth/scrollHeight", async () => {
    const page = await open("engine.html", {
      init: () => {
        window.__reads = 0;
        for (const prop of ["scrollWidth", "scrollHeight"]) {
          const d = Object.getOwnPropertyDescriptor(Element.prototype, prop);
          Object.defineProperty(Element.prototype, prop, {
            configurable: true,
            get() { if (window.__count) window.__reads++; return d.get.call(this); },
          });
        }
      },
    });
    const top = await actTop(page, "pan");
    await page.evaluate(() => { window.__count = true; });
    for (let i = 0; i < 20; i++) await scrollTo(page, top + i * 60);
    const reads = await page.evaluate(() => window.__reads);
    assert.equal(reads, 0, `${reads} scrollWidth/scrollHeight reads during 20 scroll frames`);
    // And the rail still travels: at the end of the act it sits fully left.
    const end = await page.evaluate(() => {
      const a = document.getElementById("pan");
      return a.getBoundingClientRect().top + scrollY + a.offsetHeight - innerHeight;
    });
    await scrollTo(page, end);
    const x = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("[data-sc-pan]")).transform).m41);
    const over = await page.evaluate(() => document.querySelector("[data-sc-pan]").scrollWidth - innerWidth);
    assert.ok(Math.abs(x + over) < 2, `rail at ${x}px, expected ${-over}px`);
    await page.close();
  });
});

describe("layout", () => {
  test("re-measures acts when content above them changes height without a resize", async () => {
    const page = await open();
    await page.evaluate(() => { document.getElementById("grow").style.height = "900px"; });
    await page.waitForTimeout(250);
    const top = await actTop(page, "drift");
    const vh = await page.evaluate(() => innerHeight);
    await scrollTo(page, top + vh); // halfway through a 3-viewport act's 2-viewport travel
    const p = await page.evaluate(() => parseFloat(document.getElementById("drift").style.getPropertyValue("--sc-p")));
    assert.ok(Math.abs(p - 0.5) < 0.02, `--sc-p ${p}, expected 0.5`);
    await page.close();
  });
});

describe("kinetic type", () => {
  const lineReport = (page) => page.evaluate(() => {
    const lines = [...document.querySelectorAll("#kin .sc-split--line")];
    const lh = parseFloat(getComputedStyle(document.getElementById("kin")).lineHeight);
    return { n: lines.length, tallest: Math.max(...lines.map((l) => l.getBoundingClientRect().height)) / lh };
  });

  test("line splits are rebuilt when the width changes", async () => {
    const page = await open();
    await scrollTo(page, (await actTop(page, "drift")) + 200);
    const wide = await lineReport(page);
    await page.setViewportSize({ width: 420, height: 800 });
    await page.waitForTimeout(300);
    await scrollTo(page, (await actTop(page, "drift")) + 200);
    const narrow = await lineReport(page);
    assert.ok(narrow.n > wide.n, `still ${narrow.n} line spans after narrowing (was ${wide.n})`);
    assert.ok(narrow.tallest < 1.6, `a line span wraps onto ${narrow.tallest.toFixed(2)} lines`);
    await page.close();
  });

  test("character splits stay readable as one string to assistive tech", async () => {
    const page = await open();
    await scrollTo(page, (await actTop(page, "drift")) + 200);
    const a11y = await page.evaluate(() => {
      const el = document.getElementById("chars");
      const hidden = [...el.querySelectorAll(".sc-split")].every((s) => s.getAttribute("aria-hidden") === "true");
      const sr = el.querySelector(".sc-sr-only");
      return { hidden, sr: sr && sr.textContent, text: el.textContent };
    });
    assert.ok(a11y.hidden, "split character spans are exposed to assistive tech one by one");
    assert.equal(a11y.sr, "Hello there");
    await page.close();
  });

  test("warns instead of silently flattening markup inside a kinetic element", async () => {
    // Listening from navigation onward: this act is live at scroll 0, so the
    // split (and its warning) happens during mount.
    const page = await open();
    await scrollTo(page, (await actTop(page, "drift")) + 200);
    await page.waitForTimeout(100);
    const w = page.warnings;
    assert.ok(w.some((t) => t.includes("kinetic") && t.includes("nested")), `no warning: ${w.join(" | ")}`);
    assert.equal(w.filter((t) => t.includes("kinetic")).length, 1, "warned more than once for one element");
    await page.close();
  });
});

describe("pointer devices", () => {
  test("a magnet holding near the pointer keeps its offset when the page scrolls", async () => {
    const page = await open();
    const top = await actTop(page, "drift");
    await scrollTo(page, top + 100);
    const box = await page.locator("#mag").boundingBox();
    // Rest the pointer just right of centre and let the spring settle
    // completely: the race only exists once the magnet has stopped moving.
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 10, { steps: 5 });
    await page.waitForTimeout(2500);
    const before = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.getElementById("mag")).transform).m41);
    assert.ok(before > 5, `magnet never moved (${before}px)`);
    // A small scroll inside the act: read() rewrites the cue's transform.
    await scrollTo(page, top + 110);
    await page.waitForTimeout(100);
    const afterX = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.getElementById("mag")).transform).m41);
    assert.ok(Math.abs(afterX - before) < 2, `magnet offset ${before}px dropped to ${afterX}px after a scroll`);
    await page.close();
  });
});

describe("image sequence", () => {
  test("draws a frame that arrives while the reader is not scrolling", async () => {
    const page = await open();
    // Hold every frame back until after the scroll has happened, so the only
    // thing that can paint the canvas is the frame's own arrival.
    await page.route("**/frames/*.png", async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await page.evaluate(() => { document.querySelectorAll("#seq canvas").forEach((c) => { c.dataset.probe = "1"; }); });
    const top = await actTop(page, "seq");
    await scrollTo(page, top + 100);
    await page.waitForTimeout(2000);
    const painted = await page.evaluate(() => {
      const c = document.querySelector("#seq canvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) return true;
      return false;
    });
    assert.ok(painted, "sequence canvas still blank after its frames loaded");
    await page.close();
  });
});

describe("failsafe", () => {
  test("copy becomes visible when the engine never loads", async () => {
    const page = await open("failsafe.html");
    await page.waitForTimeout(4500);
    const o = await page.evaluate(() => ({
      cue: getComputedStyle(document.getElementById("kin")).opacity,
      flow: getComputedStyle(document.querySelector("[data-sc-in]")).opacity,
    }));
    assert.equal(o.cue, "1", "cue copy stayed invisible without the engine");
    assert.equal(o.flow, "1", "flow reveal stayed invisible without the engine");
    await page.close();
  });

  test("the failsafe never fires on a page whose engine mounted", async () => {
    const page = await open();
    await page.waitForTimeout(4500);
    // The closing flow reveal is far below the fold, so only the failsafe
    // could have made it visible.
    const o = await page.evaluate(() => getComputedStyle(document.querySelector("[data-sc-in]")).opacity);
    assert.equal(o, "0", "an off-screen flow reveal was forced visible on a mounted page");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});
