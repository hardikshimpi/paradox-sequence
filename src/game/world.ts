import {
  CHAR_H,
  CHAR_W,
  COLS,
  COYOTE_TICKS,
  GRAVITY,
  HAZARD_INSET,
  INTERACT_REACH,
  JUMP_BUFFER_TICKS,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  ROWS,
  TILE,
  WORLD_H,
  secondsToTicks,
} from './constants';
import { evalCond, type Signals } from './conditions';
import { expand, inset, overlaps } from './geometry';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE, type InputBits } from './input';
import { TILE_LEDGE, TILE_SPIKE, TILE_WALL, tileAt, type LevelData } from './level';
import type { Cond, KeyColor, Rect, SimEvent } from './types';

export interface Character {
  /** Index in `World.chars`; ghosts come first, the live player is last. */
  index: number;
  kind: 'player' | 'ghost';
  /** 1-based ghost number (0 for the player). */
  ghostNumber: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  groundPlatform: string | null;
  coyote: number;
  jumpBuffer: number;
  prevInput: InputBits;
  input: InputBits;
  alive: boolean;
  /** Tick at which the character died (-1 while alive). */
  diedAt: number;
  keys: KeyColor[];
  /** Portal the character arrived through; it cannot re-enter it until stepping off. */
  portalLock: string | null;
}

export interface PlateState {
  id: string;
  rect: Rect;
  sensor: Rect;
  required: number;
  count: number;
  pressed: boolean;
}
export interface SwitchState {
  id: string;
  rect: Rect;
  on: boolean;
  /** Ticks a timed switch stays on; 0 = plain toggle. */
  duration: number;
  remaining: number;
}
export interface GateState {
  id: string;
  kind: 'door' | 'bridge';
  rect: Rect;
  when?: Cond;
  /** Shutter timing in ticks: open during the first `on` ticks of every cycle. */
  cycle?: { on: number; off: number; offset: number };
  /** True when the gate blocks movement. */
  solid: boolean;
}
export interface LockState {
  id: string;
  rect: Rect;
  color: KeyColor;
  open: boolean;
}
export interface KeyState {
  id: string;
  rect: Rect;
  color: KeyColor;
  persist: boolean;
  /** Character index holding it, -1 while on the ground, -2 once spent or banked. */
  holder: number;
}
export interface PlatformState {
  id: string;
  rect: Rect;
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  speed: number;
  when?: Cond;
  pos: number;
  dir: 1 | -1;
  dx: number;
  dy: number;
  prevY: number;
}
export interface LaserState {
  id: string;
  rect: Rect;
  beam: Rect;
  when?: Cond;
  cycle?: { on: number; off: number; offset: number };
  /** First tick at which the laser may be active (0 = from the start). */
  startTick: number;
  active: boolean;
}
export interface SequenceState {
  id: string;
  rect: Rect;
  inputs: string[];
  progress: number;
  solved: boolean;
}

export interface ConveyorState {
  id: string;
  rect: Rect;
  dir: 1 | -1;
  speed: number;
  when?: Cond;
  reverse?: Cond;
  active: boolean;
  /** Current direction after `reverse` is applied. */
  heading: 1 | -1;
}
export interface PadState {
  id: string;
  rect: Rect;
  velocity: number;
  power: number;
  when?: Cond;
  active: boolean;
}
export interface PortalState {
  id: string;
  rect: Rect;
  to?: string;
  when?: Cond;
  active: boolean;
}
export interface BarrierState {
  id: string;
  rect: Rect;
  blocks: 'ghosts' | 'player';
}
export interface CrumbleState {
  id: string;
  rect: Rect;
  delay: number;
  /** Ticks since first stepped on (-1 = untouched). */
  timer: number;
  gone: boolean;
}

export interface WorldOptions {
  ghostCount: number;
  /** Key ids already banked by the player in earlier recorded attempts. */
  bankedKeys?: ReadonlySet<string>;
}

const PLATFORM_THICKNESS = 12;
const PLATE_SENSOR_H = 10;

/**
 * The complete, deterministic state of one attempt.
 * `step()` advances exactly one fixed tick. Given the same level and the same
 * per-character input bits it always produces the same result.
 */
