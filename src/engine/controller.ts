import { CHAR_H, CHAR_W, TICK_MS, ticksToSeconds } from '../game/constants';
import { LevelSession } from '../game/session';
import { END_ATTEMPT, ScriptBot } from '../game/solution';
import type { LevelDef, SimEvent } from '../game/types';
import type { Settings } from '../save/save';
import { audio, type Sfx } from './audio';
import { InputManager, type Command } from './input';
import { CHANNEL_COLORS, COLORS, KEY_COLORS, ghostColor } from './palette';
import { Renderer, type RenderOptions, type Viewport } from './renderer';

export interface HudSnapshot {
  levelId: number;
  levelName: string;
  /** Remaining time in tenths of a second. */
  remainingTenths: number;
  limitSeconds: number;
  /** 0..1 progress through the current loop. */
  progress: number;
  ghosts: number;
  maxGhosts: number;
  ghostEnds: number[];
  attempt: number;
  status: 'playing' | 'complete';
}

export interface CompletionStats {
  timeSeconds: number;
  attempts: number;
  ghostsUsed: number;
  deaths: number;
}

export interface ControllerCallbacks {
  onCommand(c: Command): void;
  onToast(message: string, tone?: 'info' | 'warn'): void;
  onComplete(stats: CompletionStats): void;
}

const MAX_FRAME_MS = 100;

/**
 * Bridges the pure simulation to the browser: fixed-timestep loop driven by
 * requestAnimationFrame, input sampling, rendering, sound and HUD snapshots.
 */
