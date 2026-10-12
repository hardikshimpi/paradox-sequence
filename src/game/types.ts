import type { SolutionStep } from './solution';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A boolean expression over signal ids (plates, switches, sequences, locks).
 * `"a"` is true while source `a` is active; `"!a"` while it is not.
 */
export type Cond = string | { all: Cond[] } | { any: Cond[] };

export type KeyColor = 'amber' | 'jade' | 'rose';

export type ObjectSpec =
  /** Active while at least `required` characters stand on it. */
  | { type: 'plate'; required?: number }
  /** Toggled by Interact. With `timed`, Interact turns it on for that many seconds. */
  | { type: 'switch'; timed?: number }
  /** Solid unless `when` is true. With `cycle` (seconds) it is a shutter: open only during the `on` part of each cycle. */
  | { type: 'door'; when?: Cond; cycle?: { on: number; off: number; offset?: number } }
  /** Solid only while `when` is true. */
  | { type: 'bridge'; when: Cond }
  /** Solid until touched by a character carrying a key of the same colour. */
  | { type: 'lock'; color: KeyColor }
  /** Picked up by the first character to touch it. Resets every loop unless `persist`. */
  | { type: 'key'; color: KeyColor; persist?: boolean }
  /** One-way platform. Travels toward `to` (tile offset) while `when` holds, else returns. No `when` = continuous back-and-forth. */
  | { type: 'platform'; to: [number, number]; speed?: number; when?: Cond }
  /**
   * Kills on contact while active. Active while `when` holds and/or on a fixed `cycle` (seconds).
   * With `startsAt`, the laser is harmless until that moment of the loop, then follows its other rules.
   */
  | { type: 'laser'; when?: Cond; cycle?: { on: number; off: number; offset?: number }; startsAt?: number }
  /** Solved once its inputs switch on in exactly this order on the timeline. A wrong input resets progress. */
  | { type: 'sequence'; inputs: string[] }
  /** Solid belt that carries anyone standing on it (tiles/second). Runs while `when` holds; flips direction while `reverse` holds. */
  | { type: 'conveyor'; dir: 1 | -1; speed?: number; when?: Cond; reverse?: Cond }
  /** Solid spring: anyone landing on it is launched `power` tiles high (while `when` holds). */
  | { type: 'pad'; power?: number; when?: Cond }
  /** Stepping into it moves you to portal `to` (while `when` holds). Without `to` it only receives. */
  | { type: 'portal'; to?: string; when?: Cond }
  /** Echo screen: solid only for the given kind of character. */
  | { type: 'barrier'; blocks: 'ghosts' | 'player' }
  /** Solid floor that breaks `delay` seconds after anyone first stands on it, for the rest of the loop. */
  | { type: 'crumble'; delay?: number };

/** Optional explicit placement (tile units) for objects that share cells with others. */
export interface Placement {
  at?: [col: number, row: number, cols: number, rows: number];
}

export interface Sign {
  col: number;
  row: number;
  text: string;
}

export interface LevelDef {
  id: number;
  name: string;
  objective: string;
  /** 1 (gentle) .. 10 (hardest). Never decreases from one level to the next. */
  difficulty: number;
  /** Length of one attempt, in seconds. */
  timeLimit: number;
  /** Maximum number of recorded ghosts kept for this level. */
  maxGhosts?: number;
  /** Extra requirement for the exit to open. */
  exitWhen?: Cond;
  /**
   * ROWS strings of COLS characters.
   * `#` wall · `^` spikes · `-` one-way ledge · `S` spawn · `E` exit · letters = legend objects.
   */
  map: string[];
  legend: Record<string, ObjectSpec & Placement>;
  signs?: Sign[];
  hints: [string, string, string];
  /** Plain-language description of the intended solution. */
  intended: string;
  /** Scripted attempts that prove the level is solvable. The last one must reach the exit. */
  solution: SolutionStep[][];
  /** Target total time (seconds) for the 3rd star. */
  parTime: number;
}

export type SimEvent =
  | { type: 'jump'; char: number }
  | { type: 'land'; char: number }
  | { type: 'plate'; id: string; on: boolean }
  | { type: 'switch'; id: string; on: boolean }
  | { type: 'door'; id: string; open: boolean }
  | { type: 'key'; id: string; char: number }
  | { type: 'unlock'; id: string; char: number }
  | { type: 'sequence'; id: string; progress: number; solved: boolean; reset: boolean }
  | { type: 'death'; char: number }
  | { type: 'bounce'; char: number }
  | { type: 'teleport'; char: number; from: string; to: string }
  | { type: 'crumble'; id: string }
  | { type: 'complete' }
  | { type: 'loop'; reason: 'timeout' | 'manual'; recorded: boolean; ghost: number }
  | { type: 'restart'; reason: 'death' | 'manual' | 'level' };
