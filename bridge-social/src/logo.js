import { rng } from './util.js';

// Rasterise a "B" with a three-arch bridge beneath it and return random points inside the glyph.
export async function sampleLogo(count, seed = 7) {
  try { await document.fonts.load('700 360px "Space Grotesk Variable"'); } catch {}
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, S, S);
  x.fillStyle = '#fff';
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = '700 400px "Space Grotesk Variable","Space Grotesk",sans-serif';
  x.fillText('B', S / 2, 372);
  // bridge: three arches under the B
  x.strokeStyle = '#fff'; x.lineWidth = 11; x.lineCap = 'round';
  const bx = 118, bw = 276, n = 3, w = bw / n;
  for (let i = 0; i < n; i++) {
    x.beginPath();
    x.arc(bx + w * i + w / 2, 468, w / 2 - 6, Math.PI, 0);
    x.stroke();
  }
  x.beginPath(); x.moveTo(bx, 468); x.lineTo(bx + bw, 468); x.stroke();
  const d = x.getImageData(0, 0, S, S).data;
  const px = [];
  for (let j = 0; j < S; j += 2) for (let i = 0; i < S; i += 2) if (d[(j * S + i) * 4 + 3] > 140) px.push(i, j);
  const r = rng(seed), out = new Float32Array(count * 2), m = px.length / 2;
  for (let k = 0; k < count; k++) {
    const p = (r() * m) | 0;
    out[k * 2] = (px[p * 2] + r() * 2) / S - 0.5;
    out[k * 2 + 1] = 0.5 - (px[p * 2 + 1] + r() * 2) / S;
  }
  return out;                          // x,y in [-0.5,0.5], y up
}