export class World {
  readonly level: LevelData;
  tick = 0;
  chars: Character[] = [];
  plates: PlateState[] = [];
  switches: SwitchState[] = [];
  gates: GateState[] = [];
  locks: LockState[] = [];
  keys: KeyState[] = [];
  platforms: PlatformState[] = [];
  lasers: LaserState[] = [];
  sequences: SequenceState[] = [];
  conveyors: ConveyorState[] = [];
  pads: PadState[] = [];
  portals: PortalState[] = [];
  barriers: BarrierState[] = [];
  crumbles: CrumbleState[] = [];
  exitOpen = true;
  completed = false;
  signals: Signals = {};
  events: SimEvent[] = [];

  constructor(level: LevelData, opts: WorldOptions) {
    this.level = level;
    const banked = opts.bankedKeys ?? new Set<string>();
    for (let i = 0; i <= opts.ghostCount; i++) {
      const isPlayer = i === opts.ghostCount;
      this.chars.push({
        index: i,
        kind: isPlayer ? 'player' : 'ghost',
        ghostNumber: isPlayer ? 0 : i + 1,
        x: level.spawn.x,
        y: level.spawn.y,
        prevX: level.spawn.x,
        prevY: level.spawn.y,
        vy: 0,
        facing: 1,
        grounded: true,
        groundPlatform: null,
        coyote: 0,
        jumpBuffer: 0,
        prevInput: 0,
        input: 0,
        alive: true,
        diedAt: -1,
        keys: [],
        portalLock: null,
      });
    }

    for (const o of level.objects) {
      const s = o.spec;
      const r = o.rect;
      switch (s.type) {
        case 'plate':
          this.plates.push({
            id: o.id,
            rect: r,
            sensor: { x: r.x + 4, y: r.y + r.h - PLATE_SENSOR_H, w: r.w - 8, h: PLATE_SENSOR_H },
            required: s.required ?? 1,
            count: 0,
            pressed: false,
          });
          break;
        case 'switch':
          this.switches.push({ id: o.id, rect: r, on: false, duration: s.timed ? secondsToTicks(s.timed) : 0, remaining: 0 });
          break;
        case 'door':
          this.gates.push({
            id: o.id,
            kind: 'door',
            rect: r,
            when: s.when,
            cycle: s.cycle ? { on: secondsToTicks(s.cycle.on), off: secondsToTicks(s.cycle.off), offset: secondsToTicks(s.cycle.offset ?? 0) } : undefined,
            solid: true,
          });
          break;
        case 'bridge':
          this.gates.push({ id: o.id, kind: 'bridge', rect: r, when: s.when, solid: false });
          break;
        case 'conveyor':
          this.conveyors.push({ id: o.id, rect: r, dir: s.dir, speed: ((s.speed ?? 2) * TILE) / 60, when: s.when, reverse: s.reverse, active: true, heading: s.dir });
          break;
        case 'pad': {
          const power = s.power ?? 5;
          this.pads.push({ id: o.id, rect: r, power, velocity: padVelocity(power * TILE), when: s.when, active: true });
          break;
        }
        case 'portal':
          this.portals.push({ id: o.id, rect: r, to: s.to, when: s.when, active: true });
          break;
        case 'barrier':
          this.barriers.push({ id: o.id, rect: r, blocks: s.blocks });
          break;
        case 'crumble':
          this.crumbles.push({ id: o.id, rect: r, delay: Math.max(1, secondsToTicks(s.delay ?? 0.5)), timer: -1, gone: false });
          break;
        case 'lock':
          this.locks.push({ id: o.id, rect: r, color: s.color, open: false });
          break;
        case 'key':
          this.keys.push({
            id: o.id,
            rect: { x: r.x + 8, y: r.y + 8, w: r.w - 16, h: r.h - 16 },
            color: s.color,
            persist: !!s.persist,
            holder: banked.has(o.id) ? -2 : -1,
          });
          break;
        case 'platform': {
          const from = { x: r.x, y: r.y };
          const to = { x: r.x + s.to[0] * TILE, y: r.y + s.to[1] * TILE };
          this.platforms.push({
            id: o.id,
            rect: { x: from.x, y: from.y, w: r.w, h: PLATFORM_THICKNESS },
            from,
            to,
            length: Math.hypot(to.x - from.x, to.y - from.y),
            speed: ((s.speed ?? 2.5) * TILE) / 60,
            when: s.when,
            pos: 0,
            dir: 1,
            dx: 0,
            dy: 0,
            prevY: from.y,
          });
          break;
        }
        case 'laser': {
          const horizontal = r.w >= r.h;
          const beam = horizontal
            ? { x: r.x, y: r.y + r.h / 2 - 4, w: r.w, h: 8 }
            : { x: r.x + r.w / 2 - 4, y: r.y, w: 8, h: r.h };
          this.lasers.push({
            id: o.id,
            rect: r,
            beam,
            when: s.when,
            cycle: s.cycle
              ? { on: secondsToTicks(s.cycle.on), off: secondsToTicks(s.cycle.off), offset: secondsToTicks(s.cycle.offset ?? 0) }
              : undefined,
            startTick: secondsToTicks(s.startsAt ?? 0),
            active: false,
          });
          break;
        }
        case 'sequence':
          this.sequences.push({ id: o.id, rect: r, inputs: s.inputs.slice(), progress: 0, solved: false });
          break;
      }
    }

    // Banked keys start in the live player's pocket.
    const player = this.player;
    for (const k of this.keys) if (k.holder === -2) player.keys.push(k.color);

    this.updateSensors(false);
    this.updateMechanisms(false);
  }

