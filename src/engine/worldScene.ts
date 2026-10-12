import { GHOST_HUES } from './palette';
import type { Theme } from './themes';

/**
 * Animated key art for each world, used by the world picker and the
 * "entering a world" card. Purely decorative: the layout is seeded so it
 * never jumps, and every moving element is a function of time (no state),
 * so a reduced-motion caller can simply draw a single frame.
 */
/** `banner` keeps figures clear of the text block on the left; `full` is a centred title card. */
export type SceneLayout = 'banner' | 'full';

export function drawWorldScene(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, t: number, layout: SceneLayout = 'full'): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.bgTop);
  bg.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const s = t / 1000;
  switch (theme.id) {
    case 'echo':
      echo(ctx, w, h, s, layout);
      break;
    case 'foundry':
      foundry(ctx, w, h, s);
      break;
    case 'tide':
      tide(ctx, w, h, s);
      break;
    case 'neon':
      neon(ctx, w, h, s);
      break;
    case 'horizon':
      horizon(ctx, w, h, s, layout);
      break;
  }

  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

// ───────────────────────────── helpers ─────────────────────────────

function rng(seed: number): () => number {
  let a = seed * 2654435761;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (v: number, m: number) => ((v % m) + m) % m;

function figure(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string, dashed: boolean, facing = 1): void {
  const bw = size * 0.66;
  const bh = size;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh, bw, bh, bw * 0.3);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.setLineDash(dashed ? [size * 0.12, size * 0.09] : []);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = dashed ? stroke : '#2b2108';
  ctx.beginPath();
  ctx.roundRect(facing > 0 ? x - bw * 0.05 : x - bw * 0.45, y - bh * 0.78, bw * 0.5, bh * 0.2, bh * 0.1);
  ctx.fill();
}

// ───────────────────────────── worlds ─────────────────────────────