export class GameController {
  session: LevelSession;
  readonly input: InputManager;
  private renderer: Renderer;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private paused = false;
  private holdUntil = 0;
  private completeAt = 0;
  private settings: Settings;
  private touch = false;
  private snapshot: HudSnapshot;
  private listeners = new Set<() => void>();
  private resizeObs: ResizeObserver | null = null;
  private insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private autopilot: ScriptBot | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    level: LevelDef,
    settings: Settings,
    private cb: ControllerCallbacks,
  ) {
    this.session = new LevelSession(level);
    this.settings = settings;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager((c) => this.cb.onCommand(c));
    this.snapshot = this.computeSnapshot();
  }

  start(): void {
    this.input.attach();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvas);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.resizeObs?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.listeners.clear();
  }

  setSettings(s: Settings, touch: boolean, insets: { top: number; right: number; bottom: number; left: number }): void {
    this.settings = s;
    this.touch = touch;
    const changed = Object.entries(insets).some(([k, v]) => this.insets[k as keyof typeof insets] !== v);
    this.insets = insets;
    if (changed) this.resize();
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.input.setEnabled(!p);
    if (!p) {
      this.last = performance.now();
      this.acc = 0;
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** CSS-pixel rectangle of the world inside the canvas. */
  get worldBox(): Viewport {
    return this.renderer.worldBox;
  }

  restartAttempt(): void {
    this.autopilot = null;
    this.handleEvents(this.session.restartAttempt('manual'));
  }

  restartLevel(): void {
    this.handleEvents(this.session.restartLevel());
  }

  loopNow(): void {
    if (this.session.world.tick < 10) {
      this.cb.onToast('Move first — an empty attempt is not worth a ghost.', 'warn');
      return;
    }
    this.handleEvents(this.session.commitAttempt('manual'));
  }

  /**
   * Test/demo hook (reachable only through the `?e2e` window handle): records the first
   * `ghosts` attempts of the level's verified solution instantly, then (optionally) drives
   * the final attempt through the normal real-time loop.
   */
  devPlaySolution(ghosts = this.session.def.solution.length - 1, autoplayFinal = true): void {
    const s = this.session;
    const def = s.def;
    s.restartLevel();
    for (let a = 0; a < Math.min(ghosts, def.solution.length - 1); a++) {
      const bot = new ScriptBot(def.solution[a]);
      const before = s.stats.attempts;
      for (let guard = 0; guard < 100_000; guard++) {
        const input = bot.next(s.world.player, s.world.tick);
        if (input === END_ATTEMPT) {
          s.commitAttempt('manual');
          break;
        }
        s.step(input);
        if (s.stats.attempts !== before) break;
      }
    }
    this.autopilot = autoplayFinal ? new ScriptBot(def.solution[def.solution.length - 1]) : null;
    this.renderer.resetFx();
  }

  // ───────────────────────────── HUD store ─────────────────────────────

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): HudSnapshot => this.snapshot;

  private computeSnapshot(): HudSnapshot {
    const s = this.session;
    const limit = s.timeLimitTicks;
    return {
      levelId: s.def.id,
      levelName: s.def.name,
      remainingTenths: Math.ceil(ticksToSeconds(s.remainingTicks) * 10),
      limitSeconds: s.def.timeLimit,
      progress: Math.round((s.world.tick / limit) * 400) / 400,
      ghosts: s.ghosts.length,
      maxGhosts: s.maxGhosts,
      ghostEnds: s.ghosts.map((g) => Math.min(1, g.length / limit)),
      attempt: s.stats.attempts,
      status: s.status,
    };
  }

  private publish(): void {
    const next = this.computeSnapshot();
    const prev = this.snapshot;
    const same =
      prev.remainingTenths === next.remainingTenths &&
      prev.progress === next.progress &&
      prev.ghosts === next.ghosts &&
      prev.attempt === next.attempt &&
      prev.status === next.status &&
      prev.levelId === next.levelId;
    if (same) return;
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }

  // ───────────────────────────── loop ─────────────────────────────

  /** Test hook (`?e2e`): automated browsers may report hidden pages while being driven. */
  autoPauseOnHide = true;

  private onVisibility = (): void => {
    // A hidden tab must never burn through the time limit: pause immediately.
    if (this.autoPauseOnHide && document.hidden && !this.paused && this.session.status === 'playing') this.cb.onCommand('pause');
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const i = this.insets;
    this.renderer.resize(rect.width, rect.height, dpr, {
      x: i.left,
      y: i.top,
      w: Math.max(10, rect.width - i.left - i.right),
      h: Math.max(10, rect.height - i.top - i.bottom),
    });
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;
    const s = this.session;

    if (!this.paused && s.status === 'playing' && now >= this.holdUntil) {
      this.acc += dt;
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        let input = this.input.sample();
        if (this.autopilot) {
          const bits = this.autopilot.next(s.world.player, s.world.tick);
          input = bits === END_ATTEMPT ? 0 : bits;
        }
        const events = s.step(input);
        this.handleEvents(events);
        if (s.status !== 'playing' || now < this.holdUntil) {
          this.acc = 0;
          break;
        }
      }
    }
    if (s.status === 'complete' && this.completeAt && now >= this.completeAt) {
      this.completeAt = 0;
      this.cb.onComplete({
        timeSeconds: Math.round(ticksToSeconds(s.stats.totalTicks) * 10) / 10,
        attempts: s.stats.attempts,
        ghostsUsed: s.ghosts.length,
        deaths: s.stats.deaths,
      });
    }

    const alpha = this.paused || now < this.holdUntil ? 1 : Math.min(1, this.acc / TICK_MS);
    this.renderer.render(s, alpha, now, this.renderOptions());
    this.publish();
  };

  private renderOptions(): RenderOptions {
    return {
      ghostPaths: this.settings.ghostPaths,
      reducedMotion: this.settings.reducedMotion,
      highContrast: this.settings.highContrast,
      touch: this.touch,
    };
  }

  // ───────────────────────────── events → feedback ─────────────────────────────

  private handleEvents(events: SimEvent[]): void {
    const w = this.session.world;
    const opts = this.renderOptions();
    const now = performance.now();
    const sfx = (n: Sfx): void => audio.play(n);
    const charCenter = (i: number): { x: number; y: number } => {
      const c = w.chars[i];
      return c ? { x: c.x + CHAR_W / 2, y: c.y + CHAR_H / 2 } : { x: 0, y: 0 };
    };
    const colorOf = (id: string): string => CHANNEL_COLORS[(this.session.level.channels[id] ?? 0) % CHANNEL_COLORS.length];

    for (const e of events) {
      switch (e.type) {
        case 'jump':
          if (e.char === w.player.index) sfx('jump');
          break;
        case 'land':
          if (e.char === w.player.index) sfx('land');
          break;
        case 'plate': {
          sfx(e.on ? 'plateOn' : 'plateOff');
          const p = w.plates.find((pl) => pl.id === e.id);
          if (p && e.on) this.renderer.burst(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h - 4, colorOf(e.id), 10, opts, 1.6);
          break;
        }
        case 'switch':
          sfx('switch');
          break;
        case 'door':
          sfx('door');
          break;
        case 'key': {
          sfx('key');
          const k = w.keys.find((kk) => kk.id === e.id);
          const c = charCenter(e.char);
          if (k) this.renderer.burst(c.x, c.y - 10, KEY_COLORS[k.color], 12, opts);
          break;
        }
        case 'unlock': {
          sfx('unlock');
          const l = w.locks.find((ll) => ll.id === e.id);
          if (l) this.renderer.burst(l.rect.x + l.rect.w / 2, l.rect.y + l.rect.h / 2, KEY_COLORS[l.color], 16, opts);
          break;
        }
        case 'sequence':
          sfx(e.reset ? 'seqFail' : 'seq');
          if (e.reset) this.cb.onToast('Wrong order — the sequence reset.', 'warn');
          else if (e.solved) this.cb.onToast('Sequence complete.');
          break;
        case 'death': {
          const c = w.chars[e.char];
          const pos = charCenter(e.char);
          this.renderer.burst(pos.x, pos.y, c && c.kind === 'ghost' ? ghostColor(c.ghostNumber) : COLORS.hazard, 18, opts, 2.8);
          if (c?.kind === 'ghost') {
            sfx('death');
            this.cb.onToast(`Ghost ${c.ghostNumber} was destroyed.`, 'warn');
          }
          break;
        }
        case 'restart':
          if (e.reason === 'death') {
            sfx('death');
            this.renderer.kick(8, opts);
            this.renderer.transition = { kind: 'death', start: now, duration: 700, label: 'You died', sub: 'Attempt restarted — your ghosts are kept' };
            this.holdUntil = now + 450;
          } else if (e.reason === 'manual') {
            sfx('restart');
            this.renderer.transition = { kind: 'restart', start: now, duration: 500, label: 'Attempt restarted', sub: 'Ghosts kept' };
            this.holdUntil = now + 250;
          } else {
            sfx('restart');
            this.renderer.transition = { kind: 'level', start: now, duration: 600, label: 'Level restarted', sub: 'Timeline cleared' };
            this.holdUntil = now + 300;
          }
          this.renderer.resetFx();
          this.input.clear();
          break;
        case 'loop': {
          sfx('loop');
          const label = e.reason === 'timeout' ? 'Time loop' : 'Loop';
          const sub = e.recorded ? `Ghost ${e.ghost} recorded` : `Ghost slots full — attempt not recorded`;
          this.renderer.transition = { kind: 'loop', start: now, duration: 800, label, sub };
          this.holdUntil = now + 550;
          this.renderer.resetFx();
          this.input.clear();
          if (!e.recorded) this.cb.onToast('All ghost slots are used. Restart Level to clear them.', 'warn');
          break;
        }
        case 'bounce':
          sfx('bounce');
          break;
        case 'teleport': {
          sfx('teleport');
          const pos = charCenter(e.char);
          this.renderer.burst(pos.x, pos.y, '#bff6ff', 10, opts, 1.8);
          break;
        }
        case 'crumble': {
          sfx('crumble');
          const cr = w.crumbles.find((c) => c.id === e.id);
          if (cr) this.renderer.burst(cr.rect.x + cr.rect.w / 2, cr.rect.y + 10, '#8f86b8', 10, opts, 1.4);
          break;
        }
        case 'complete':
          sfx('complete');
          this.renderer.burst(w.player.x + CHAR_W / 2, w.player.y + CHAR_H / 2, COLORS.player, 28, opts, 3);
          this.completeAt = now + 650;
          break;
      }
    }
  }
}