  get player(): Character {
    return this.chars[this.chars.length - 1];
  }

  /** Advance one tick. `inputs[i]` drives `chars[i]`. */
  step(inputs: readonly InputBits[]): void {
    this.events = [];
    this.updateMechanisms(true);
    for (const c of this.chars) this.stepCharacter(c, inputs[c.index] ?? 0);
    this.updateSensors(true);
    const p = this.player;
    if (p.alive && this.exitOpen && overlaps(this.charRect(p), inset(this.level.exit, 8))) {
      this.completed = true;
      this.events.push({ type: 'complete' });
    }
    this.tick++;
  }

  charRect(c: Character): Rect {
    return { x: c.x, y: c.y, w: CHAR_W, h: CHAR_H };
  }

  // ───────────────────────────── mechanisms ─────────────────────────────

  private updateMechanisms(emit: boolean): void {
    const sig = this.signals;
    for (const g of this.gates) {
      let condition = g.when === undefined || evalCond(g.when, sig);
      if (g.cycle) condition = condition && (this.tick + g.cycle.offset) % (g.cycle.on + g.cycle.off) < g.cycle.on;
      const solid = g.kind === 'door' ? !condition : condition;
      if (solid !== g.solid) {
        g.solid = solid;
        if (emit) this.events.push({ type: 'door', id: g.id, open: !solid });
      }
    }
    for (const p of this.platforms) {
      const oldX = p.rect.x;
      const oldY = p.rect.y;
      p.prevY = oldY;
      if (p.length > 0) {
        if (p.when !== undefined) {
          p.pos = evalCond(p.when, sig) ? Math.min(p.length, p.pos + p.speed) : Math.max(0, p.pos - p.speed);
        } else if (emit) {
          p.pos += p.dir * p.speed;
          if (p.pos >= p.length) {
            p.pos = p.length;
            p.dir = -1;
          } else if (p.pos <= 0) {
            p.pos = 0;
            p.dir = 1;
          }
        }
        const t = p.pos / p.length;
        p.rect.x = p.from.x + (p.to.x - p.from.x) * t;
        p.rect.y = p.from.y + (p.to.y - p.from.y) * t;
      }
      p.dx = p.rect.x - oldX;
      p.dy = p.rect.y - oldY;
    }
    for (const l of this.lasers) {
      let active = this.tick >= l.startTick;
      if (l.cycle) {
        const period = l.cycle.on + l.cycle.off;
        active = active && (this.tick + l.cycle.offset) % period < l.cycle.on;
      }
      if (l.when !== undefined) active = active && evalCond(l.when, sig);
      l.active = active;
    }
    for (const c of this.conveyors) {
      c.active = c.when === undefined || evalCond(c.when, sig);
      c.heading = c.reverse !== undefined && evalCond(c.reverse, sig) ? (-c.dir as 1 | -1) : c.dir;
    }
    for (const p of this.pads) p.active = p.when === undefined || evalCond(p.when, sig);
    for (const p of this.portals) p.active = p.when === undefined || evalCond(p.when, sig);
    this.exitOpen = this.level.def.exitWhen === undefined || evalCond(this.level.def.exitWhen, sig);
  }

