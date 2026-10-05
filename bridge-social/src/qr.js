import qrcode from 'qrcode-generator';

/** Draw a scannable QR code (dark modules on a light ground) into a new canvas. */
export function qrCanvas(text, { size = 400, fg = '#2a0618', bg = '#efe3c6', quiet = 4 } = {}) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), cell = Math.floor(size / (n + quiet * 2)), off = Math.floor((size - cell * n) / 2);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, size, size); x.fillStyle = fg;
  for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) x.fillRect(off + q * cell, off + r * cell, cell, cell);
  return c;
}
