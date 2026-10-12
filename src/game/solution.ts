import { CHAR_H, CHAR_W, MOVE_SPEED, TILE, secondsToTicks } from './constants';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE, type InputBits } from './input';
import type { LevelSession } from './session';
import type { LevelDef } from './types';
import type { Character } from './world';

/**
 * A scripted solution step. Scripts produce ordinary input bits, exactly like a
 * keyboard would, so a verified script proves a human can solve the level.
 *
 *  `go C`      walk to column C (stops within half a step of the tile centre)
 *  `enter C`   walk toward column C until a portal moves you
 *  `rise R`    hold nothing until your feet are above row R (e.g. riding a spring)
 *  `hold C S`  keep steering to column C (e.g. against a belt) until the clock reads S seconds
 *  `jump C`    jump, steering toward column C
 *  `wait S`    hold nothing for S seconds
 *  `until S`   hold nothing until the attempt clock reads S seconds
 *  `land`      hold nothing until standing on something
 *  `use`       press Interact for one tick
 *  `end`       Loop Now: keep this attempt as a ghost and start the next loop
 *  `expire`    stand still until the time limit ends the attempt
 */
export type SolutionStep = string;

export const END_ATTEMPT = -1;

export class ScriptBot {
  private i = 0;
  private stepStart = -1;
  private lastPos: { x: number; y: number } | null = null;
  private readonly steps: string[][];

  constructor(steps: readonly SolutionStep[]) {
    this.steps = steps.map((s) => s.trim().split(/\s+/));
    for (const [op] of this.steps) {
      if (!['go', 'enter', 'rise', 'hold', 'jump', 'wait', 'until', 'land', 'use', 'end', 'expire'].includes(op)) {
        throw new Error(`Unknown solution step "${op}"`);
      }
    }
  }

  get done(): boolean {
    return this.i >= this.steps.length;
  }

  /** Input for this tick, or END_ATTEMPT. */
  next(p: Character, tick: number): InputBits {
    for (let guard = 0; guard < 64; guard++) {
      if (this.i >= this.steps.length) return 0;
      const [op, arg, arg2] = this.steps[this.i];
      const n = Number(arg);
      if (this.stepStart < 0) this.stepStart = tick;
      const first = this.stepStart === tick;
      const advance = (): void => {
        this.i++;
        this.stepStart = -1;
      };
      switch (op) {
        case 'go':
        case 'jump': {
          const dir = steer(p, n);
          if (op === 'jump' && first) return INPUT_JUMP | dir;
          if (dir === 0) {
            advance();
            continue;
          }
          return dir;
        }
        case 'enter': {
          const moved = this.lastPos !== null && Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) > TILE;
          this.lastPos = { x: p.x, y: p.y };
          if (moved && !first) {
            this.lastPos = null;
            advance();
            continue;
          }
          return steer(p, n);
        }
        case 'rise':
          if (p.y + CHAR_H < n * TILE) {
            advance();
            continue;
          }
          return 0;
        case 'hold':
          if (tick >= secondsToTicks(Number(arg2))) {
            advance();
            continue;
          }
          return steer(p, n);
        case 'wait':
          if (tick - this.stepStart >= secondsToTicks(n)) {
            advance();
            continue;
          }
          return 0;
        case 'until':
          if (tick >= secondsToTicks(n)) {
            advance();
            continue;
          }
          return 0;
        case 'land':
          if (p.grounded && !first) {
            advance();
            continue;
          }
          return 0;
        case 'use':
          advance();
          return INPUT_USE;
        case 'end':
          advance();
          return END_ATTEMPT;
        case 'expire':
          return 0;
      }
    }
    throw new Error('Solution script did not yield an input');
  }
}

function steer(p: Character, col: number): InputBits {
  const target = col * TILE + (TILE - CHAR_W) / 2;
  const d = target - p.x;
  if (Math.abs(d) <= MOVE_SPEED / 2 + 0.01) return 0;
  return d > 0 ? INPUT_RIGHT : INPUT_LEFT;
}

export interface SolutionResult {
  completed: boolean;
  /** Tick within the final attempt at which the exit was reached. */
  completeTick: number;
  /** Total simulated ticks across all attempts. */
  totalTicks: number;
  failure?: string;
}

/** Play a level's scripted solution through a real LevelSession. */
export function playSolution(session: LevelSession, def: LevelDef = session.def): SolutionResult {
  const attempts = def.solution;
  for (let a = 0; a < attempts.length; a++) {
    const bot = new ScriptBot(attempts[a]);
    const ghostsBefore = session.ghosts.length;
    const attemptsBefore = session.stats.attempts;
    for (;;) {
      const w = session.world;
      const input = bot.next(w.player, w.tick);
      if (input === END_ATTEMPT) {
        session.commitAttempt('manual');
        break;
      }
      const events = session.step(input);
      if (session.status === 'complete') {
        const last = a === attempts.length - 1;
        return {
          completed: last,
          completeTick: w.tick,
          totalTicks: session.stats.totalTicks,
          failure: last ? undefined : `completed early during attempt ${a + 1}`,
        };
      }
      if (events.some((e) => e.type === 'restart' && e.reason === 'death')) {
        return { completed: false, completeTick: -1, totalTicks: session.stats.totalTicks, failure: `player died in attempt ${a + 1} at tick ${w.tick}` };
      }
      if (session.stats.attempts !== attemptsBefore) break; // timed out → recorded
    }
    if (a < attempts.length - 1 && session.ghosts.length !== ghostsBefore + 1) {
      return { completed: false, completeTick: -1, totalTicks: session.stats.totalTicks, failure: `attempt ${a + 1} was not recorded` };
    }
  }
  return { completed: false, completeTick: -1, totalTicks: session.stats.totalTicks, failure: 'final attempt timed out' };
}
