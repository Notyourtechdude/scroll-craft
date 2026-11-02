# scrollcraft regression suite

Drives the real engine, scripts and verification harness in a real browser.
Lives outside the plugin, so installing the skill does not install it.

```bash
npm install          # playwright-core, once
npm test
```

Needs `ffmpeg` (fixture media is generated at test time into `.media/`, which
is gitignored along with `.out/`). The browser is Playwright's Chromium unless
`SCROLLCRAFT_CHROME` points elsewhere; fixture clips are VP9 WebM because that
build cannot decode h264. If the pinned `playwright-core` has no browser on your
machine, run `npx playwright-core install chromium` or set `SCROLLCRAFT_CHROME`.

| File | Covers |
|---|---|
| `engine.test.mjs` | drift, clip loading and failure, per-frame layout reads, relayout on content growth, kinetic splits, image sequences, the no-engine failsafe |
| `scripts.test.mjs` | `serve.mjs` (path escape, bad escapes, ranges, HEAD, busy port), `doctor.mjs`, `kie.mjs` (usage, placeholder key, polling through a 502 against a local stand-in), `encode.sh` |
| `harness.test.mjs` | `shoot.mjs` contrast grading and contact-sheet hygiene, `worldflight-assert.mjs` on a page mounted as documented |

Every test was written to fail against the code it guards before the fix
landed. Keep it that way: reproduce first, then fix.
