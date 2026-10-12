import { describe, expect, it } from 'vitest';
import { CHAR_H, CHAR_W, MOVE_SPEED, TILE } from './constants';
import { INPUT_LEFT, INPUT_RIGHT, INPUT_USE } from './input';
import { parseLevel } from './level';
import { room } from './testkit';
import type { LevelDef } from './types';
import { World, padVelocity, type Character } from './world';

const make = (def: LevelDef, ghosts = 0) => new World(parseLevel(def), { ghostCount: ghosts });
const toward = (c: Character, col: number | null): number => {
  if (col === null) return 0;
  const d = col * TILE + (TILE - CHAR_W) / 2 - c.x;
  return Math.abs(d) <= MOVE_SPEED / 2 + 0.01 ? 0 : d > 0 ? INPUT_RIGHT : INPUT_LEFT;
};
const goto = (w: World, cols: (number | null)[], ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step(w.chars.map((c, j) => toward(c, cols[j] ?? null)));
};
const idle = (w: World, ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step(w.chars.map(() => 0));
};

describe('conveyor belts', () => {
  it('carry characters standing on them', () => {
    const w = make(room(['S.......', 'cccccccc'], { c: { type: 'conveyor', dir: 1, speed: 2 } }));
    idle(w, 5);
    const x0 = w.player.x;
    idle(w, 60);
    expect(w.player.x).toBeCloseTo(x0 + 2 * TILE, 4);
  });

  it('stop when unpowered and reverse when told to', () => {
    const def = room(['...........', 'S.s........', 'cccccccccccc'], { s: { type: 'switch' }, c: { type: 'conveyor', dir: 1, speed: 2, when: '!s' } });
    const w = make(def);
    goto(w, [3], 40);
    w.step([INPUT_USE]);
    idle(w, 2);
    const x = w.player.x;
    idle(w, 60);
    expect(w.player.x).toBe(x);

    const r = make(room(['S.s.........', 'cccccccccccc'], { s: { type: 'switch' }, c: { type: 'conveyor', dir: 1, speed: 2, reverse: 's' } }));
    goto(r, [3], 30);
    r.step([INPUT_USE]);
    idle(r, 2);
    const x1 = r.player.x;
    idle(r, 30);
    expect(r.player.x).toBeLessThan(x1);
  });

  it('let you walk against the belt at reduced speed', () => {
    const w = make(room(['.......S', 'cccccccc'], { c: { type: 'conveyor', dir: 1, speed: 1 } }));
    idle(w, 3);
    const x0 = w.player.x;
    for (let i = 0; i < 30; i++) w.step([INPUT_LEFT]);
    expect(w.player.x).toBeCloseTo(x0 - 30 * (MOVE_SPEED - TILE / 60), 4);
  });
});

describe('shutters (cycling doors)', () => {
  it('open and close on their timetable', () => {
    const w = make(room(['S..D'], { D: { type: 'door', cycle: { on: 1, off: 1 } } }));
    const states: boolean[] = [];
    for (let t = 0; t < 130; t++) {
      w.step([0]);
      states.push(w.gates[0].solid);
    }
    expect(states[10]).toBe(false);
    expect(states[70]).toBe(true);
    expect(states[125]).toBe(false);
  });
});

describe('bounce pads', () => {
  it('launch anyone who lands on them about `power` tiles high', () => {
    const w = make(room(['S.', 'pp'], { p: { type: 'pad', power: 5 } }));
    let minY = Infinity;
    let bounced = false;
    for (let i = 0; i < 90; i++) {
      w.step([0]);
      minY = Math.min(minY, w.player.y);
      if (w.events.some((e) => e.type === 'bounce')) bounced = true;
    }
    expect(bounced).toBe(true);
    const height = 12 * TILE - CHAR_H - minY;
    expect(height).toBeGreaterThan(4.6 * TILE);
    expect(height).toBeLessThan(5.4 * TILE);
    expect(padVelocity(200)).toBeGreaterThan(14);
  });

  it('are just floor while unpowered', () => {
    const w = make(room(['S.', 'pp'], { p: { type: 'pad', power: 5, when: 'a' }, a: { type: 'plate', at: [20, 12, 1, 1] } }));
    idle(w, 60);
    expect(w.player.grounded).toBe(true);
  });
});

describe('portals', () => {
  it('move a character to the paired portal and keep its momentum', () => {
    const w = make(room(['S..A..........B.'], { A: { type: 'portal', to: 'B' }, B: { type: 'portal', to: 'A' } }));
    let jumped = false;
    for (let i = 0; i < 40 && !jumped; i++) {
      w.step([INPUT_RIGHT]);
      jumped = w.events.some((e) => e.type === 'teleport');
    }
    expect(jumped).toBe(true);
    expect(w.player.x).toBeCloseTo(15 * TILE + (TILE - CHAR_W) / 2, 4);
    // Standing in the arrival portal does not bounce you back.
    for (let i = 0; i < 4; i++) w.step([0]);
    expect(w.player.x).toBeGreaterThan(14 * TILE);
    // Walk off and back in: it works the other way.
    for (let i = 0; i < 20; i++) w.step([INPUT_RIGHT]);
    let back = false;
    for (let i = 0; i < 40 && !back; i++) {
      w.step([INPUT_LEFT]);
      back = w.events.some((e) => e.type === 'teleport');
    }
    expect(back).toBe(true);
    expect(w.player.x).toBeLessThan(5 * TILE);
  });

  it('do nothing while unpowered', () => {
    const w = make(room(['S..A......B.'], { A: { type: 'portal', to: 'B', when: 'z' }, B: { type: 'portal', to: 'A' }, z: { type: 'plate', at: [20, 12, 1, 1] } }));
    for (let i = 0; i < 40; i++) w.step([INPUT_RIGHT]);
    expect(w.player.x).toBeLessThan(9 * TILE);
  });
});

describe('echo screens', () => {
  it('stop ghosts but let the player through', () => {
    const w = make(room(['S....B....'], { B: { type: 'barrier', blocks: 'ghosts' } }), 1);
    for (let i = 0; i < 120; i++) w.step([INPUT_RIGHT, INPUT_RIGHT]);
    expect(w.chars[0].x + CHAR_W).toBeLessThanOrEqual(6 * TILE);
    expect(w.player.x).toBeGreaterThan(7 * TILE);
  });
});

describe('crumbling floors', () => {
  it('break a moment after first being stood on and stay broken', () => {
    const w = make(room(['S...........', '###kkkk#####', '...^^^^.....'], { k: { type: 'crumble', delay: 0.5 } }));
    goto(w, [5], 60);
    let broke = false;
    for (let i = 0; i < 40 && !broke; i++) {
      w.step([0]);
      broke = w.events.some((e) => e.type === 'crumble');
    }
    expect(broke).toBe(true);
    idle(w, 40);
    expect(w.player.alive).toBe(false);
    expect(w.crumbles[0].gone).toBe(true);
  });

  it('a ghost crossing first breaks the floor for you', () => {
    const def = room(['S...........', '###kkk######', '...^^^......'], { k: { type: 'crumble', delay: 0.5 } });
    const w = make(def, 1);
    for (let i = 0; i < 90; i++) w.step([INPUT_RIGHT, 0]);
    expect(w.crumbles.every((c) => c.gone)).toBe(true);
    expect(w.chars[0].alive).toBe(true);
    for (let i = 0; i < 90; i++) w.step([0, INPUT_RIGHT]);
    expect(w.player.alive).toBe(false);
    expect(w.chars[0].y + CHAR_H).toBe(11 * TILE);
  });
});
