import { describe, expect, it } from 'vitest';
import { CHAR_H, CHAR_W, MOVE_SPEED, TILE, secondsToTicks } from './constants';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE } from './input';
import { parseLevel } from './level';
import { room } from './testkit';
import type { LevelDef } from './types';
import { World, type Character } from './world';

const make = (def: LevelDef, ghosts = 0) => new World(parseLevel(def), { ghostCount: ghosts });
/** Step with the same input for every character. */
const run = (w: World, input: number, ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step(w.chars.map(() => input));
};
/** Step with one input per character. */
const runEach = (w: World, inputs: number[], ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step(inputs);
};
const toward = (c: Character, col: number | null): number => {
  if (col === null) return 0;
  const d = col * TILE + (TILE - CHAR_W) / 2 - c.x;
  return Math.abs(d) <= MOVE_SPEED / 2 + 0.01 ? 0 : d > 0 ? INPUT_RIGHT : INPUT_LEFT;
};
/** Each character walks toward its target column (null = stand still). */
const goto = (w: World, cols: (number | null)[], ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step(w.chars.map((c, j) => toward(c, cols[j] ?? null)));
};
const sawEvent = (w: World, input: number, ticks: number, type: string) => {
  let seen = false;
  for (let i = 0; i < ticks; i++) {
    w.step(w.chars.map(() => input));
    if (w.events.some((e) => e.type === type)) seen = true;
  }
  return seen;
};

describe('pressure plates', () => {
  const def = room(['S..aa......'], { a: { type: 'plate' } });

  it('activate while a character stands on them and release when it leaves', () => {
    const w = make(def);
    run(w, 0, 5);
    expect(w.plates[0].pressed).toBe(false);
    goto(w, [9], 80);
    expect(w.plates[0].pressed).toBe(false); // walked past
    goto(w, [4], 60);
    expect(w.plates[0].pressed).toBe(true);
    expect(w.signals.a).toBe(true);
    goto(w, [1], 60);
    expect(w.plates[0].pressed).toBe(false);
  });

  it('are not pressed by jumping over them', () => {
    const w = make(def);
    run(w, 0, 2);
    let pressed = false;
    w.step([INPUT_RIGHT | INPUT_JUMP]);
    for (let i = 0; i < 30; i++) {
      w.step([INPUT_RIGHT]);
      if (w.plates[0].pressed) pressed = true;
    }
    expect(pressed).toBe(false);
  });

  it('respect their required weight', () => {
    const heavy = room(['S.aa'], { a: { type: 'plate', required: 2 } });
    const one = make(heavy, 1);
    goto(one, [null, 3], 40); // only the player
    expect(one.plates[0].count).toBe(1);
    expect(one.plates[0].pressed).toBe(false);
    const two = make(heavy, 1);
    goto(two, [3, 4], 40); // ghost and player together
    expect(two.plates[0].count).toBe(2);
    expect(two.plates[0].pressed).toBe(true);
  });

  it('are pressed by ghosts too', () => {
    const w = make(def, 1);
    goto(w, [4, null], 60);
    expect(w.plates[0].pressed).toBe(true);
  });
});

describe('switches', () => {
  it('toggle on Interact only when the character is close', () => {
    const w = make(room(['S.....s'], { s: { type: 'switch' } }));
    run(w, 0, 3);
    run(w, INPUT_USE, 1);
    expect(w.switches[0].on).toBe(false); // too far away
    goto(w, [7], 60);
    run(w, INPUT_USE, 1);
    expect(w.switches[0].on).toBe(true);
    run(w, INPUT_USE, 5); // holding does not re-toggle
    expect(w.switches[0].on).toBe(true);
    run(w, 0, 1);
    run(w, INPUT_USE, 1);
    expect(w.switches[0].on).toBe(false);
  });

  it('timed switches turn off after their duration and can be re-armed', () => {
    const w = make(room(['Ss'], { s: { type: 'switch', timed: 1 } }));
    goto(w, [2], 20);
    run(w, INPUT_USE, 1);
    expect(w.switches[0].on).toBe(true);
    run(w, 0, secondsToTicks(0.5));
    run(w, INPUT_USE, 1); // re-arm halfway
    run(w, 0, secondsToTicks(0.9));
    expect(w.switches[0].on).toBe(true);
    run(w, 0, secondsToTicks(0.2));
    expect(w.switches[0].on).toBe(false);
  });
});

