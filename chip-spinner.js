// Chip spinner: spinning 3D dot-matrix CPU and GPU icons.
// Each chip is a set of textured boxes. Every dot casts parallel rays at the
// turning model, lights the nearest face, and draws one halftone dot. Dots the
// model misses are not drawn, so the chip sits on any background.
// https://github.com/zachvivier/chip-spinner · MIT License

const TAU = 2 * Math.PI;
const unit = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
const LIGHT = unit([-0.45, 0.6, 0.66]);
const HALF = unit([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
// "right" rolls up through the top right; "left" rolls up through the top left.
const AXES = { right: unit([1, -1, 0]), left: unit([1, 1, 0]) };
const STILL_ANGLE = 0.6, STILL_FAN = 0.4, FAN_TURNS_PER_SECOND = 1.3;

const frac = v => v - Math.floor(v);
const box = (x0, x1, y0, y1, z0, z1, albedo, tex) => ({ lo: [x0, y0, z0], hi: [x1, y1, z1], albedo, tex });

// Groups share one bounding box, so a ray that misses the group skips its boxes.
function group(boxes) {
  const lo = [0, 1, 2].map(i => Math.min(...boxes.map(b => b.lo[i])));
  const hi = [0, 1, 2].map(i => Math.max(...boxes.map(b => b.hi[i])));
  return { lo, hi, boxes };
}

function cpuModel() {
  const body = [
    box(-5.5, 5.5, -5.5, 5.5, -0.7, 0.7, 0.42, (p, axis, sign) =>
      axis === 2 && sign > 0 && Math.hypot(p[0] + 4.4, p[1] - 4.4) < 0.45 ? 0.1 : 0.42),
    box(-3.4, 3.4, -3.4, 3.4, 0.7, 1.5, 0.95, (p, axis) =>
      axis === 2 && Math.abs(Math.max(Math.abs(p[0]), Math.abs(p[1])) - 2.7) < 0.16 ? 0.6 : 0.95),
  ];
  // Seven gull-wing pins per side: a flat leg out from the body, then a foot bent down.
  const sides = [-1, 1].flatMap(s => {
    const leg = s > 0 ? [5.5, 7.4] : [-7.4, -5.5], foot = s > 0 ? [6.8, 7.4] : [-7.4, -6.8];
    const across = [], along = [];
    for (let i = -3; i <= 3; i++) {
      const o = i * 1.4, w = 0.3;
      across.push(box(...leg, o - w, o + w, -0.15, 0.2, 0.88), box(...foot, o - w, o + w, -1.2, 0.2, 0.88));
      along.push(box(o - w, o + w, ...leg, -0.15, 0.2, 0.88), box(o - w, o + w, ...foot, -1.2, 0.2, 0.88));
    }
    return [group(across), group(along)];
  });
  return { groups: [group(body), ...sides], radius: 8.8, grid: 25, duration: 5200 };
}

function fanFace(x, y, fan) {
  for (const cx of [-6.2, 6.2]) {
    const dx = x - cx, r = Math.hypot(dx, y);
    if (r > 3.9) continue;
    if (r > 3.55) return 0.95;
    if (r < 1) return r < 0.72 ? 0.85 : 0.35;
    return frac(7 * (Math.atan2(y, dx) - fan - r * 0.35) / TAU) < 0.42 ? 0.78 : 0.1;
  }
  return Math.abs(y) > 4.35 ? 0.95 : 0.8;
}

function gpuModel() {
  const boxes = [
    box(-13, 13, -4.8, 4.8, -0.3, 0, 0.35),
    box(-12.5, 12.5, -4.4, 4.4, -0.6, -0.3, 0.72, (p, axis) =>
      axis === 2 && Math.abs(p[1]) < 2.8 && Math.abs(p[0]) < 10 && frac((p[0] + 12) / 2.4) < 0.5 ? 0.22 : 0.72),
    box(-6, 3, -5.6, -4.8, -0.3, 0, 0.9, p => (frac(p[0] / 0.8) < 0.55 ? 0.95 : 0.25)),
    box(-12, 12, -4.6, 4.6, 0, 1.2, 0.5, (p, axis) => (axis === 1 ? (frac(p[0] * 1.2) < 0.5 ? 0.85 : 0.18) : 0.5)),
    box(-12.5, 12.5, -4.8, 4.8, 1.2, 2.2, 0.82, (p, axis, sign, fan) => (axis === 2 && sign > 0 ? fanFace(p[0], p[1], fan) : 0.82)),
    box(-13.6, -13, -6.2, 5.4, -0.5, 2.6, 0.78, (p, axis) =>
      axis === 0 && p[1] > -3 && p[1] < 4 && frac((p[1] + 6) * 0.9) < 0.5 ? 0.25 : 0.78),
    box(5, 9, 4.8, 5.6, 0.3, 1.3, 0.28),
  ];
  return { groups: [group(boxes)], radius: 15, grid: 35, duration: 6400 };
}

export const CHIP_MODELS = { cpu: cpuModel(), gpu: gpuModel() };

// Rotation about axis k by angle a (Rodrigues), as rows.
function rotation([kx, ky, kz], a) {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [
    [c + kx * kx * t, kx * ky * t - kz * s, kx * kz * t + ky * s],
    [ky * kx * t + kz * s, c + ky * ky * t, ky * kz * t - kx * s],
    [kz * kx * t - ky * s, kz * ky * t + kx * s, c + kz * kz * t],
  ];
}

let slabAxis = 0;
// Distance along the ray to the box's near face, or Infinity on a miss. Sets slabAxis.
function slab(b, o, d, inv) {
  let near = -Infinity, far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (d[i] === 0) {
      if (o[i] < b.lo[i] || o[i] > b.hi[i]) return Infinity;
      continue;
    }
    let t1 = (b.lo[i] - o[i]) * inv[i], t2 = (b.hi[i] - o[i]) * inv[i];
    if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
    if (t1 > near) { near = t1; slabAxis = i; }
    if (t2 < far) far = t2;
  }
  return near <= far ? near : Infinity;
}

// Lit shade of the nearest face along the ray, or -1 on a miss.
function cast(model, o, d, inv, R, fan) {
  let best = Infinity, hit = null, hitAxis = 0;
  for (const g of model.groups) {
    if (slab(g, o, d, inv) === Infinity) continue;
    for (const b of g.boxes) {
      const t = slab(b, o, d, inv);
      if (t < best) { best = t; hit = b; hitAxis = slabAxis; }
    }
  }
  if (!hit) return -1;
  const sign = d[hitAxis] > 0 ? -1 : 1;
  const albedo = hit.tex ? hit.tex([o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best], hitAxis, sign, fan) : hit.albedo;
  const n0 = sign * R[0][hitAxis], n1 = sign * R[1][hitAxis], n2 = sign * R[2][hitAxis];
  const diffuse = Math.max(0, n0 * LIGHT[0] + n1 * LIGHT[1] + n2 * LIGHT[2]);
  const spec = Math.max(0, n0 * HALF[0] + n1 * HALF[1] + n2 * HALF[2]) ** 24;
  return albedo * (0.15 + 0.85 * diffuse) + 0.4 * spec;
}

// Returns [cover, light] per dot, row by row: the share of rays that hit, and their mean shade.
export function shadeChip(chip, angle, fan = 0, { samples = 3, axis = 'right' } = {}) {
  const model = CHIP_MODELS[chip], { grid, radius } = model;
  const R = rotation(AXES[axis] || AXES.right, -angle);
  const d = [-R[2][0], -R[2][1], -R[2][2]], inv = d.map(v => (v === 0 ? 0 : 1 / v));
  const size = (2 * radius) / grid, out = new Float32Array(grid * grid * 2), o = [0, 0, 0];
  for (let row = 0; row < grid; row++) for (let col = 0; col < grid; col++) {
    let hits = 0, light = 0;
    for (let i = 0; i < samples; i++) for (let j = 0; j < samples; j++) {
      const X = (col - grid / 2 + (i + 0.5) / samples) * size, Y = (grid / 2 - row - (j + 0.5) / samples) * size;
      if (X * X + Y * Y > radius * radius) continue;
      for (let k = 0; k < 3; k++) o[k] = X * R[0][k] + Y * R[1][k] + 50 * R[2][k];
      const shade = cast(model, o, d, inv, R, fan);
      if (shade >= 0) { hits++; light += shade; }
    }
    const at = (row * grid + col) * 2;
    out[at] = hits / (samples * samples);
    out[at + 1] = hits ? Math.min(1, light / hits) : 0;
  }
  return out;
}

function paint(canvas, angle, fan) {
  const chip = canvas.dataset.chip, { grid } = CHIP_MODELS[chip];
  const dot = Number(canvas.dataset.dot) || 1, dpr = globalThis.devicePixelRatio || 1, px = grid * dot;
  if (canvas.width !== Math.round(px * dpr)) {
    canvas.width = canvas.height = Math.round(px * dpr);
    canvas.style.width = canvas.style.height = `${px}px`;
  }
  const shades = shadeChip(chip, angle, fan, { samples: dot >= 2 ? 4 : 3, axis: canvas.dataset.axis });
  // At a one-pixel pitch, slightly overlapping dots keep the chip bright.
  const reach = dot >= 2 ? 0.5 : 0.62;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.fillStyle = getComputedStyle(canvas).color;
  for (let i = 0; i < grid * grid; i++) {
    const cover = shades[i * 2];
    if (!cover) continue;
    const light = shades[i * 2 + 1] ** 0.8;
    ctx.globalAlpha = 0.3 + 0.7 * light;
    ctx.beginPath();
    ctx.arc((i % grid + 0.5) * dot, (Math.floor(i / grid) + 0.5) * dot, dot * reach * Math.sqrt(cover) * (0.35 + 0.65 * light), 0, TAU);
    ctx.fill();
  }
}

const spinning = new Set();
let frameId = 0;

// The pose comes from the clock, so a redrawn canvas picks up where the old one was.
function paintAt(canvas, now) {
  const duration = Number(canvas.dataset.duration) || CHIP_MODELS[canvas.dataset.chip].duration;
  paint(canvas, TAU * now / duration, TAU * FAN_TURNS_PER_SECOND * now / 1000);
}

function tick(now) {
  frameId = 0;
  for (const canvas of spinning) if (!canvas.isConnected) spinning.delete(canvas);
  if (!spinning.size) return;
  for (const canvas of spinning) if (canvas.offsetParent !== null) paintAt(canvas, now);
  frameId = requestAnimationFrame(tick);
}

// Draws every canvas[data-chip] under root. Each one spins until it leaves the
// page, unless it has data-still or the viewer prefers reduced motion.
export function mountChips(root = document) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const canvas of root.querySelectorAll('canvas[data-chip]')) {
    if (!CHIP_MODELS[canvas.dataset.chip]) continue;
    if (still || canvas.hasAttribute('data-still')) {
      spinning.delete(canvas);
      paint(canvas, STILL_ANGLE, STILL_FAN);
    } else {
      spinning.add(canvas);
      paintAt(canvas, performance.now());
    }
  }
  if (spinning.size && !frameId) frameId = requestAnimationFrame(tick);
}