  private updateSensors(emit: boolean): void {
    const prev = this.signals;
    const next: Signals = {};

    if (emit) {
      for (const cr of this.crumbles) {
        if (cr.gone) continue;
        if (cr.timer < 0 && this.chars.some((c) => c.alive && this.standsOn(c, cr.rect))) cr.timer = 0;
        if (cr.timer >= 0 && ++cr.timer >= cr.delay) {
          cr.gone = true;
          this.events.push({ type: 'crumble', id: cr.id });
        }
      }
    }

    for (const p of this.plates) {
      let count = 0;
      for (const c of this.chars) if (c.alive && overlaps(this.charRect(c), p.sensor)) count++;
      p.count = count;
      const pressed = count >= p.required;
      if (pressed !== p.pressed && emit) this.events.push({ type: 'plate', id: p.id, on: pressed });
      p.pressed = pressed;
      next[p.id] = pressed;
    }
    for (const s of this.switches) {
      if (s.duration > 0 && s.on) {
        s.remaining--;
        if (s.remaining <= 0) {
          s.on = false;
          if (emit) this.events.push({ type: 'switch', id: s.id, on: false });
        }
      }
      next[s.id] = s.on;
    }
    for (const l of this.locks) next[l.id] = l.open;

    // Sequences watch rising edges of their inputs, in timeline order.
    for (const q of this.sequences) {
      if (!q.solved) {
        for (const input of q.inputs) {
          if (!(next[input] && !prev[input])) continue;
          if (input === q.inputs[q.progress]) {
            q.progress++;
            if (q.progress === q.inputs.length) q.solved = true;
            if (emit) this.events.push({ type: 'sequence', id: q.id, progress: q.progress, solved: q.solved, reset: false });
          } else {
            const lost = q.progress > 0;
            q.progress = input === q.inputs[0] ? 1 : 0;
            // Only a real loss of progress is worth reporting.
            if (emit && lost) this.events.push({ type: 'sequence', id: q.id, progress: q.progress, solved: false, reset: true });
          }
          if (q.solved) break;
        }
      }
      next[q.id] = q.solved;
    }
    this.signals = next;
  }

  // ───────────────────────────── characters ─────────────────────────────

  private stepCharacter(c: Character, input: InputBits): void {
    c.prevX = c.x;
    c.prevY = c.y;
    if (!c.alive) return;

    c.input = input;
    const jumpPressed = (input & INPUT_JUMP) !== 0 && (c.prevInput & INPUT_JUMP) === 0;
    const usePressed = (input & INPUT_USE) !== 0 && (c.prevInput & INPUT_USE) === 0;
    c.prevInput = input;
    const move = ((input & INPUT_RIGHT) ? 1 : 0) - ((input & INPUT_LEFT) ? 1 : 0);
    if (move !== 0) c.facing = move > 0 ? 1 : -1;

    // Ride moving platforms and conveyor belts.
    let carryX = 0;
    if (c.grounded) {
      const belt = this.conveyors.find((b) => this.standsOn(c, b.rect));
      if (belt?.active) carryX += belt.heading * belt.speed;
    }
    if (c.groundPlatform) {
      const p = this.platforms.find((pl) => pl.id === c.groundPlatform);
      if (p) {
        carryX = p.dx;
        c.y = p.rect.y - CHAR_H;
      }
    }

    // Jump with coyote time and input buffering.
    if (jumpPressed) c.jumpBuffer = JUMP_BUFFER_TICKS;
    else if (c.jumpBuffer > 0) c.jumpBuffer--;
    if (c.grounded) c.coyote = COYOTE_TICKS;
    else if (c.coyote > 0) c.coyote--;
    if (c.jumpBuffer > 0 && c.coyote > 0) {
      c.vy = -JUMP_VELOCITY;
      c.jumpBuffer = 0;
      c.coyote = 0;
      c.grounded = false;
      c.groundPlatform = null;
      this.events.push({ type: 'jump', char: c.index });
    }

    const wasGrounded = c.grounded;
    this.moveX(c, move * MOVE_SPEED + carryX);
    c.vy = Math.min(c.vy + GRAVITY, MAX_FALL_SPEED);
    this.moveY(c, c.vy);
    // Springs launch anyone who lands on them.
    if (c.grounded) {
      const pad = this.pads.find((p) => p.active && this.standsOn(c, p.rect));
      if (pad) {
        c.vy = -pad.velocity;
        c.grounded = false;
        c.groundPlatform = null;
        c.coyote = 0;
        c.jumpBuffer = 0;
        this.events.push({ type: 'bounce', char: c.index });
      }
    }
    if (c.grounded && !wasGrounded) this.events.push({ type: 'land', char: c.index });

    this.usePortals(c);
    const body = this.charRect(c);

    if (usePressed) {
      const sw = this.switches.find((s) => overlaps(body, expand(s.rect, INTERACT_REACH)));
      if (sw) {
        if (sw.duration > 0) {
          if (!sw.on) this.events.push({ type: 'switch', id: sw.id, on: true });
          sw.on = true;
          sw.remaining = sw.duration;
        } else {
          sw.on = !sw.on;
          this.events.push({ type: 'switch', id: sw.id, on: sw.on });
        }
      }
    }

    for (const k of this.keys) {
      if (k.holder === -1 && overlaps(body, k.rect)) {
        k.holder = c.index;
        c.keys.push(k.color);
        this.events.push({ type: 'key', id: k.id, char: c.index });
      }
    }
    // Touching a lock with a matching key opens it (also handled during movement).
    for (const l of this.locks) this.tryUnlock(c, l, expand(body, 2));

    if (this.touchesHazard(c) || c.y > WORLD_H) this.kill(c);
  }

