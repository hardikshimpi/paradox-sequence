import { CHAR_H, CHAR_W, COLS, INTERACT_REACH, ROWS, TILE, WORLD_H, WORLD_W } from '../game/constants';
import { condSources } from '../game/conditions';
import { expand, overlaps } from '../game/geometry';
import { TILE_LEDGE, TILE_SPIKE, TILE_WALL, tileAt, type LevelData } from '../game/level';
import type { LevelSession } from '../game/session';
import type { Cond, Rect } from '../game/types';
import type { Character, World } from '../game/world';
import { phaseOf } from '../game/phases';
import { CHANNEL_COLORS, COLORS, GLYPHS, KEY_COLORS, ghostColor, type Glyph } from './palette';
import { THEMES, type Theme } from './themes';

export interface RenderOptions {
  ghostPaths: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  touch: boolean;
}

export interface Viewport {
  /** CSS-pixel rectangle inside the canvas where the world is fitted. */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export type Transition = { kind: 'loop' | 'death' | 'restart' | 'level'; start: number; duration: number; label: string; sub: string };

const FONT = '600 13px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private staticLayer: HTMLCanvasElement | null = null;
  private staticKey = '';
  private gateOpen = new Map<string, number>();
  private particles: Particle[] = [];
  private shake = 0;
  private ambient: Ambient[] = [];
  private theme: Theme = THEMES.echo;
  transition: Transition | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
  }

  resize(cssW: number, cssH: number, dpr: number, view: Viewport): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.scale = Math.min(view.w / WORLD_W, view.h / WORLD_H);
    this.ox = view.x + (view.w - WORLD_W * this.scale) / 2;
    this.oy = view.y + (view.h - WORLD_H * this.scale) / 2;
    this.staticKey = '';
  }

  /** World rectangle in CSS pixels (for positioning DOM overlays). */
  get worldBox(): Viewport {
    return { x: this.ox, y: this.oy, w: WORLD_W * this.scale, h: WORLD_H * this.scale };
  }

  resetFx(): void {
    this.gateOpen.clear();
    this.particles = [];
  }

  burst(x: number, y: number, color: string, count: number, opts: RenderOptions, speed = 2.2): void {
    if (opts.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const v = speed * (0.5 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 0, max: 26 + Math.random() * 18, color, size: 2 + Math.random() * 2 });
    }
  }

  kick(amount: number, opts: RenderOptions): void {
    if (!opts.reducedMotion) this.shake = Math.max(this.shake, amount);
  }

  render(session: LevelSession, alpha: number, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    const w = session.world;
    const level = session.level;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    let sx = 0;
    let sy = 0;
    if (this.shake > 0.1) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake *= 0.85;
    } else this.shake = 0;

    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * (this.ox + sx), this.dpr * (this.oy + sy));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, WORLD_W, WORLD_H);
    ctx.clip();

    this.theme = THEMES[phaseOf(level.def.id).theme];
    this.drawStatic(level, opts);
    this.drawAmbient(now, opts);
    this.drawPlatformTracks(w);
    this.drawConveyors(w, level);
    this.drawPads(w, level);
    this.drawCrumbles(w);
    this.drawExit(w, now, opts);
    this.drawSequences(w, level);
    this.drawPlates(w, level);
    this.drawSwitches(w, level, now);
    this.drawGates(w, level);
    this.drawLocks(w, opts);
    this.drawLasers(w, level, now, opts);
    this.drawPlatforms(w, level, alpha);
    this.drawKeys(w, now, opts);
    this.drawPortals(w, level, now, opts);
    this.drawBarriers(w, now, opts);
    if (opts.ghostPaths) this.drawGhostPaths(session);
    this.drawCharacters(w, alpha, now, opts);
    this.drawParticles();
    this.drawPrompts(w, level, opts);
    ctx.restore();

    this.drawTransition(now);
  }

  // ───────────────────────────── static layer ─────────────────────────────

  private drawStatic(level: LevelData, opts: RenderOptions): void {
    const key = `${level.def.id}|${this.scale}|${this.dpr}|${opts.highContrast}`;
    if (this.staticKey !== key || !this.staticLayer) {
      this.staticLayer = this.buildStatic(level, opts);
      this.staticKey = key;
      this.ambient = [];
    }
    this.ctx.drawImage(this.staticLayer, 0, 0, WORLD_W, WORLD_H);
  }

  private buildStatic(level: LevelData, opts: RenderOptions): HTMLCanvasElement {
    const T = this.theme;
    const k = Math.max(1, this.scale * this.dpr);
    const c = document.createElement('canvas');
    c.width = Math.ceil(WORLD_W * k);
    c.height = Math.ceil(WORLD_H * k);
    const g = c.getContext('2d')!;
    g.scale(k, k);

    const bg = g.createLinearGradient(0, 0, 0, WORLD_H);
    bg.addColorStop(0, T.bgTop);
    bg.addColorStop(1, T.bgBottom);
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    drawBackdrop(g, T, level.def.id);

    // Faint grid dots: a sense of measured space.
    g.fillStyle = T.grid;
    for (let r = 1; r < ROWS; r++) for (let col = 1; col < COLS; col++) g.fillRect(col * TILE - 1, r * TILE - 1, 2, 2);

    // Soft vignette.
    const vg = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.3, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = vg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    const isWall = (col: number, row: number): boolean => tileAt(level, col, row) === TILE_WALL;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = tileAt(level, col, row);
        const x = col * TILE;
        const y = row * TILE;
        if (t === TILE_WALL) {
          const open = { up: !isWall(col, row - 1), down: !isWall(col, row + 1), left: !isWall(col - 1, row), right: !isWall(col + 1, row) };
          const exposed = open.up || open.down || open.left || open.right;
          g.fillStyle = exposed ? T.wall : T.wallInner;
          g.fillRect(x, y, TILE, TILE);
          if (exposed) {
            g.fillStyle = opts.highContrast ? '#9aa6d8' : T.wallEdge;
            if (open.left) g.fillRect(x, y, 2, TILE);
            if (open.right) g.fillRect(x + TILE - 2, y, 2, TILE);
            if (open.down) g.fillRect(x, y + TILE - 2, TILE, 2);
            if (open.up) {
              g.fillStyle = opts.highContrast ? '#e8ecff' : T.wallTop;
              g.fillRect(x, y, TILE, 3);
            }
          }
          // Faint diagonal hatching marks everything solid.
          g.save();
          g.beginPath();
          g.rect(x, y, TILE, TILE);
          g.clip();
          g.strokeStyle = T.hatch;
          g.globalAlpha = exposed ? 1 : 0.65;
          g.lineWidth = 1;
          g.beginPath();
          for (let d = -TILE; d < TILE; d += 10) {
            g.moveTo(x + d, y + TILE);
            g.lineTo(x + d + TILE, y);
          }
          g.stroke();
          g.restore();
        } else if (t === TILE_SPIKE) {
          g.fillStyle = COLORS.spike;
          g.shadowColor = COLORS.spike;
          g.shadowBlur = 8;
          const n = 4;
          const sw = TILE / n;
          g.beginPath();
          for (let i = 0; i < n; i++) {
            g.moveTo(x + i * sw + 1, y + TILE);
            g.lineTo(x + i * sw + sw / 2, y + TILE / 2 + 2);
            g.lineTo(x + (i + 1) * sw - 1, y + TILE);
          }
          g.fill();
          g.shadowBlur = 0;
        } else if (t === TILE_LEDGE) {
          g.fillStyle = T.ledge;
          g.fillRect(x, y, TILE, 4);
          g.fillStyle = withAlpha(T.ledge, 0.25);
          g.fillRect(x + 2, y + 4, TILE - 4, 6);
        }
      }
    }

    g.font = FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const s of level.def.signs ?? []) {
      g.fillStyle = T.sign;
      g.fillText(s.text, s.col * TILE, s.row * TILE);
    }
    return c;
  }

  private drawAmbient(now: number, opts: RenderOptions): void {
    if (opts.reducedMotion) return;
    const T = this.theme;
    const ctx = this.ctx;
    const want = T.ambient === 'rain' ? 70 : T.ambient === 'stars' ? 46 : 34;
    while (this.ambient.length < want) this.ambient.push(spawnAmbient(T.ambient, this.ambient.length < want / 2));
    const col = T.ambientColor;
    for (const p of this.ambient) {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.y < -20 || p.y > WORLD_H + 20 || p.x < -40 || p.x > WORLD_W + 40 || p.life > p.max) Object.assign(p, spawnAmbient(T.ambient, false));
      const fade = Math.min(1, p.life / 30, (p.max - p.life) / 30);
      switch (T.ambient) {
        case 'dust':
          ctx.fillStyle = `rgba(${col},${0.14 * fade})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          break;
        case 'embers': {
          const flick = 0.5 + 0.5 * Math.sin(now / 90 + p.seed * 10);
          ctx.fillStyle = `rgba(${col},${(0.25 + 0.3 * flick) * fade})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          p.vx += Math.sin(now / 600 + p.seed * 6) * 0.01;
          break;
        }
        case 'bubbles':
          ctx.strokeStyle = `rgba(${col},${0.2 * fade})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(now / 500 + p.seed * 9) * 3, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'rain':
          ctx.strokeStyle = `rgba(${col},${0.09 * fade})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
          break;
        case 'stars': {
          const tw = 0.5 + 0.5 * Math.sin(now / 400 + p.seed * 20);
          ctx.fillStyle = `rgba(${col},${0.35 * tw * fade})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          break;
        }
      }
    }
  }

  // ───────────────────────────── objects ─────────────────────────────

  private channel(level: LevelData, id: string): { color: string; glyph: Glyph } {
    const i = level.channels[id] ?? 0;
    return { color: CHANNEL_COLORS[i % CHANNEL_COLORS.length], glyph: GLYPHS[i % GLYPHS.length] };
  }

  private condColor(level: LevelData, cond: Cond | undefined, fallback = '#8fa0d8'): string {
    const first = condSources(cond).find((id) => id in level.channels);
    return first ? this.channel(level, first).color : fallback;
  }

  private drawCondGlyphs(level: LevelData, cond: Cond | undefined, cx: number, cy: number, vertical: boolean): void {
    const refs = flattenRefs(cond);
    const step = 14;
    refs.forEach((ref, i) => {
      const off = (i - (refs.length - 1) / 2) * step;
      const x = vertical ? cx : cx + off;
      const y = vertical ? cy + off : cy;
      const ch = level.channels[ref.id] !== undefined ? this.channel(level, ref.id) : { color: '#cfd6f5', glyph: 'circle' as Glyph };
      drawGlyph(this.ctx, ch.glyph, x, y, 5, ch.color, !ref.negated);
      if (ref.negated) {
        this.ctx.strokeStyle = ch.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 6, y + 6);
        this.ctx.lineTo(x + 6, y - 6);
        this.ctx.stroke();
      }
    });
  }

  private drawPlates(w: World, level: LevelData): void {
    const ctx = this.ctx;
    for (const p of w.plates) {
      const { color, glyph } = this.channel(level, p.id);
      const h = p.pressed ? 3 : 7;
      const x = p.rect.x + 4;
      const y = p.rect.y + p.rect.h - h;
      const pw = p.rect.w - 8;
      if (p.pressed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = p.pressed ? color : mix(color, 0.45);
      roundRect(ctx, x, y, pw, h, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 2, y + h - 1, pw - 4, 1);
      drawGlyph(ctx, glyph, p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h - 18, 5, color, p.pressed);
      if (p.required > 1) {
        for (let i = 0; i < p.required; i++) {
          const dx = (i - (p.required - 1) / 2) * 10;
          ctx.beginPath();
          ctx.arc(p.rect.x + p.rect.w / 2 + dx, p.rect.y + p.rect.h - 30, 3, 0, Math.PI * 2);
          ctx.fillStyle = i < p.count ? color : 'rgba(255,255,255,0.12)';
          ctx.fill();
        }
      }
    }
  }

  private drawSwitches(w: World, level: LevelData, _now: number): void {
    const ctx = this.ctx;
    for (const s of w.switches) {
      const { color, glyph } = this.channel(level, s.id);
      const cx = s.rect.x + s.rect.w / 2;
      const by = s.rect.y + s.rect.h;
      ctx.fillStyle = '#28305a';
      roundRect(ctx, cx - 12, by - 8, 24, 8, 2);
      ctx.fill();
      if (s.duration > 0) {
        // Timed button with a ring showing time left.
        const cy = by - 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fillStyle = s.on ? color : mix(color, 0.35);
        if (s.on) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.stroke();
        if (s.on) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.remaining) / s.duration);
          ctx.stroke();
        }
        drawGlyph(ctx, glyph, cx, cy, 4, s.on ? '#0b0f1e' : color, true);
      } else {
        const ang = s.on ? 0.6 : -0.6;
        ctx.strokeStyle = s.on ? color : mix(color, 0.6);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, by - 6);
        ctx.lineTo(cx + Math.sin(ang) * 20, by - 6 - Math.cos(ang) * 20);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.arc(cx + Math.sin(ang) * 20, by - 6 - Math.cos(ang) * 20, 5, 0, Math.PI * 2);
        ctx.fillStyle = s.on ? color : mix(color, 0.6);
        if (s.on) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        drawGlyph(ctx, glyph, cx, by - 34, 4, color, s.on);
      }
    }
  }

  private drawGates(w: World, level: LevelData): void {
    const ctx = this.ctx;
    for (const g of w.gates) {
      const target = g.solid ? 0 : 1;
      const cur = this.gateOpen.get(g.id) ?? target;
      const open = cur + (target - cur) * 0.25;
      this.gateOpen.set(g.id, Math.abs(open - target) < 0.01 ? target : open);
      const color = g.when === undefined ? '#c9ced9' : this.condColor(level, g.when);
      const r = g.rect;
      if (g.kind === 'door') {
        // Frame
        ctx.fillStyle = '#10152b';
        ctx.fillRect(r.x + 4, r.y, r.w - 8, r.h);
        ctx.fillStyle = mix(color, 0.5);
        ctx.fillRect(r.x + 4, r.y, 2, r.h);
        ctx.fillRect(r.x + r.w - 6, r.y, 2, r.h);
        // Panel retracts upward.
        const ph = r.h * (1 - open);
        if (ph > 0.5) {
          const grad = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
          grad.addColorStop(0, mix(color, 0.35));
          grad.addColorStop(0.5, mix(color, 0.6));
          grad.addColorStop(1, mix(color, 0.35));
          ctx.fillStyle = grad;
          ctx.fillRect(r.x + 8, r.y, r.w - 16, ph);
          ctx.fillStyle = color;
          ctx.fillRect(r.x + 8, r.y + ph - 3, r.w - 16, 3);
          for (let y = r.y + 10; y < r.y + ph - 8; y += 14) {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(r.x + 10, y, r.w - 20, 2);
          }
        }
        if (open < 0.5) this.drawCondGlyphs(level, g.when, r.x + r.w / 2, r.y + r.h / 2, true);
        else this.drawCondGlyphs(level, g.when, r.x + r.w / 2, r.y + 10, false);
        if (g.cycle) {
          // Shutter clock: how long until it next opens or closes.
          const period = g.cycle.on + g.cycle.off;
          const phase = (w.tick + g.cycle.offset) % period;
          const isOpen = phase < g.cycle.on;
          const frac = isOpen ? 1 - phase / g.cycle.on : 1 - (phase - g.cycle.on) / g.cycle.off;
          const cx = r.x + r.w / 2;
          const cy = r.y - 9;
          ctx.fillStyle = '#10152b';
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isOpen ? '#9be564' : '#ff7b54';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
          ctx.stroke();
        }
      } else {
        // Hard-light bridge.
        if (open < 0.5) {
          ctx.fillStyle = withAlpha(color, 0.28 + 0.2 * (1 - open));
          ctx.fillRect(r.x, r.y, r.w, 14);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fillRect(r.x, r.y, r.w, 3);
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = withAlpha(color, 0.35);
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, 12);
          ctx.setLineDash([]);
        }
        this.drawCondGlyphs(level, g.when, r.x + r.w / 2, r.y + 24, false);
      }
    }
  }

  private drawLocks(w: World, _opts: RenderOptions): void {
    const ctx = this.ctx;
    for (const l of w.locks) {
      const color = KEY_COLORS[l.color];
      const r = l.rect;
      if (l.open) {
        ctx.strokeStyle = withAlpha(color, 0.3);
        ctx.setLineDash([3, 5]);
        ctx.strokeRect(r.x + 6, r.y + 1, r.w - 12, r.h - 2);
        ctx.setLineDash([]);
        continue;
      }
      ctx.fillStyle = '#1a1f38';
      ctx.fillRect(r.x + 4, r.y, r.w - 8, r.h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 5, r.y + 1, r.w - 10, r.h - 2);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 2);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.lineTo(cx + 4, cy + 9);
      ctx.lineTo(cx - 4, cy + 9);
      ctx.fill();
    }
  }

  private drawKeys(w: World, now: number, opts: RenderOptions): void {
    for (const k of w.keys) {
      if (k.holder !== -1) continue;
      const bob = opts.reducedMotion ? 0 : Math.sin(now / 350) * 3;
      drawKey(this.ctx, k.rect.x + k.rect.w / 2, k.rect.y + k.rect.h / 2 + bob, KEY_COLORS[k.color], 1, k.persist);
    }
  }

  private drawPlatformTracks(w: World): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(150,170,255,0.14)';
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 2;
    for (const p of w.platforms) {
      if (p.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(p.from.x + p.rect.w / 2, p.from.y + 6);
      ctx.lineTo(p.to.x + p.rect.w / 2, p.to.y + 6);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  private drawPlatforms(w: World, level: LevelData, _alpha: number): void {
    const ctx = this.ctx;
    for (const p of w.platforms) {
      const color = p.when !== undefined ? this.condColor(level, p.when) : '#a9b8ff';
      const r = p.rect;
      ctx.fillStyle = '#2a3462';
      roundRect(ctx, r.x + 1, r.y, r.w - 2, r.h, 3);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(r.x + 3, r.y, r.w - 6, 3);
      if (p.when !== undefined) this.drawCondGlyphs(level, p.when, r.x + r.w / 2, r.y + 8, false);
    }
  }

  private drawLasers(w: World, level: LevelData, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    for (const l of w.lasers) {
      const r = l.rect;
      const horizontal = r.w >= r.h;
      const color = l.when !== undefined ? this.condColor(level, l.when, COLORS.hazard) : COLORS.hazard;
      // Emitters
      ctx.fillStyle = '#2a2f4f';
      const e = 10;
      if (horizontal) {
        ctx.fillRect(r.x, r.y + r.h / 2 - 8, e, 16);
        ctx.fillRect(r.x + r.w - e, r.y + r.h / 2 - 8, e, 16);
      } else {
        ctx.fillRect(r.x + r.w / 2 - 8, r.y, 16, e);
        ctx.fillRect(r.x + r.w / 2 - 8, r.y + r.h - e, 16, e);
      }
      ctx.fillStyle = color;
      if (horizontal) {
        ctx.fillRect(r.x + e - 2, r.y + r.h / 2 - 3, 2, 6);
        ctx.fillRect(r.x + r.w - e, r.y + r.h / 2 - 3, 2, 6);
      } else {
        ctx.fillRect(r.x + r.w / 2 - 3, r.y + e - 2, 6, 2);
        ctx.fillRect(r.x + r.w / 2 - 3, r.y + r.h - e, 6, 2);
      }
      const b = l.beam;
      if (l.active) {
        const flicker = opts.reducedMotion ? 1 : 0.85 + Math.sin(now / 40) * 0.15;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = withAlpha(COLORS.hazard, 0.3);
        ctx.fillRect(b.x - (horizontal ? 0 : 3), b.y - (horizontal ? 3 : 0), b.w + (horizontal ? 0 : 6), b.h + (horizontal ? 6 : 0));
        ctx.shadowColor = COLORS.hazard;
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffd0d8';
        if (horizontal) ctx.fillRect(b.x + e, b.y + b.h / 2 - 1.5, b.w - 2 * e, 3);
        else ctx.fillRect(b.x + b.w / 2 - 1.5, b.y + e, 3, b.h - 2 * e);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = withAlpha(COLORS.hazard, 0.25);
        ctx.setLineDash([3, 7]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(b.x + e, b.y + b.h / 2);
          ctx.lineTo(b.x + b.w - e, b.y + b.h / 2);
        } else {
          ctx.moveTo(b.x + b.w / 2, b.y + e);
          ctx.lineTo(b.x + b.w / 2, b.y + b.h - e);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (l.startTick > 0 && w.tick < l.startTick) {
        // Deadline laser: ring drains until it switches on for good.
        const frac = 1 - w.tick / l.startTick;
        const cx = horizontal ? r.x + 5 : r.x + r.w / 2;
        const cy = horizontal ? r.y + r.h / 2 - 16 : r.y - 8;
        ctx.strokeStyle = '#ffb3c0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
        ctx.font = '700 10px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#ffb3c0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil((l.startTick - w.tick) / 60)}s`, cx + 10, cy);
      } else if (l.cycle) {
        // Countdown arc on the first emitter: how long until the beam toggles.
        const period = l.cycle.on + l.cycle.off;
        const phase = (w.tick + l.cycle.offset) % period;
        const frac = l.active ? 1 - phase / l.cycle.on : 1 - (phase - l.cycle.on) / l.cycle.off;
        const cx = horizontal ? r.x + 5 : r.x + r.w / 2;
        const cy = horizontal ? r.y + r.h / 2 - 16 : r.y - 8;
        ctx.strokeStyle = l.active ? COLORS.hazard : '#8fa0d8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
      if (l.when !== undefined) this.drawCondGlyphs(level, l.when, horizontal ? r.x + r.w / 2 : r.x + r.w / 2 + 16, horizontal ? r.y + r.h / 2 - 14 : r.y + r.h / 2, !horizontal);
    }
  }

  private drawSequences(w: World, level: LevelData): void {
    const ctx = this.ctx;
    for (const q of w.sequences) {
      const r = q.rect;
      const color = this.channel(level, q.id).color;
      const n = q.inputs.length;
      const pw = Math.max(r.w - 6, n * 22 + 10);
      const px = r.x + r.w / 2 - pw / 2;
      ctx.fillStyle = '#0e1328';
      roundRect(ctx, px, r.y + 6, pw, r.h - 12, 6);
      ctx.fill();
      ctx.strokeStyle = q.solved ? color : 'rgba(150,170,255,0.25)';
      ctx.lineWidth = 2;
      if (q.solved) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      const cy = r.y + r.h / 2;
      q.inputs.forEach((id, i) => {
        const cx = px + 16 + i * 22;
        const ch = this.channel(level, id);
        const lit = i < q.progress;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = lit ? ch.color : 'rgba(255,255,255,0.05)';
        ctx.fill();
        drawGlyph(ctx, ch.glyph, cx, cy, 4, lit ? '#0b0f1e' : ch.color, true);
        if (i < n - 1) {
          ctx.fillStyle = 'rgba(200,210,255,0.35)';
          ctx.fillRect(cx + 9, cy - 1, 4, 2);
        }
      });
    }
  }

  private drawExit(w: World, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    const r = w.level.exit;
    const cx = r.x + r.w / 2;
    const open = w.exitOpen;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r.x + 4, r.y + r.h);
    ctx.lineTo(r.x + 4, r.y + r.w / 2);
    ctx.arc(cx, r.y + r.w / 2, r.w / 2 - 4, Math.PI, 0);
    ctx.lineTo(r.x + r.w - 4, r.y + r.h);
    ctx.closePath();
    if (open) {
      const t = opts.reducedMotion ? 0 : now / 900;
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, 'rgba(180,230,255,0.9)');
      g.addColorStop(0.5 + Math.sin(t) * 0.2, 'rgba(120,170,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0.85)');
      ctx.fillStyle = g;
      ctx.shadowColor = '#9fd4ff';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const yy = r.y + ((((t * 30 + i * (r.h / 4)) % r.h) + r.h) % r.h);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + r.h - (yy - r.y));
        ctx.lineTo(r.x + r.w, r.y + r.h - (yy - r.y));
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#0c1022';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,175,230,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    if (!open) this.drawCondGlyphs(w.level, w.level.def.exitWhen, cx, r.y + r.h / 2, true);
  }

  private drawConveyors(w: World, level: LevelData): void {
    const ctx = this.ctx;
    for (const b of w.conveyors) {
      const r = b.rect;
      const color = b.when !== undefined ? this.condColor(level, b.when) : b.reverse !== undefined ? this.condColor(level, b.reverse) : '#c9ced9';
      ctx.fillStyle = '#20232f';
      roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 8);
      ctx.fill();
      ctx.fillStyle = '#323748';
      ctx.fillRect(r.x + 4, r.y + 2, r.w - 8, 8);
      // Chevrons slide in the belt's current heading.
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x + 4, r.y + 2, r.w - 8, 8);
      ctx.clip();
      const shift = b.active ? ((w.tick * b.speed) % 16) * b.heading : 0;
      ctx.strokeStyle = b.active ? color : withAlpha(color, 0.3);
      ctx.lineWidth = 2;
      for (let x = r.x - 16 + shift; x < r.x + r.w + 16; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x - 3 * b.heading, r.y + 3);
        ctx.lineTo(x + 3 * b.heading, r.y + 6);
        ctx.lineTo(x - 3 * b.heading, r.y + 9);
        ctx.stroke();
      }
      ctx.restore();
      for (const ex of [r.x + 10, r.x + r.w - 10]) {
        ctx.beginPath();
        ctx.arc(ex, r.y + r.h / 2 + 4, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3a4054';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, r.y + r.h / 2 + 4, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#7d859e';
        ctx.fill();
      }
      const spec = level.objects.find((o) => o.id === b.id)?.spec;
      if (spec?.type === 'conveyor') {
        const cond = spec.when ?? spec.reverse;
        if (cond !== undefined) this.drawCondGlyphs(level, cond, r.x + r.w / 2, r.y + r.h / 2 + 5, false);
      }
    }
  }

  private drawPads(w: World, level: LevelData): void {
    const ctx = this.ctx;
    for (const p of w.pads) {
      const r = p.rect;
      const color = p.when !== undefined ? this.condColor(level, p.when) : '#b6f36b';
      ctx.fillStyle = '#20262a';
      roundRect(ctx, r.x + 3, r.y + 10, r.w - 6, r.h - 10, 5);
      ctx.fill();
      ctx.strokeStyle = p.active ? withAlpha(color, 0.8) : 'rgba(180,190,200,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = r.x + 10 + ((r.w - 20) * i) / 6;
        ctx.lineTo(x, r.y + (i % 2 ? 14 : 8));
      }
      ctx.stroke();
      ctx.fillStyle = p.active ? color : 'rgba(180,190,200,0.35)';
      if (p.active) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }
      roundRect(ctx, r.x + 2, r.y, r.w - 4, 6, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 2, r.y + 18);
      ctx.lineTo(r.x + r.w / 2 + 6, r.y + 26);
      ctx.lineTo(r.x + r.w / 2 - 6, r.y + 26);
      ctx.fill();
      if (p.when !== undefined) this.drawCondGlyphs(level, p.when, r.x + r.w / 2, r.y + r.h - 8, false);
    }
  }

  private drawCrumbles(w: World): void {
    const ctx = this.ctx;
    const T = this.theme;
    for (const cr of w.crumbles) {
      const r = cr.rect;
      if (cr.gone) {
        ctx.strokeStyle = withAlpha(T.wallTop, 0.18);
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        ctx.setLineDash([]);
        continue;
      }
      const k = cr.timer < 0 ? 0 : cr.timer / cr.delay;
      const jx = k > 0 ? Math.sin(w.tick * 1.7 + r.x) * 1.5 * k : 0;
      ctx.fillStyle = T.wall;
      ctx.fillRect(r.x + 1 + jx, r.y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = withAlpha(T.wallTop, 0.75 - 0.4 * k);
      ctx.fillRect(r.x + 1 + jx, r.y, r.w - 2, 3);
      ctx.strokeStyle = `rgba(0,0,0,${0.35 + 0.4 * k})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.x + 8 + jx, r.y + 3);
      ctx.lineTo(r.x + 16 + jx, r.y + 16);
      ctx.lineTo(r.x + 12 + jx, r.y + 28);
      ctx.moveTo(r.x + 16 + jx, r.y + 16);
      ctx.lineTo(r.x + 30 + jx, r.y + 22);
      if (k > 0.3) {
        ctx.moveTo(r.x + 26 + jx, r.y + 3);
        ctx.lineTo(r.x + 24 + jx, r.y + 14);
        ctx.moveTo(r.x + 4 + jx, r.y + 22);
        ctx.lineTo(r.x + 14 + jx, r.y + 36);
      }
      ctx.stroke();
    }
  }

  private drawPortals(w: World, level: LevelData, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    const pairs: string[] = [];
    for (const p of w.portals) {
      const key = [p.id, p.to ?? w.portals.find((q) => q.to === p.id)?.id ?? p.id].sort().join('');
      if (!pairs.includes(key)) pairs.push(key);
    }
    for (const p of w.portals) {
      const r = p.rect;
      const color = PORTAL_COLORS[pairs.indexOf([p.id, p.to ?? w.portals.find((q) => q.to === p.id)?.id ?? p.id].sort().join('')) % PORTAL_COLORS.length];
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const rx = r.w / 2 - 6;
      const ry = r.h / 2 - 2;
      ctx.save();
      if (p.active) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }
      ctx.strokeStyle = p.active ? color : withAlpha(color, 0.35);
      ctx.lineWidth = 3;
      if (!p.active) ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      if (p.active) {
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(rx, ry));
        g.addColorStop(0, withAlpha(color, 0.5));
        g.addColorStop(1, withAlpha(color, 0.05));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        const t = opts.reducedMotion ? 0 : now / 500;
        ctx.strokeStyle = withAlpha('#ffffff', 0.45);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx * (0.3 + 0.2 * i), ry * (0.3 + 0.2 * i), t + i, 0.3, 2.2);
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(p.to ? `${p.id}→${p.to}` : p.id, cx, r.y - 7);
      const spec = level.objects.find((o) => o.id === p.id)?.spec;
      if (spec?.type === 'portal' && spec.when !== undefined) this.drawCondGlyphs(level, spec.when, cx, r.y + r.h + 8, false);
    }
  }

  private drawBarriers(w: World, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    for (const b of w.barriers) {
      const r = b.rect;
      const color = b.blocks === 'ghosts' ? '#7fdcff' : COLORS.player;
      ctx.fillStyle = withAlpha(color, 0.1);
      ctx.fillRect(r.x + 8, r.y, r.w - 16, r.h);
      ctx.fillStyle = withAlpha(color, 0.7);
      ctx.fillRect(r.x + 8, r.y, 2, r.h);
      ctx.fillRect(r.x + r.w - 10, r.y, 2, r.h);
      const off = opts.reducedMotion ? 0 : (now / 40) % 8;
      ctx.fillStyle = withAlpha(color, 0.16);
      for (let y = r.y + off; y < r.y + r.h; y += 8) ctx.fillRect(r.x + 10, y, r.w - 20, 1);
      // Icon: the kind that cannot pass, struck through.
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(b.blocks === 'ghosts' ? [2, 2] : []);
      roundRect(ctx, cx - 5, cy - 8, 10, 16, 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 9);
      ctx.lineTo(cx + 9, cy - 9);
      ctx.stroke();
    }
  }

  // ───────────────────────────── characters ─────────────────────────────

  private drawGhostPaths(session: LevelSession): void {
    const ctx = this.ctx;
    session.ghosts.forEach((g, i) => {
      if (g.path.length < 2) return;
      ctx.strokeStyle = ghostColor(i + 1, 0.22);
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      g.path.forEach((p, j) => {
        const x = p.x + CHAR_W / 2;
        const y = p.y + CHAR_H - 2;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  private drawCharacters(w: World, alpha: number, now: number, opts: RenderOptions): void {
    // Ghosts first, so the live player is always drawn on top.
    for (const c of w.chars) if (c.kind === 'ghost') this.drawCharacter(c, w, alpha, now, opts);
    this.drawCharacter(w.player, w, alpha, now, opts);
  }

  private drawCharacter(c: Character, w: World, alpha: number, now: number, opts: RenderOptions): void {
    const ctx = this.ctx;
    if (!c.alive) {
      const since = w.tick - c.diedAt;
      if (since > 24) return;
      ctx.globalAlpha = 1 - since / 24;
    }
    const x = c.prevX + (c.x - c.prevX) * alpha;
    const y = c.prevY + (c.y - c.prevY) * alpha;
    const isPlayer = c.kind === 'player';
    const squash = !opts.reducedMotion && !c.grounded ? Math.min(3, Math.abs(c.vy) * 0.25) : 0;
    const bw = CHAR_W - squash;
    const bh = CHAR_H + squash;
    const bx = x + (CHAR_W - bw) / 2;
    const by = y + CHAR_H - bh;

    if (isPlayer) {
      ctx.shadowColor = 'rgba(255,215,106,0.65)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = COLORS.player;
      roundRect(ctx, bx, by, bw, bh, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Visor shows facing.
      ctx.fillStyle = COLORS.playerDark;
      const vx = c.facing > 0 ? bx + bw * 0.38 : bx + 3;
      roundRect(ctx, vx, by + 8, bw * 0.58, 9, 4);
      ctx.fill();
      ctx.fillStyle = '#fffbe6';
      ctx.fillRect(c.facing > 0 ? vx + bw * 0.58 - 7 : vx + 3, by + 11, 4, 3);
      // Feet line
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bx + 3, by + bh - 4, bw - 6, 2);
    } else {
      const n = c.ghostNumber;
      const a = opts.highContrast ? 0.6 : 0.34;
      ctx.fillStyle = ghostColor(n, a);
      roundRect(ctx, bx, by, bw, bh, 7);
      ctx.fill();
      ctx.strokeStyle = ghostColor(n, 0.9);
      ctx.lineWidth = 1.5;
      ctx.setLineDash(opts.highContrast ? [] : [4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ghostColor(n, 0.85);
      const vx = c.facing > 0 ? bx + bw * 0.38 : bx + 3;
      roundRect(ctx, vx, by + 8, bw * 0.58, 7, 3);
      ctx.fill();
      // Identifier chip
      const tagY = by - 14 + (opts.reducedMotion ? 0 : Math.sin(now / 400 + n) * 1.2);
      ctx.fillStyle = 'rgba(8,10,22,0.85)';
      roundRect(ctx, x + CHAR_W / 2 - 11, tagY - 7, 22, 14, 7);
      ctx.fill();
      ctx.strokeStyle = ghostColor(n, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = ghostColor(n, 1);
      ctx.font = '700 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`G${n}`, x + CHAR_W / 2, tagY + 0.5);
    }
    // Carried keys
    c.keys.forEach((k, i) => drawKey(ctx, x + CHAR_W / 2 + (i - (c.keys.length - 1) / 2) * 14, by - (isPlayer ? 12 : 30), KEY_COLORS[k], 0.6, false));
    ctx.globalAlpha = 1;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const p of this.particles) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.96;
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawPrompts(w: World, level: LevelData, opts: RenderOptions): void {
    const p = w.player;
    if (!p.alive) return;
    const body = w.charRect(p);
    const key = opts.touch ? '✋' : 'E';
    for (const s of w.switches) {
      if (overlaps(body, expand(s.rect, INTERACT_REACH))) {
        const label = s.duration > 0 ? (s.on ? 'Re-arm' : 'Activate') : s.on ? 'Switch off' : 'Switch on';
        this.prompt(s.rect.x + s.rect.w / 2, s.rect.y - 12, key, label);
        return;
      }
    }
    for (const l of w.locks) {
      if (!l.open && overlaps(expand(body, 4), l.rect) && !p.keys.includes(l.color)) {
        this.prompt(l.rect.x + l.rect.w / 2, l.rect.y - 12, '', `Needs ${l.color} key`);
        return;
      }
    }
    if (!w.exitOpen && overlaps(body, expand(level.exit, 4))) this.prompt(level.exit.x + level.exit.w / 2, level.exit.y - 12, '', 'Exit sealed');
  }

  private prompt(x: number, y: number, key: string, label: string): void {
    const ctx = this.ctx;
    ctx.font = FONT;
    const tw = ctx.measureText(label).width;
    const kw = key ? 20 : 0;
    const wdt = tw + kw + 16;
    const px = Math.min(Math.max(x - wdt / 2, 4), WORLD_W - wdt - 4);
    ctx.fillStyle = COLORS.promptBg;
    roundRect(ctx, px, y - 12, wdt, 24, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,180,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textBaseline = 'middle';
    if (key) {
      ctx.fillStyle = COLORS.player;
      roundRect(ctx, px + 6, y - 8, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = COLORS.playerDark;
      ctx.textAlign = 'center';
      ctx.fillText(key, px + 14, y + 0.5);
    }
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 8 + kw, y + 0.5);
  }

  private drawTransition(now: number): void {
    const t = this.transition;
    if (!t) return;
    const k = (now - t.start) / t.duration;
    if (k >= 1) {
      this.transition = null;
      return;
    }
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const fade = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
    const tint = t.kind === 'death' ? '255,60,90' : t.kind === 'level' ? '255,200,120' : '120,170,255';
    ctx.fillStyle = `rgba(${tint},${0.16 * fade})`;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    // Rewind scanlines
    ctx.fillStyle = `rgba(${tint},${0.08 * fade})`;
    for (let y = ((now / 6) % 6) - 6; y < this.cssH; y += 6) ctx.fillRect(0, y, this.cssW, 2);
    const box = this.worldBox;
    ctx.globalAlpha = Math.min(1, fade * 1.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(18, 30 * this.scale)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = '#eef2ff';
    ctx.fillText(t.label, box.x + box.w / 2, box.y + box.h * 0.42);
    ctx.font = `500 ${Math.max(12, 15 * this.scale)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(220,228,255,0.8)';
    ctx.fillText(t.sub, box.x + box.w / 2, box.y + box.h * 0.42 + Math.max(24, 34 * this.scale));
    ctx.globalAlpha = 1;
  }
}

// ───────────────────────────── helpers ─────────────────────────────

function flattenRefs(cond: Cond | undefined): { id: string; negated: boolean }[] {
  const out: { id: string; negated: boolean }[] = [];
  const walk = (c: Cond): void => {
    if (typeof c === 'string') out.push(c.startsWith('!') ? { id: c.slice(1), negated: true } : { id: c, negated: false });
    else if ('all' in c) c.all.forEach(walk);
    else c.any.forEach(walk);
  };
  if (cond !== undefined) walk(cond);
  return out;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawGlyph(ctx: CanvasRenderingContext2D, glyph: Glyph, x: number, y: number, r: number, color: string, filled: boolean): void {
  ctx.beginPath();
  switch (glyph) {
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r, y + r * 0.8);
      ctx.lineTo(x - r, y + r * 0.8);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      break;
    case 'diamond':
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.1, y);
      ctx.lineTo(x, y + r * 1.2);
      ctx.lineTo(x - r * 1.1, y);
      ctx.closePath();
      break;
    case 'cross':
      ctx.rect(x - r, y - r * 0.35, r * 2, r * 0.7);
      ctx.rect(x - r * 0.35, y - r, r * 0.7, r * 2);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r * 1.2 : r * 0.5;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    case 'hex':
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    case 'bar':
      ctx.rect(x - r, y - r * 0.4, r * 2, r * 0.8);
      break;
  }
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, s: number, persist: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-6, 0, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(-1, -1.5, 13, 3);
  ctx.fillRect(7, 1, 2.5, 5);
  ctx.fillRect(11, 1, 2.5, 4);
  if (persist) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-6, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Darken a hex colour toward the background by factor k (0..1 = how much colour remains). */
export function mix(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const br = 18;
  const bg = 22;
  const bb = 44;
  return `rgb(${Math.round(br + (r - br) * k)},${Math.round(bg + (g - bg) * k)},${Math.round(bb + (b - bb) * k)})`;
}

export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const PORTAL_COLORS = ['#7af0ff', '#ffb86b', '#d59bff', '#8dff9e'];

interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  max: number;
  seed: number;
}

function spawnAmbient(kind: Theme['ambient'], anywhere: boolean): Ambient {
  const r = Math.random;
  const base = { life: 0, seed: r(), max: 600 + r() * 600 };
  switch (kind) {
    case 'dust':
      return { ...base, x: r() * WORLD_W, y: r() * WORLD_H, vx: (r() - 0.5) * 0.15, vy: (r() - 0.5) * 0.1, size: 1 + r() * 1.5 };
    case 'embers':
      return { ...base, x: r() * WORLD_W, y: anywhere ? r() * WORLD_H : WORLD_H + 5, vx: (r() - 0.5) * 0.3, vy: -0.25 - r() * 0.45, size: 1 + r() * 2 };
    case 'bubbles':
      return { ...base, x: r() * WORLD_W, y: anywhere ? r() * WORLD_H : WORLD_H + 8, vx: 0, vy: -0.2 - r() * 0.4, size: 1.5 + r() * 3 };
    case 'rain':
      return { ...base, x: r() * (WORLD_W + 200), y: anywhere ? r() * WORLD_H : -10, vx: -1.2, vy: 7 + r() * 3, size: 1, max: 400 };
    case 'stars':
      return { ...base, x: r() * WORLD_W, y: r() * WORLD_H, vx: (r() - 0.5) * 0.04, vy: (r() - 0.5) * 0.04, size: 1 + r() * 1.5, max: 900 + r() * 900 };
  }
}

/** Deterministic PRNG so each room's backdrop looks the same every time. */
function rng(seed: number): () => number {
  let a = seed * 2654435761;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawBackdrop(g: CanvasRenderingContext2D, T: Theme, seed: number): void {
  const r = rng(seed);
  g.save();
  switch (T.backdrop) {
    case 'grid':
      break;
    case 'gears': {
      g.strokeStyle = 'rgba(255,170,90,0.07)';
      g.fillStyle = 'rgba(255,150,70,0.025)';
      for (let i = 0; i < 6; i++) {
        const cx = r() * WORLD_W;
        const cy = r() * WORLD_H;
        const rad = 50 + r() * 90;
        const teeth = 10 + Math.floor(r() * 8);
        g.lineWidth = 3;
        g.beginPath();
        for (let t = 0; t <= teeth * 2; t++) {
          const a = (t / (teeth * 2)) * Math.PI * 2;
          const rr = t % 2 ? rad : rad * 0.86;
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.arc(cx, cy, rad * 0.3, 0, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = 'rgba(255,170,90,0.05)';
      g.lineWidth = 8;
      for (let i = 0; i < 3; i++) {
        const y = 60 + r() * (WORLD_H - 120);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(WORLD_W, y);
        g.stroke();
      }
      break;
    }
    case 'depths': {
      for (let i = 0; i < 5; i++) {
        const x = r() * WORLD_W;
        const w = 40 + r() * 80;
        const grad = g.createLinearGradient(0, 0, 0, WORLD_H);
        grad.addColorStop(0, 'rgba(120,240,230,0.08)');
        grad.addColorStop(1, 'rgba(120,240,230,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + w, 0);
        g.lineTo(x + w + 160, WORLD_H);
        g.lineTo(x + 120, WORLD_H);
        g.fill();
      }
      g.strokeStyle = 'rgba(120,240,230,0.06)';
      g.lineWidth = 2;
      const domeX = WORLD_W * (0.3 + r() * 0.4);
      g.beginPath();
      g.arc(domeX, WORLD_H + 40, 300, Math.PI, 0);
      g.stroke();
      for (let i = 1; i < 6; i++) {
        g.beginPath();
        g.moveTo(domeX, WORLD_H + 40);
        g.lineTo(domeX + Math.cos(Math.PI + (i * Math.PI) / 6) * 300, WORLD_H + 40 + Math.sin(Math.PI + (i * Math.PI) / 6) * 300);
        g.stroke();
      }
      break;
    }
    case 'skyline': {
      const glow = g.createLinearGradient(0, WORLD_H * 0.4, 0, WORLD_H);
      glow.addColorStop(0, 'rgba(255,79,216,0)');
      glow.addColorStop(1, 'rgba(255,79,216,0.12)');
      g.fillStyle = glow;
      g.fillRect(0, 0, WORLD_W, WORLD_H);
      let x = 0;
      while (x < WORLD_W) {
        const w = 40 + r() * 70;
        const h = 120 + r() * 300;
        g.fillStyle = 'rgba(70,25,110,0.35)';
        g.fillRect(x, WORLD_H - h, w - 6, h);
        for (let wy = WORLD_H - h + 10; wy < WORLD_H - 10; wy += 14) {
          for (let wx = x + 6; wx < x + w - 14; wx += 10) {
            if (r() < 0.18) {
              g.fillStyle = r() < 0.5 ? 'rgba(255,120,230,0.25)' : 'rgba(120,220,255,0.22)';
              g.fillRect(wx, wy, 4, 6);
            }
          }
        }
        x += w;
      }
      break;
    }
    case 'nebula': {
      for (let i = 0; i < 3; i++) {
        const cx = r() * WORLD_W;
        const cy = r() * WORLD_H;
        const rad = 180 + r() * 220;
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, i % 2 ? 'rgba(120,80,255,0.13)' : 'rgba(60,200,255,0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, WORLD_W, WORLD_H);
      }
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(230,220,255,${0.15 + r() * 0.4})`;
        const s = r() < 0.9 ? 1 : 2;
        g.fillRect(r() * WORLD_W, r() * WORLD_H, s, s);
      }
      const hx = WORLD_W * (0.65 + r() * 0.2);
      const hy = WORLD_H * (0.25 + r() * 0.15);
      g.strokeStyle = 'rgba(255,190,120,0.18)';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(hx, hy, 90, 22, -0.25, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(hx, hy, 30, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,210,160,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(hx, hy, 32, 0, Math.PI * 2);
      g.stroke();
      break;
    }
  }
  g.restore();
}

export type { Rect };