/** Echo Labs: a measured grid, a pulse of time, and your echoes walking behind you. */
function echo(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, layout: SceneLayout): void {
  const step = Math.max(18, Math.min(w, h) / 9);
  const cx = w * 0.5;
  const cy = h * 0.55;
  const wave = wrap(s * 120, Math.hypot(w, h));
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const d = Math.hypot(x - cx, y - cy);
      const near = Math.max(0, 1 - Math.abs(d - wave) / (step * 1.5));
      ctx.fillStyle = `rgba(140,170,255,${0.08 + near * 0.45})`;
      const r = 1.2 + near * 1.8;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const ground = layout === 'banner' ? h * 0.86 : h * 0.82;
  ctx.fillStyle = 'rgba(100,118,194,0.35)';
  ctx.fillRect(0, ground, w, 2);
  const size = Math.min(70, h * 0.28);
  // On a banner the procession walks the right half, clear of the title.
  const x0 = layout === 'banner' ? w * 0.48 : -size * 2;
  const span = w - x0 + size * 7;
  const lead = x0 + wrap(s * 70, span);
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout === 'banner' ? w * 0.46 : 0, 0, w, h);
  ctx.clip();
  // Echoes trail the player at fixed delays — the whole idea of the game.
  for (let i = 4; i >= 1; i--) {
    const x = lead - i * size * 1.25;
    const hue = GHOST_HUES[(i - 1) % GHOST_HUES.length];
    for (let k = 1; k <= 5; k++) {
      ctx.fillStyle = `hsla(${hue},85%,72%,${0.12 - k * 0.02})`;
      ctx.fillRect(x - k * size * 0.18, ground - size * 0.08, 3, 3);
    }
    figure(ctx, x, ground, size, `hsla(${hue},85%,72%,0.22)`, `hsla(${hue},85%,72%,0.8)`, true);
  }
  ctx.shadowColor = 'rgba(255,215,106,0.7)';
  ctx.shadowBlur = 18;
  figure(ctx, lead, ground, size, '#ffd76a', '#ffd76a', false);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function gear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, angle: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r * 0.84;
    ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(120,70,30,${alpha * 0.55})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,170,90,${alpha})`;
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.cos((i * Math.PI) / 2) * r * 0.32, Math.sin((i * Math.PI) / 2) * r * 0.32);
    ctx.lineTo(Math.cos((i * Math.PI) / 2) * r * 0.75, Math.sin((i * Math.PI) / 2) * r * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

/** Clockwork Foundry: interlocking gears and a rising swarm of embers. */
function foundry(ctx: CanvasRenderingContext2D, w: number, h: number, s: number): void {
  const glow = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, h * 1.2);
  glow.addColorStop(0, `rgba(255,120,40,${0.28 + Math.sin(s * 1.7) * 0.05})`);
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const u = Math.min(w, h);
  // A chain of meshing gears: each turns the opposite way, speed scaled by size.
  const chain: [number, number, number, number][] = [
    [0.12, 0.62, 0.42, 14],
    [0.32, 0.3, 0.3, 10],
    [0.5, 0.72, 0.36, 12],
    [0.72, 0.36, 0.44, 16],
    [0.92, 0.75, 0.28, 9],
  ];
  chain.forEach(([fx, fy, fr, teeth], i) => {
    const r = u * fr;
    const dir = i % 2 ? -1 : 1;
    gear(ctx, w * fx, h * fy, r, teeth, (dir * s * 0.6) / fr, 0.32 - (i % 2) * 0.08);
  });
  const r = rng(7);
  for (let i = 0; i < 70; i++) {
    const speed = 20 + r() * 50;
    const x0 = r() * w;
    const phase = r() * 1000;
    const y = h - wrap(s * speed + phase, h + 40) + 20;
    const x = x0 + Math.sin(s * 1.3 + i) * 12;
    const flick = 0.5 + 0.5 * Math.sin(s * 9 + i * 3);
    ctx.fillStyle = `rgba(255,${150 + Math.floor(flick * 60)},70,${(0.25 + 0.5 * flick) * (y / h)})`;
    const sz = 1 + r() * 2.2;
    ctx.fillRect(x, y, sz, sz);
  }
}

/** Drowned Observatory: swaying light shafts, a sunken dome, and bubbles. */
function tide(ctx: CanvasRenderingContext2D, w: number, h: number, s: number): void {
  for (let i = 0; i < 6; i++) {
    const x = (w * (i + 0.5)) / 6 + Math.sin(s * 0.4 + i * 1.7) * w * 0.04;
    const bw = w * 0.05 + (i % 3) * w * 0.02;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(140,250,240,${0.1 + 0.04 * Math.sin(s + i)})`);
    g.addColorStop(1, 'rgba(140,250,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + bw, 0);
    ctx.lineTo(x + bw + h * 0.45, h);
    ctx.lineTo(x + h * 0.3, h);
    ctx.fill();
  }
  // Caustics shimmer near the surface.
  ctx.strokeStyle = 'rgba(160,250,240,0.12)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.06 + k * 0.05) + Math.sin(x / 40 + s * 1.6 + k) * 4);
    ctx.stroke();
  }
  const r0 = Math.min(w * 0.38, h * 0.95);
  ctx.strokeStyle = 'rgba(90,216,204,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.5, h + r0 * 0.15, r0, Math.PI, 0);
  ctx.stroke();
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i * Math.PI) / 8;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h + r0 * 0.15);
    ctx.lineTo(w * 0.5 + Math.cos(a) * r0, h + r0 * 0.15 + Math.sin(a) * r0);
    ctx.stroke();
  }
  const r = rng(11);
  for (let i = 0; i < 45; i++) {
    const speed = 18 + r() * 40;
    const x0 = r() * w;
    const y = h - wrap(s * speed + r() * 1000, h + 30) + 15;
    const x = x0 + Math.sin(s * 2 + i) * 5;
    const rad = 1.5 + r() * 4;
    ctx.strokeStyle = `rgba(170,255,245,${0.15 + 0.3 * (1 - y / h)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Neon Spire: a two-layer skyline, blinking windows, rain and a passing light. */
function neon(ctx: CanvasRenderingContext2D, w: number, h: number, s: number): void {
  const glow = ctx.createLinearGradient(0, h * 0.35, 0, h);
  glow.addColorStop(0, 'rgba(255,79,216,0)');
  glow.addColorStop(1, 'rgba(255,79,216,0.3)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const layer = (seed: number, scale: number, color: string, speed: number, windows: boolean) => {
    const r = rng(seed);
    const blocks: [number, number, number][] = [];
    let x = 0;
    const total = w * 1.6;
    while (x < total) {
      const bw = (30 + r() * 60) * scale;
      blocks.push([x, bw, (h * 0.25 + r() * h * 0.55) * scale]);
      x += bw + 4 * scale;
    }
    const off = wrap(s * speed, total);
    for (const [bx, bw, bh] of blocks) {
      for (const shift of [-total, 0]) {
        const px = bx - off + shift + total * 0.5;
        if (px > w || px + bw < 0) continue;
        ctx.fillStyle = color;
        ctx.fillRect(px, h - bh, bw, bh);
        if (!windows) continue;
        for (let wy = h - bh + 8; wy < h - 6; wy += 11) {
          for (let wx = px + 5; wx < px + bw - 6; wx += 9) {
            const seedW = Math.floor(wx * 7 + wy * 13 + bx);
            const lit = (seedW * 2654435761) % 97 < 14;
            if (!lit) continue;
            const blink = (Math.floor(s * 0.7 + (seedW % 11)) % 9) !== 0;
            if (!blink) continue;
            ctx.fillStyle = seedW % 2 ? 'rgba(255,120,230,0.55)' : 'rgba(120,220,255,0.5)';
            ctx.fillRect(wx, wy, 3, 5);
          }
        }
      }
    }
  };
  layer(3, 0.75, 'rgba(60,20,100,0.55)', 6, false);
  layer(5, 1, 'rgba(32,10,58,0.95)', 14, true);
  // Neon line along the rooftops, pulsing.
  ctx.strokeStyle = `rgba(255,79,216,${0.55 + 0.25 * Math.sin(s * 3)})`;
  ctx.shadowColor = '#ff4fd8';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.92);
  ctx.lineTo(w, h * 0.92);
  ctx.stroke();
  // A light streaking along the line.
  const lx = wrap(s * w * 0.35, w * 1.4) - w * 0.2;
  const lg = ctx.createLinearGradient(lx - 120, 0, lx, 0);
  lg.addColorStop(0, 'rgba(120,220,255,0)');
  lg.addColorStop(1, 'rgba(180,240,255,0.95)');
  ctx.strokeStyle = lg;
  ctx.shadowColor = '#7fdcff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lx - 120, h * 0.92);
  ctx.lineTo(lx, h * 0.92);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const r = rng(13);
  ctx.strokeStyle = 'rgba(160,200,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const x = wrap(r() * w * 1.3 - s * 60, w * 1.3);
    const y = wrap(r() * h + s * (380 + r() * 200), h + 40) - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y - 16);
    ctx.stroke();
  }
}

/** Event Horizon: a starfield bent around a spinning accretion disk. */
function horizon(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, layout: SceneLayout): void {
  const r = rng(17);
  for (let i = 0; i < 3; i++) {
    const cx = w * (0.2 + r() * 0.6) + Math.sin(s * 0.1 + i) * 20;
    const cy = h * (0.2 + r() * 0.6);
    const rad = Math.max(w, h) * (0.35 + r() * 0.3);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, i % 2 ? 'rgba(120,80,255,0.18)' : 'rgba(60,200,255,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const bx = layout === 'full' ? w * 0.8 : w * 0.68;
  const by = layout === 'full' ? h * 0.24 : h * 0.5;
  const R = layout === 'full' ? Math.min(w * 0.065, h * 0.15) : Math.min(w * 0.11, h * 0.24);
  for (let i = 0; i < 200; i++) {
    let x = r() * w;
    let y = r() * h;
    // Gentle lensing: stars near the hole are pushed outward.
    const dx = x - bx;
    const dy = y - by;
    const d = Math.hypot(dx, dy);
    if (d < R * 3) {
      const push = (R * R * 1.4) / Math.max(d, 1);
      x += (dx / Math.max(d, 1)) * push;
      y += (dy / Math.max(d, 1)) * push;
    }
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(s * (0.6 + r()) + i));
    ctx.fillStyle = `rgba(230,220,255,${0.15 + tw * 0.6})`;
    const sz = r() < 0.9 ? 1 : 2;
    ctx.fillRect(x, y, sz, sz);
  }
  // Accretion disk: the far half behind the hole, the near half in front.
  const disk = (front: boolean) => {
    const segs = 48;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      if (front !== Math.sin(mid) > 0) continue;
      const bright = 0.35 + 0.55 * (0.5 + 0.5 * Math.cos(mid - s * 1.4));
      ctx.strokeStyle = `rgba(255,${170 + Math.floor(bright * 60)},120,${bright * (front ? 0.95 : 0.55)})`;
      ctx.lineWidth = R * 0.22;
      ctx.beginPath();
      ctx.ellipse(bx, by, R * 2.6, R * 0.62, -0.2, a0, a1 + 0.02);
      ctx.stroke();
    }
  };
  disk(false);
  ctx.fillStyle = '#000';
  ctx.shadowColor = 'rgba(255,200,150,0.8)';
  ctx.shadowBlur = R * 0.6;
  ctx.beginPath();
  ctx.arc(bx, by, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,225,190,${0.7 + 0.2 * Math.sin(s * 2)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, R * 1.04, 0, Math.PI * 2);
  ctx.stroke();
  disk(true);
}