describe('doors', () => {
  const def = room(['......#', '......D', 'S.aa..D...'], { a: { type: 'plate' }, D: { type: 'door', when: 'a' } });

  it('block movement until their requirement is met', () => {
    const w = make(def);
    run(w, INPUT_RIGHT, 120);
    expect(w.player.x + 24).toBeLessThanOrEqual(7 * TILE);
    expect(w.gates[0].solid).toBe(true);
  });

  it('open while the linked plate is held (by a ghost)', () => {
    const w = make(def, 1);
    // Ghost walks onto the plate and stops; player walks through.
    goto(w, [3, 10], 140);
    expect(w.plates[0].pressed).toBe(true);
    expect(w.gates[0].solid).toBe(false);
    expect(w.player.x).toBeGreaterThan(7 * TILE);
  });

  it('inverted requirements open when the source is inactive', () => {
    const w = make(room(['S.aa..D...'], { a: { type: 'plate' }, D: { type: 'door', when: '!a' } }));
    run(w, 0, 1);
    expect(w.gates[0].solid).toBe(false);
    goto(w, [3], 60);
    run(w, 0, 2);
    expect(w.plates[0].pressed).toBe(true);
    expect(w.gates[0].solid).toBe(true);
  });

  it('support all/any requirements', () => {
    const def2 = room(['S.a.b.D'], {
      a: { type: 'plate' },
      b: { type: 'plate' },
      D: { type: 'door', when: { all: ['a', 'b'] } },
    });
    const w = make(def2, 1);
    goto(w, [3, 5], 60);
    expect(w.plates.map((p) => p.pressed)).toEqual([true, true]);
    expect(w.gates[0].solid).toBe(false);
  });
});

describe('keys and locks', () => {
  const def = room(['S..k...L...'], { k: { type: 'key', color: 'amber' }, L: { type: 'lock', color: 'amber' } });

  it('locks are solid without a key', () => {
    const w = make(room(['S......L...'], { L: { type: 'lock', color: 'amber' } }));
    run(w, INPUT_RIGHT, 100);
    expect(w.locks[0].open).toBe(false);
    expect(w.player.x + 24).toBeLessThanOrEqual(8 * TILE);
  });

  it('are collected on touch, open the matching lock and are consumed', () => {
    const w = make(def);
    expect(sawEvent(w, INPUT_RIGHT, 30, 'key')).toBe(true);
    expect(w.player.keys).toEqual(['amber']);
    expect(sawEvent(w, INPUT_RIGHT, 60, 'unlock')).toBe(true);
    expect(w.locks[0].open).toBe(true);
    expect(w.player.keys).toEqual([]);
    expect(w.player.x).toBeGreaterThan(8 * TILE);
  });

  it('a key of the wrong colour does not open a lock', () => {
    const w = make(room(['S..k...L...'], { k: { type: 'key', color: 'jade' }, L: { type: 'lock', color: 'amber' } }));
    run(w, INPUT_RIGHT, 120);
    expect(w.player.keys).toEqual(['jade']);
    expect(w.locks[0].open).toBe(false);
  });

  it('belongs to whoever touches it first on the timeline', () => {
    const w = make(def, 1);
    // The ghost waits 30 ticks; the player gets there first.
    for (let t = 0; t < 40; t++) w.step([t < 30 ? 0 : INPUT_RIGHT, INPUT_RIGHT]);
    expect(w.player.keys).toEqual(['amber']);
    run(w, INPUT_RIGHT, 30);
    expect(w.chars[0].keys).toEqual([]);
  });

  it('can be jumped over and left for someone else', () => {
    const w = make(room(['S.....k...'], { k: { type: 'key', color: 'amber' } }));
    goto(w, [5], 60);
    run(w, INPUT_RIGHT | INPUT_JUMP, 1);
    run(w, INPUT_RIGHT, 40);
    expect(w.player.keys).toEqual([]);
    expect(w.keys[0].holder).toBe(-1);
  });

  it('banked (persistent) keys start in the player pocket and are absent from the world', () => {
    const lvl = parseLevel(room(['S..k...L...'], { k: { type: 'key', color: 'amber', persist: true }, L: { type: 'lock', color: 'amber' } }));
    const w = new World(lvl, { ghostCount: 1, bankedKeys: new Set(['k']) });
    expect(w.player.keys).toEqual(['amber']);
    expect(w.chars[0].keys).toEqual([]);
    expect(w.keys[0].holder).toBe(-2);
  });
});

