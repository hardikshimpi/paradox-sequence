import { DEFAULT_MAX_GHOSTS, secondsToTicks } from './constants';
import type { InputBits } from './input';
import { parseLevel, type LevelData } from './level';
import { Recording, RecordingBuilder } from './recording';
import type { LevelDef, SimEvent } from './types';
import { World } from './world';

export type SessionStatus = 'playing' | 'complete';

export interface SessionStats {
  /** Every simulated tick spent on this level, across all attempts. */
  totalTicks: number;
  /** Attempts started (the current one included). */
  attempts: number;
  deaths: number;
  /** Attempts that became ghosts. */
  recorded: number;
}

/**
 * Owns the time loop for one level: the ghost recordings, the current attempt's
 * world, and the rules for ending, restarting and recording attempts.
 * Pure simulation — no DOM, no timers; the caller drives `step()` at a fixed rate.
 */
export class LevelSession {
  readonly level: LevelData;
  ghosts: Recording[] = [];
  world!: World;
  status: SessionStatus = 'playing';
  stats: SessionStats = { totalTicks: 0, attempts: 1, deaths: 0, recorded: 0 };
  /** Persistent keys the player carried out of a recorded attempt. */
  readonly bankedKeys = new Set<string>();
  private recorder = new RecordingBuilder();

  constructor(def: LevelDef | LevelData) {
    this.level = 'tiles' in def ? def : parseLevel(def);
    this.resetWorld();
  }

  get def(): LevelDef {
    return this.level.def;
  }
  get timeLimitTicks(): number {
    return secondsToTicks(this.level.def.timeLimit);
  }
  get remainingTicks(): number {
    return Math.max(0, this.timeLimitTicks - this.world.tick);
  }
  get maxGhosts(): number {
    return this.level.def.maxGhosts ?? DEFAULT_MAX_GHOSTS;
  }
  get slotsFull(): boolean {
    return this.ghosts.length >= this.maxGhosts;
  }
  /** The recording of the attempt in progress (so far). */
  get currentAttemptTicks(): number {
    return this.recorder.ticks;
  }

  /** Advance one tick with the live player's input. Returns what happened. */
  step(playerInput: InputBits): SimEvent[] {
    if (this.status !== 'playing') return [];
    const w = this.world;
    const inputs = this.ghosts.map((g) => g.inputAt(w.tick));
    inputs.push(playerInput);
    const tick = w.tick;
    w.step(inputs);
    this.recorder.push(tick, playerInput, { x: w.player.x, y: w.player.y });
    this.stats.totalTicks++;
    const events = w.events.slice();

    if (w.completed) {
      this.status = 'complete';
      return events;
    }
    if (!w.player.alive) {
      // Death discards the attempt; existing ghosts are kept.
      this.stats.deaths++;
      events.push(...this.restartAttempt('death'));
    } else if (w.tick >= this.timeLimitTicks) {
      events.push(...this.commitAttempt('timeout'));
    }
    return events;
  }

  /**
   * End the attempt now and keep it as a ghost (if a slot is free), then start
   * the next loop. Called automatically when time runs out, or manually via "Loop Now".
   */
  commitAttempt(reason: 'timeout' | 'manual'): SimEvent[] {
    if (this.status !== 'playing') return [];
    let recorded = false;
    if (!this.slotsFull) {
      const p = this.world.player;
      for (const k of this.world.keys) if (k.persist && k.holder === p.index) this.bankedKeys.add(k.id);
      this.ghosts.push(this.recorder.finish());
      this.stats.recorded++;
      recorded = true;
    }
    this.stats.attempts++;
    this.resetWorld();
    return [{ type: 'loop', reason, recorded, ghost: recorded ? this.ghosts.length : 0 }];
  }

  /** Throw away the current attempt and replay it from the start. Ghosts are preserved. */
  restartAttempt(reason: 'death' | 'manual' = 'manual'): SimEvent[] {
    if (this.status !== 'playing') return [];
    this.stats.attempts++;
    this.resetWorld();
    return [{ type: 'restart', reason }];
  }

  /** Clear every ghost and reset the puzzle to its initial state. */
  restartLevel(): SimEvent[] {
    this.ghosts = [];
    this.bankedKeys.clear();
    this.status = 'playing';
    this.stats.attempts++;
    this.resetWorld();
    return [{ type: 'restart', reason: 'level' }];
  }

  private resetWorld(): void {
    this.world = new World(this.level, { ghostCount: this.ghosts.length, bankedKeys: this.bankedKeys });
    this.recorder = new RecordingBuilder();
  }
}
