import type { InputBits } from './input';

/** A change of held input at a given simulation tick. */
export interface InputEvent {
  tick: number;
  bits: InputBits;
}

/**
 * One finished attempt: an ordered list of timestamped input changes.
 * Playback is a pure lookup — the ghost is re-simulated from these inputs,
 * so it obeys the same physics and interaction rules as the player.
 * After `length` ticks the ghost holds no input (it stands still).
 */
export class Recording {
  readonly events: readonly InputEvent[];
  readonly length: number;
  /** Positions sampled while recording (for drawing the original path only — never used for playback). */
  readonly path: readonly { x: number; y: number }[];
  private readonly dense: Uint8Array;

  constructor(events: readonly InputEvent[], length: number, path: readonly { x: number; y: number }[] = []) {
    for (let i = 1; i < events.length; i++) {
      if (events[i].tick <= events[i - 1].tick) throw new Error('Recording events must be strictly increasing in tick');
    }
    this.events = events;
    this.length = length;
    this.path = path;
    this.dense = new Uint8Array(length);
    let e = 0;
    let bits = 0;
    for (let t = 0; t < length; t++) {
      while (e < events.length && events[e].tick <= t) bits = events[e++].bits;
      this.dense[t] = bits;
    }
  }

  inputAt(tick: number): InputBits {
    return tick >= 0 && tick < this.length ? this.dense[tick] : 0;
  }
}

export class RecordingBuilder {
  private events: InputEvent[] = [];
  private path: { x: number; y: number }[] = [];
  private last: InputBits = 0;
  private length = 0;

  static readonly PATH_SAMPLE_TICKS = 4;

  /** Record the input applied at `tick`. Ticks must be pushed in order without gaps. */
  push(tick: number, bits: InputBits, pos?: { x: number; y: number }): void {
    if (tick !== this.length) throw new Error(`RecordingBuilder expected tick ${this.length}, got ${tick}`);
    if (bits !== this.last || (tick === 0 && bits !== 0)) {
      this.events.push({ tick, bits });
      this.last = bits;
    }
    if (pos && tick % RecordingBuilder.PATH_SAMPLE_TICKS === 0) this.path.push({ x: pos.x, y: pos.y });
    this.length = tick + 1;
  }

  get ticks(): number {
    return this.length;
  }

  finish(): Recording {
    return new Recording(this.events.slice(), this.length, this.path.slice());
  }
}
