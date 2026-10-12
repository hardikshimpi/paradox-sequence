import { describe, expect, it } from 'vitest';
import { CHAR_H, CHAR_W, GRAVITY, JUMP_VELOCITY, MAX_FALL_SPEED, MOVE_SPEED, TILE } from './constants';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT } from './input';
import { parseLevel } from './level';
import { room } from './testkit';
import { World } from './world';

const world = (lines: string[]) => new World(parseLevel(room(lines)), { ghostCount: 0 });
const run = (w: World, input: number, ticks: number) => {
  for (let i = 0; i < ticks; i++) w.step([input]);
};
const FLOOR = 13 * TILE;

describe('movement and jumping', () => {
  it('walks left and right at a constant speed', () => {
    const w = world(['..........S']);
    run(w, 0, 5);
    const x0 = w.player.x;
    run(w, INPUT_RIGHT, 10);
    expect(w.player.x).toBeCloseTo(x0 + 10 * MOVE_SPEED, 6);
    run(w, INPUT_LEFT, 4);
    expect(w.player.x).toBeCloseTo(x0 + 6 * MOVE_SPEED, 6);
    expect(w.player.facing).toBe(-1);
  });

  it('stands on the floor under gravity', () => {
    const w = world(['S']);
    run(w, 0, 30);
    expect(w.player.y + CHAR_H).toBe(FLOOR);
    expect(w.player.grounded).toBe(true);
    expect(w.player.vy).toBe(0);
  });

  it('falls with gravity and a capped fall speed', () => {
    const w = world(['S']);
    w.player.y = 60;
    w.player.grounded = false;
    w.step([0]);
    expect(w.player.vy).toBeCloseTo(GRAVITY, 6);
    run(w, 0, 20);
    expect(w.player.vy).toBeLessThanOrEqual(MAX_FALL_SPEED);
    run(w, 0, 60);
    expect(w.player.grounded).toBe(true);
  });

  it('jumps a fixed height that clears two tiles but not three', () => {
    const w = world(['S']);
    run(w, 0, 3);
    w.step([INPUT_JUMP]);
    expect(w.player.vy).toBeCloseTo(-JUMP_VELOCITY + GRAVITY, 6);
    let minY = w.player.y;
    for (let i = 0; i < 60; i++) {
      w.step([INPUT_JUMP]); // holding jump does not jump again or float
      minY = Math.min(minY, w.player.y);
    }
    const height = FLOOR - CHAR_H - minY;
    expect(height).toBeGreaterThan(2 * TILE);
    expect(height).toBeLessThan(3 * TILE);
    expect(w.player.grounded).toBe(true);
  });

  it('cannot jump in mid-air (outside coyote time)', () => {
    const w = world(['S']);
    w.player.y = 100;
    w.player.grounded = false;
    run(w, 0, 10);
    const vy = w.player.vy;
    w.step([INPUT_JUMP]);
    expect(w.player.vy).toBeGreaterThan(vy - 1);
  });

  it('buffers a jump pressed just before landing', () => {
    const w = world(['S']);
    w.player.y = FLOOR - CHAR_H - 30;
    w.player.grounded = false;
    w.player.vy = 6;
    w.step([INPUT_JUMP]); // pressed in the air, lands within the buffer window
    for (let i = 0; i < 5; i++) w.step([INPUT_JUMP]);
    expect(w.player.vy).toBeLessThan(0);
  });
});

describe('collision', () => {
  it('stops flush against a wall and never passes through', () => {
    const w = world(['..S.....#', '........#']);
    run(w, INPUT_RIGHT, 200);
    const wallX = 9 * TILE;
    expect(w.player.x + CHAR_W).toBe(wallX);
  });

  it('climbs a two-tile step but not a three-tile wall', () => {
    const low = world(['.....#', '.....#', 'S....#']); // 3 tall: blocks
    run(low, INPUT_RIGHT, 60);
    run(low, INPUT_RIGHT | INPUT_JUMP, 1);
    run(low, INPUT_RIGHT, 80);
    expect(low.player.x + CHAR_W).toBeLessThanOrEqual(6 * TILE);

    const step = world(['.....#####', 'S....#####']); // 2 tall: climbable
    run(step, INPUT_RIGHT, 60);
    run(step, INPUT_RIGHT | INPUT_JUMP, 1);
    run(step, INPUT_RIGHT, 30);
    expect(step.player.x).toBeGreaterThan(6 * TILE);
    expect(step.player.y + CHAR_H).toBe(11 * TILE);
  });

  it('bumps its head on a low ceiling', () => {
    const w = world(['#####', '.....', 'S....']);
    run(w, 0, 2);
    w.step([INPUT_JUMP]);
    let minY = w.player.y;
    for (let i = 0; i < 30; i++) {
      w.step([0]);
      minY = Math.min(minY, w.player.y);
    }
    expect(minY).toBeGreaterThanOrEqual(11 * TILE);
  });

  it('jumps up through one-way ledges and lands on them', () => {
    const w = world(['----', 'S...']);
    run(w, 0, 2);
    w.step([INPUT_JUMP]);
    run(w, 0, 60);
    expect(w.player.grounded).toBe(true);
    expect(w.player.y + CHAR_H).toBe(11 * TILE);
  });

  it('spikes are deadly', () => {
    const w = world(['S..^^']);
    run(w, INPUT_RIGHT, 60);
    expect(w.player.alive).toBe(false);
    expect(w.events.some((e) => e.type === 'death') || w.player.diedAt >= 0).toBe(true);
  });

  it('a character can jump clean over a two-tile spike pit', () => {
    const w = world(['S..^^.....']);
    run(w, 0, 2);
    run(w, INPUT_RIGHT, 20);
    run(w, INPUT_RIGHT | INPUT_JUMP, 1);
    run(w, INPUT_RIGHT, 60);
    expect(w.player.alive).toBe(true);
    expect(w.player.x).toBeGreaterThan(6 * TILE);
  });
});

describe('determinism', () => {
  it('produces identical state for identical inputs', () => {
    const inputs = Array.from({ length: 400 }, (_, t) => [INPUT_RIGHT, INPUT_RIGHT | INPUT_JUMP, INPUT_LEFT, 0][(t >> 4) & 3]);
    const a = world(['....#....', 'S...#..#.']);
    const b = world(['....#....', 'S...#..#.']);
    for (const i of inputs) {
      a.step([i]);
      b.step([i]);
    }
    expect(a.player).toEqual(b.player);
  });
});
