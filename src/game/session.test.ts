import { describe, expect, it } from 'vitest';
import { CHAR_W, MOVE_SPEED, TILE } from './constants';
import { INPUT_LEFT, INPUT_RIGHT } from './input';
import { LevelSession } from './session';
import { room } from './testkit';

const toward = (x: number, col: number) => {
  const d = col * TILE + (TILE - CHAR_W) / 2 - x;
  return Math.abs(d) <= MOVE_SPEED / 2 + 0.01 ? 0 : d > 0 ? INPUT_RIGHT : INPUT_LEFT;
};
const walkTo = (s: LevelSession, col: number, ticks: number) => {
  for (let i = 0; i < ticks; i++) s.step(toward(s.world.player.x, col));
};

const plateDoor = room(['......#', '......D', 'S.aa..D...E'], { a: { type: 'plate' }, D: { type: 'door', when: 'a' } }, { timeLimit: 3 });

describe('time loop', () => {
  it('ends the attempt exactly at the time limit and records it as a ghost', () => {
    const s = new LevelSession(plateDoor);
    expect(s.timeLimitTicks).toBe(180);
    for (let i = 0; i < 179; i++) s.step(0);
    expect(s.ghosts).toHaveLength(0);
    expect(s.remainingTicks).toBe(1);
    const events = s.step(0);
    expect(events).toContainEqual({ type: 'loop', reason: 'timeout', recorded: true, ghost: 1 });
    expect(s.ghosts).toHaveLength(1);
    expect(s.ghosts[0].length).toBe(180);
    expect(s.world.tick).toBe(0);
    expect(s.remainingTicks).toBe(180);
    expect(s.world.chars.map((c) => c.kind)).toEqual(['ghost', 'player']);
  });

  it('replays a ghost on the same timeline: same tick, same position', () => {
    const s = new LevelSession(plateDoor);
    const trace: number[] = [];
    for (let t = 0; t < 120; t++) {
      s.step(t < 40 ? INPUT_RIGHT : t < 60 ? 0 : INPUT_LEFT);
      trace.push(s.world.player.x);
    }
    s.commitAttempt('manual');
    for (let t = 0; t < 150; t++) {
      s.step(0);
      expect(s.world.chars[0].x).toBe(trace[Math.min(t, trace.length - 1)]);
    }
  });

  it('a ghost stands still after its recording ends', () => {
    const s = new LevelSession(plateDoor);
    walkTo(s, 3, 40);
    s.commitAttempt('manual');
    walkTo(s, 1, 40);
    const x = s.world.chars[0].x;
    for (let i = 0; i < 60; i++) s.step(0);
    expect(s.world.chars[0].x).toBe(x);
    expect(s.world.plates[0].pressed).toBe(true);
  });

  it('Restart Attempt discards the current attempt but keeps ghosts', () => {
    const s = new LevelSession(plateDoor);
    walkTo(s, 3, 40);
    s.commitAttempt('manual');
    walkTo(s, 8, 50);
    const events = s.restartAttempt();
    expect(events).toEqual([{ type: 'restart', reason: 'manual' }]);
    expect(s.ghosts).toHaveLength(1);
    expect(s.world.tick).toBe(0);
    expect(s.world.player.x).toBe(s.level.spawn.x);
    expect(s.stats.attempts).toBe(3);
  });

  it('Restart Level clears every ghost and resets the puzzle', () => {
    const s = new LevelSession(plateDoor);
    walkTo(s, 3, 40);
    s.commitAttempt('manual');
    s.commitAttempt('manual');
    expect(s.ghosts).toHaveLength(2);
    s.restartLevel();
    expect(s.ghosts).toHaveLength(0);
    expect(s.world.chars).toHaveLength(1);
    expect(s.world.plates[0].pressed).toBe(false);
    expect(s.world.gates[0].solid).toBe(true);
  });

  it('death restarts the attempt, keeps ghosts and is not recorded', () => {
    const s = new LevelSession(room(['S...^^'], {}, { timeLimit: 5 }));
    walkTo(s, 1, 10);
    s.commitAttempt('manual');
    let restarted = false;
    for (let i = 0; i < 100 && !restarted; i++) restarted = s.step(INPUT_RIGHT).some((e) => e.type === 'restart' && e.reason === 'death');
    expect(restarted).toBe(true);
    expect(s.ghosts).toHaveLength(1);
    expect(s.stats.deaths).toBe(1);
    expect(s.world.tick).toBe(0);
  });

  it('keeps multiple ghosts in sync across loops', () => {
    const def = room(['S..a..b..c'], { a: { type: 'plate' }, b: { type: 'plate' }, c: { type: 'plate' } }, { timeLimit: 4 });
    const s = new LevelSession(def);
    walkTo(s, 4, 100);
    s.commitAttempt('manual');
    for (let i = 0; i < 30; i++) s.step(0); // ghost 2 starts late
    walkTo(s, 7, 100);
    s.commitAttempt('manual');
    // Third loop: ghost positions must match their own recordings tick for tick, twice over.
    const run = () => {
      const xs: number[][] = [];
      for (let t = 0; t < 200; t++) {
        s.step(0);
        xs.push(s.world.chars.slice(0, 2).map((c) => c.x));
      }
      return xs;
    };
    const first = run();
    s.restartAttempt();
    const second = run();
    expect(second).toEqual(first);
    expect(s.world.plates.map((p) => p.pressed)).toEqual([true, true, false]);
    // Ghost 2 started 30 ticks later than ghost 1 and is still walking when ghost 1 is done.
    expect(first[40][0]).toBe(first[199][0]);
    expect(first[40][1]).toBeLessThan(first[199][1]);
  });

  it('does not record attempts once the ghost slots are full', () => {
    const s = new LevelSession(room(['S'], {}, { maxGhosts: 1 }));
    s.step(0);
    expect(s.commitAttempt('manual')[0]).toMatchObject({ type: 'loop', recorded: true });
    s.step(0);
    expect(s.slotsFull).toBe(true);
    expect(s.commitAttempt('manual')[0]).toMatchObject({ type: 'loop', recorded: false });
    expect(s.ghosts).toHaveLength(1);
  });

  it('completes the level when the player reaches the open exit', () => {
    const s = new LevelSession(plateDoor);
    walkTo(s, 3, 40);
    s.commitAttempt('manual');
    let done = false;
    for (let i = 0; i < 175 && !done; i++) done = s.step(INPUT_RIGHT).some((e) => e.type === 'complete');
    expect(done).toBe(true);
    expect(s.status).toBe('complete');
    expect(s.step(INPUT_RIGHT)).toEqual([]); // frozen after completion
  });

  it('banks persistent keys carried out of a recorded attempt', () => {
    const def = room(['S.k..L..'], { k: { type: 'key', color: 'jade', persist: true }, L: { type: 'lock', color: 'jade' } });
    const s = new LevelSession(def);
    walkTo(s, 3, 30);
    expect(s.world.player.keys).toEqual(['jade']);
    s.commitAttempt('manual');
    expect(s.bankedKeys.has('k')).toBe(true);
    expect(s.world.player.keys).toEqual(['jade']);
    s.restartLevel();
    expect(s.bankedKeys.size).toBe(0);
    expect(s.world.player.keys).toEqual([]);
  });
});