  /** Feet resting on top of a rectangle. */
  standsOn(c: Character, r: Rect): boolean {
    return c.grounded && Math.abs(c.y + CHAR_H - r.y) < 0.5 && c.x + CHAR_W > r.x && c.x < r.x + r.w;
  }

  private usePortals(c: Character): void {
    if (this.portals.length === 0) return;
    const body = this.charRect(c);
    if (c.portalLock) {
      const lock = this.portals.find((p) => p.id === c.portalLock);
      if (!lock || !overlaps(body, lock.rect)) c.portalLock = null;
    }
    const cx = c.x + CHAR_W / 2;
    const cy = c.y + CHAR_H / 2;
    for (const p of this.portals) {
      if (!p.active || !p.to || p.id === c.portalLock) continue;
      if (cx < p.rect.x || cx > p.rect.x + p.rect.w || cy < p.rect.y || cy > p.rect.y + p.rect.h) continue;
      const dest = this.portals.find((d) => d.id === p.to);
      if (!dest) return;
      c.x = c.prevX = dest.rect.x + dest.rect.w / 2 - CHAR_W / 2;
      c.y = c.prevY = dest.rect.y + dest.rect.h - CHAR_H;
      c.groundPlatform = null;
      c.portalLock = dest.id;
      this.events.push({ type: 'teleport', char: c.index, from: p.id, to: dest.id });
      return;
    }
  }

  private kill(c: Character): void {
    c.alive = false;
    c.diedAt = this.tick;
    c.keys = [];
    for (const k of this.keys) if (k.holder === c.index) k.holder = -2;
    this.events.push({ type: 'death', char: c.index });
  }

  private tryUnlock(c: Character, l: LockState, body: Rect): boolean {
    if (l.open || !overlaps(body, l.rect)) return false;
    const i = c.keys.indexOf(l.color);
    if (i < 0) return false;
    c.keys.splice(i, 1);
    // The spent key is gone for the rest of this loop.
    const key = this.keys.find((k) => k.holder === c.index && k.color === l.color);
    if (key) key.holder = -2;
    l.open = true;
    this.events.push({ type: 'unlock', id: l.id, char: c.index });
    return true;
  }

