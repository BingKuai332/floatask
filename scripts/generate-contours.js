'use strict';
// Dev-only: procedurally generates the 前哨 contour-line field used by
// src/renderer/ornaments.css. Seeded fbm gradient noise -> marching squares ->
// chained, midpoint-smoothed polylines. Output is original and deterministic.
// Usage: npm run build:contours
const fs = require('fs');
const path = require('path');

const W = 960, H = 720;
const GX = 120, GY = 90;          // grid cells
const LEVELS = 14;                // evenly spaced levels inside the field range
const INDEX_EVERY = 4;            // every 4th level is an index contour
const SEED = 0x5a17;
const OUT = path.join(__dirname, '..', 'src', 'renderer', 'assets');

// ---------- seeded gradient noise ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const perm = new Uint8Array(512);
const grads = [];
{
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) { const a = rand() * Math.PI * 2; grads.push([Math.cos(a), Math.sin(a)]); }
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const g = (ix, iy, dx, dy) => { const v = grads[perm[(perm[ix & 255] + iy) & 511]]; return v[0] * dx + v[1] * dy; };
  const u = fade(xf), v = fade(yf);
  const a = g(xi, yi, xf, yf), b = g(xi + 1, yi, xf - 1, yf);
  const c = g(xi, yi + 1, xf, yf - 1), d = g(xi + 1, yi + 1, xf - 1, yf - 1);
  return (a + u * (b - a)) + v * ((c + u * (d - c)) - (a + u * (b - a)));
}
function fbm(x, y) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < 4; o++) { sum += amp * noise(x * freq, y * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}

// ---------- sample field ----------
const field = [];
let lo = Infinity, hi = -Infinity;
for (let j = 0; j <= GY; j++) {
  const row = [];
  for (let i = 0; i <= GX; i++) {
    const v = fbm(i / GX * 3.1 + 11.3, j / GY * 2.3 + 7.7);
    row.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  field.push(row);
}
const levels = [];
for (let k = 1; k <= LEVELS; k++) levels.push(lo + (hi - lo) * k / (LEVELS + 1));

// ---------- marching squares ----------
const sx = W / GX, sy = H / GY;
function segmentsAt(level) {
  const segs = [];
  const key = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`;
  for (let j = 0; j < GY; j++) {
    for (let i = 0; i < GX; i++) {
      const a = field[j][i], b = field[j][i + 1], c = field[j + 1][i + 1], d = field[j + 1][i];
      const lerp = (v0, v1) => (level - v0) / (v1 - v0);
      const pt = {};
      if ((a < level) !== (b < level)) pt.t = [(i + lerp(a, b)) * sx, j * sy];
      if ((b < level) !== (c < level)) pt.r = [(i + 1) * sx, (j + lerp(b, c)) * sy];
      if ((d < level) !== (c < level)) pt.b = [(i + lerp(d, c)) * sx, (j + 1) * sy];
      if ((a < level) !== (d < level)) pt.l = [i * sx, (j + lerp(a, d)) * sy];
      const ks = Object.keys(pt);
      if (ks.length === 2) segs.push([pt[ks[0]], pt[ks[1]]]);
      else if (ks.length === 4) {
        const center = (a + b + c + d) / 4;
        if ((center < level) === (a < level)) { segs.push([pt.t, pt.r]); segs.push([pt.b, pt.l]); }
        else { segs.push([pt.t, pt.l]); segs.push([pt.r, pt.b]); }
      }
    }
  }
  return { segs, key };
}

// ---------- chain segments into polylines ----------
function chain({ segs, key }) {
  const ends = new Map();
  const add = (k, idx) => { if (!ends.has(k)) ends.set(k, []); ends.get(k).push(idx); };
  segs.forEach((s, idx) => { add(key(...s[0]), idx); add(key(...s[1]), idx); });
  const used = new Uint8Array(segs.length);
  const lines = [];
  const next = (p) => {
    for (const idx of ends.get(key(...p)) || []) {
      if (used[idx]) continue;
      used[idx] = 1;
      const s = segs[idx];
      return key(...s[0]) === key(...p) ? s[1] : s[0];
    }
    return null;
  };
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const line = [segs[n][0], segs[n][1]];
    for (let p = next(line[line.length - 1]); p; p = next(p)) line.push(p);
    for (let p = next(line[0]); p; p = next(p)) line.unshift(p);
    lines.push(line);
  }
  return lines;
}

// ---------- smoothing: quadratic curves through segment midpoints ----------
const r = v => (Math.round(v * 10) / 10).toString();
function toPath(line) {
  if (line.length < 4) return '';
  const closed = key0(line[0]) === key0(line[line.length - 1]);
  const pts = closed ? line.slice(0, -1) : line;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d;
  if (closed) {
    const m0 = mid(pts[pts.length - 1], pts[0]);
    d = `M${r(m0[0])} ${r(m0[1])}`;
    for (let i = 0; i < pts.length; i++) {
      const m = mid(pts[i], pts[(i + 1) % pts.length]);
      d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${r(m[0])} ${r(m[1])}`;
    }
    return d + 'Z';
  }
  d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1]);
    d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${r(m[0])} ${r(m[1])}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${r(last[0])} ${r(last[1])}`;
}
function key0(p) { return `${p[0].toFixed(3)},${p[1].toFixed(3)}`; }

// Light decimation keeps files small without visible faceting.
function decimate(line, step = 2) {
  if (line.length <= 6) return line;
  const out = [];
  for (let i = 0; i < line.length; i += step) out.push(line[i]);
  if (out[out.length - 1] !== line[line.length - 1]) out.push(line[line.length - 1]);
  return out;
}

function svg(paths, width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">\n` +
    `<!-- Generated by scripts/generate-contours.js (npm run build:contours). Procedural, original; do not edit by hand. -->\n` +
    `<g fill="none" stroke="#fff" stroke-width="${width}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round">\n` +
    paths.map(d => `<path vector-effect="non-scaling-stroke" d="${d}"/>`).join('\n') + '\n</g>\n</svg>\n';
}

const base = [], index = [];
levels.forEach((level, k) => {
  const ds = chain(segmentsAt(level)).map(l => toPath(decimate(l))).filter(Boolean);
  ((k + 1) % INDEX_EVERY === 0 ? index : base).push(...ds);
});
fs.mkdirSync(OUT, { recursive: true });
for (const [name, paths, width] of [['contours.svg', base, 1], ['contours-index.svg', index, 1.4]]) {
  const text = svg(paths, width);
  fs.writeFileSync(path.join(OUT, name), text);
  console.log(`${name}: ${paths.length} paths, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
}
