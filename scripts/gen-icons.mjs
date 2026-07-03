// Generates PWA icons (gradient rounded square + rising chart line)
// with zero dependencies — raw PNG encoding via zlib.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- minimal PNG writer ----------------------------------------------------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- drawing ---------------------------------------------------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function renderIcon(size, { padded = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  // padded variant leaves margin for iOS which doesn't round corners itself
  const inset = padded ? 0 : 0;
  const radius = size * 0.225;
  // logo polyline (matches the in-app SVG mark): points in 0..1 space
  const pts = [
    [0.25, 0.67],
    [0.406, 0.406],
    [0.531, 0.578],
    [0.75, 0.297],
  ];
  const lw = size * 0.082;

  // gradient endpoints: #7b79f7 -> #4f46e5 diagonally
  const c1 = [0x7b, 0x79, 0xf7];
  const c2 = [0x4f, 0x46, 0xe5];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-rect mask
      const rx = Math.max(inset + radius - x, x - (size - 1 - inset - radius), 0);
      const ry = Math.max(inset + radius - y, y - (size - 1 - inset - radius), 0);
      const outside = Math.hypot(rx, ry) - radius;
      let alpha = 255;
      if (x < inset || y < inset || x >= size - inset || y >= size - inset) alpha = 0;
      else if (outside > 0.5) alpha = 0;
      else if (outside > -0.5) alpha = Math.round(255 * (0.5 - outside));

      const t = (x + y) / (2 * (size - 1));
      let r = Math.round(lerp(c1[0], c2[0], t));
      let g = Math.round(lerp(c1[1], c2[1], t));
      let b = Math.round(lerp(c1[2], c2[2], t));

      // white chart line with soft edge
      let minD = Infinity;
      for (let s = 0; s < pts.length - 1; s++) {
        minD = Math.min(
          minD,
          distToSegment(x / size, y / size, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]) * size
        );
      }
      // round caps at endpoints already handled by distance metric
      const edge = lw / 2 - minD;
      if (edge > 0) {
        const mix = Math.min(1, edge / (size * 0.01));
        r = Math.round(lerp(r, 255, mix));
        g = Math.round(lerp(g, 255, mix));
        b = Math.round(lerp(b, 255, mix));
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = alpha;
    }
  }
  return encodePng(size, rgba);
}

// iOS apple-touch-icon must be opaque, square (iOS rounds it itself)
function renderAppleIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const pts = [
    [0.25, 0.67],
    [0.406, 0.406],
    [0.531, 0.578],
    [0.75, 0.297],
  ];
  const lw = size * 0.082;
  const c1 = [0x7b, 0x79, 0xf7];
  const c2 = [0x4f, 0x46, 0xe5];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x + y) / (2 * (size - 1));
      let r = Math.round(lerp(c1[0], c2[0], t));
      let g = Math.round(lerp(c1[1], c2[1], t));
      let b = Math.round(lerp(c1[2], c2[2], t));
      let minD = Infinity;
      for (let s = 0; s < pts.length - 1; s++) {
        minD = Math.min(
          minD,
          distToSegment(x / size, y / size, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]) * size
        );
      }
      const edge = lw / 2 - minD;
      if (edge > 0) {
        const mix = Math.min(1, edge / (size * 0.01));
        r = Math.round(lerp(r, 255, mix));
        g = Math.round(lerp(g, 255, mix));
        b = Math.round(lerp(b, 255, mix));
      }
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-192.png"), renderIcon(192));
writeFileSync(join(outDir, "icon-512.png"), renderIcon(512));
writeFileSync(join(outDir, "apple-touch-icon.png"), renderAppleIcon(180));
writeFileSync(join(root, "public", "favicon.ico"), renderIcon(32)); // PNG-in-ico works in modern browsers
console.log("icons written to public/icons");