describe('moving platforms', () => {
  const def = room(['......', '......', '......', 'S.aa.pp'], { a: { type: 'plate' }, p: { type: 'platform', to: [0, -3], speed: 3, when: 'a' } });

  it('travel toward their target while powered and return when released', () => {
    const w = make(def, 1);
    const startY = w.platforms[0].rect.y;
    goto(w, [3, null], 150);
    expect(w.platforms[0].rect.y).toBe(startY - 3 * TILE);
    goto(w, [1, null], 20);
    expect(w.platforms[0].rect.y).toBeGreaterThan(startY - 3 * TILE);
    goto(w, [1, null], 120);
    expect(w.platforms[0].rect.y).toBe(startY);
  });

  it('carry characters standing on them', () => {
    const w = make(def, 1);
    // Player hops onto the platform first, then the ghost holds the plate.
    goto(w, [null, 5], 60);
    w.step([0, INPUT_JUMP | INPUT_RIGHT]);
    goto(w, [null, 6], 60);
    expect(w.player.groundPlatform).toBe('p');
    goto(w, [3, 6], 200);
    expect(w.player.y + CHAR_H).toBe(w.platforms[0].rect.y);
    expect(w.platforms[0].rect.y).toBeLessThan(12 * TILE);
  });

  it('move back and forth forever when they have no condition', () => {
    const w = make(room(['S.pp'], { p: { type: 'platform', to: [4, 0], speed: 4 } }));
    const xs = new Set<number>();
    for (let t = 0; t < 200; t++) {
      w.step([0]);
      xs.add(Math.round(w.platforms[0].rect.x));
    }
    expect(Math.min(...xs)).toBe(3 * TILE);
    expect(Math.max(...xs)).toBe(7 * TILE);
  });
});

describe('lasers and hazards', () => {
  it('cycle on a fixed timetable', () => {
    const w = make(room(['S.....L'], { L: { type: 'laser', cycle: { on: 1, off: 0.5 } } }));
    const states: boolean[] = [];
    for (let t = 0; t < 180; t++) {
      w.step([0]);
      states.push(w.lasers[0].active);
    }
    expect(states[0]).toBe(true);
    expect(states[59]).toBe(true);
    expect(states[60]).toBe(false);
    expect(states[89]).toBe(false);
    expect(states[90]).toBe(true);
  });

  it('follow their condition and kill on contact', () => {
    const def = room(['S.aa..L...'], { a: { type: 'plate' }, L: { type: 'laser', when: '!a' } });
    const dead = make(def);
    run(dead, INPUT_RIGHT, 80);
    expect(dead.player.alive).toBe(false);
    const safe = make(def, 1);
    goto(safe, [3, null], 40);
    goto(safe, [3, 10], 100);
    expect(safe.player.alive).toBe(true);
    expect(safe.player.x).toBeGreaterThan(8 * TILE);
  });

  it('deadline lasers stay off until their start time', () => {
    const w = make(room(['S'], { F: { type: 'laser', startsAt: 1, at: [1, 12, 2, 1] } }));
    run(w, 0, 59);
    expect(w.player.alive).toBe(true);
    run(w, 0, 3);
    expect(w.player.alive).toBe(false);
  });

  it('kill ghosts as well', () => {
    const w = make(room(['S..^'], {}), 1);
    runEach(w, [INPUT_RIGHT, 0], 40);
    expect(w.chars[0].alive).toBe(false);
    expect(w.player.alive).toBe(true);
  });
});

describe('sequence locks', () => {
  const def = room(['x...S...y...z'], {
    x: { type: 'plate' },
    y: { type: 'plate' },
    z: { type: 'plate' },
    q: { type: 'sequence', inputs: ['y', 'x', 'z'], at: [10, 5, 2, 1] },
  });

  it('solve when inputs activate in order and stay solved', () => {
    const w = make(def, 2);
    // ghost 0 → y (right) early, ghost 1 → x (left) later, player → z last.
    for (let t = 0; t < 240; t++) w.step([t < 40 ? INPUT_RIGHT : 0, t > 50 && t < 100 ? INPUT_LEFT : 0, t > 110 ? INPUT_RIGHT : 0]);
    expect(w.sequences[0].solved).toBe(true);
    expect(w.signals.q).toBe(true);
  });

  it('reset progress when an input arrives out of order', () => {
    const w = make(def, 1);
    let reset = false;
    for (let t = 0; t < 150; t++) {
      w.step([t < 40 ? INPUT_RIGHT : 0, t > 50 ? INPUT_RIGHT : 0]); // y then z (skipping x)
      if (w.events.some((e) => e.type === 'sequence' && e.reset)) reset = true;
    }
    expect(reset).toBe(true);
    expect(w.sequences[0].solved).toBe(false);
    expect(w.sequences[0].progress).toBe(0);
  });
});

describe('exit', () => {
  it('completes the level only for the live player', () => {
    const w = make(room(['S....E'], {}), 1);
    runEach(w, [INPUT_RIGHT, 0], 80);
    expect(w.completed).toBe(false);
    runEach(w, [0, INPUT_RIGHT], 80);
    expect(w.completed).toBe(true);
  });

  it('stays sealed until its condition holds', () => {
    const def = room(['S.aa..E'], { a: { type: 'plate' } }, { exitWhen: 'a' });
    const alone = make(def);
    run(alone, INPUT_RIGHT, 80);
    expect(alone.completed).toBe(false);
    expect(alone.exitOpen).toBe(false);
    const helped = make(def, 1);
    goto(helped, [3, null], 40);
    goto(helped, [3, 7], 80);
    expect(helped.completed).toBe(true);
  });
});