  private touchesHazard(c: Character): boolean {
    const hb = inset(this.charRect(c), HAZARD_INSET);
    const c0 = Math.floor(hb.x / TILE);
    const c1 = Math.floor((hb.x + hb.w) / TILE);
    const r0 = Math.floor(hb.y / TILE);
    const r1 = Math.floor((hb.y + hb.h) / TILE);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (tileAt(this.level, col, row) === TILE_SPIKE && overlaps(hb, spikeRect(col, row))) return true;
      }
    }
    for (const l of this.lasers) if (l.active && overlaps(hb, l.beam)) return true;
    return false;
  }

  /** Solid rectangles near a body (walls, closed doors, active bridges, locked doors). */
  private solidsNear(r: Rect, kind: Character['kind']): Rect[] {
    const out: Rect[] = [];
    const c0 = Math.max(0, Math.floor(r.x / TILE) - 1);
    const c1 = Math.min(COLS - 1, Math.floor((r.x + r.w) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(r.y / TILE) - 1);
    const r1 = Math.min(ROWS - 1, Math.floor((r.y + r.h) / TILE) + 1);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (tileAt(this.level, col, row) === TILE_WALL) out.push({ x: col * TILE, y: row * TILE, w: TILE, h: TILE });
      }
    }
    for (const g of this.gates) if (g.solid) out.push(g.rect);
    for (const b of this.conveyors) out.push(b.rect);
    for (const p of this.pads) out.push(p.rect);
    for (const cr of this.crumbles) if (!cr.gone) out.push(cr.rect);
    for (const b of this.barriers) if ((b.blocks === 'ghosts') === (kind === 'ghost')) out.push(b.rect);
    return out;
  }

  private moveX(c: Character, dx: number): void {
    if (dx === 0) return;
    const start = this.charRect(c);
    c.x += dx;
    const body = (): Rect => ({ x: c.x, y: c.y, w: CHAR_W, h: CHAR_H });
    // Locks are solid until a matching key touches them; opening happens before blocking.
    for (const l of this.locks) {
      if (l.open || overlaps(start, l.rect) || !overlaps(body(), l.rect)) continue;
      if (!this.tryUnlock(c, l, body())) c.x = dx > 0 ? l.rect.x - CHAR_W : l.rect.x + l.rect.w;
    }
    for (const s of this.solidsNear({ x: Math.min(start.x, c.x), y: c.y, w: CHAR_W + Math.abs(dx), h: CHAR_H }, c.kind)) {
      if (overlaps(start, s) || !overlaps(body(), s)) continue;
      c.x = dx > 0 ? s.x - CHAR_W : s.x + s.w;
    }
  }

  private moveY(c: Character, dy: number): void {
    c.grounded = false;
    c.groundPlatform = null;
    const start = this.charRect(c);
    c.y += dy;
    const body = (): Rect => ({ x: c.x, y: c.y, w: CHAR_W, h: CHAR_H });
    let landed = false;

    for (const l of this.locks) {
      if (l.open || overlaps(start, l.rect) || !overlaps(body(), l.rect)) continue;
      if (this.tryUnlock(c, l, body())) continue;
      if (dy > 0) {
        c.y = l.rect.y - CHAR_H;
        landed = true;
      } else {
        c.y = l.rect.y + l.rect.h;
        c.vy = 0;
      }
    }
    for (const s of this.solidsNear({ x: c.x, y: Math.min(start.y, c.y), w: CHAR_W, h: CHAR_H + Math.abs(dy) }, c.kind)) {
      if (overlaps(start, s) || !overlaps(body(), s)) continue;
      if (dy > 0) {
        c.y = s.y - CHAR_H;
        landed = true;
      } else {
        c.y = s.y + s.h;
        c.vy = 0;
      }
    }

    if (dy >= 0) {
      const prevBottom = start.y + CHAR_H;
      // Static one-way ledges.
      const c0 = Math.floor(c.x / TILE);
      const c1 = Math.floor((c.x + CHAR_W - 0.001) / TILE);
      const rowFrom = Math.floor(prevBottom / TILE);
      const rowTo = Math.floor((c.y + CHAR_H) / TILE);
      for (let row = rowFrom; row <= rowTo; row++) {
        for (let col = c0; col <= c1; col++) {
          if (tileAt(this.level, col, row) !== TILE_LEDGE) continue;
          const top = row * TILE;
          if (prevBottom <= top + 0.01 && c.y + CHAR_H >= top) {
            c.y = top - CHAR_H;
            landed = true;
          }
        }
      }
      // Moving one-way platforms.
      for (const p of this.platforms) {
        const top = p.rect.y;
        if (c.x + CHAR_W <= p.rect.x || c.x >= p.rect.x + p.rect.w) continue;
        if (prevBottom <= Math.max(top, p.prevY) + 0.01 && c.y + CHAR_H >= top) {
          c.y = top - CHAR_H;
          landed = true;
          c.groundPlatform = p.id;
        }
      }
    }

    if (landed) {
      c.vy = 0;
      c.grounded = true;
    }
  }
}

/** Launch speed that lifts a character about `height` units (semi-implicit Euler, matches World.step). */
export function padVelocity(height: number): number {
  // h ≈ v²/2g − v/2  →  solve for v.
  return (-GRAVITY + Math.sqrt(GRAVITY * GRAVITY + 8 * GRAVITY * height)) / 2 + GRAVITY / 2;
}

/** The harmful part of a spike tile: its lower half. */
export function spikeRect(col: number, row: number): Rect {
  return { x: col * TILE + 2, y: row * TILE + TILE / 2, w: TILE - 4, h: TILE / 2 };
}
