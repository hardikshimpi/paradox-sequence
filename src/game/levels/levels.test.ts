import { describe, expect, it } from 'vitest';
import { secondsToTicks } from '../constants';
import { parseLevel } from '../level';
import { LevelSession } from '../session';
import { END_ATTEMPT, ScriptBot, playSolution } from '../solution';
import { LEVELS } from './index';

const REQUIRED_NAMES = [
  'The First Loop',
  'Hold the Door',
  'Two Places at Once',
  'The Moving Platform',
  'The Locked Route',
  'The Second You',
  "Don't Waste a Second",
  'The Wrong Order',
  'The Dangerous Shortcut',
  'Three of a Kind',
  'The Disappearing Bridge',
  'The Key Is Not Yours',
  'The Last Safe Moment',
  'No Room for Mistakes',
  'Against Yourself',
];

describe('level catalogue', () => {
  it('has the fifteen required levels in order', () => {
    expect(LEVELS.slice(0, 15).map((l) => l.name)).toEqual(REQUIRED_NAMES);
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it('no two levels share a layout', () => {
    expect(new Set(LEVELS.map((l) => l.map.join('\n'))).size).toBe(LEVELS.length);
  });
});

describe.each(LEVELS)('level $id: $name', (level) => {
  it('parses and has complete metadata', () => {
    expect(() => parseLevel(level)).not.toThrow();
    expect(level.objective.length).toBeGreaterThan(10);
    expect(level.intended.length).toBeGreaterThan(10);
    expect(level.hints).toHaveLength(3);
    for (const h of level.hints) expect(h.length).toBeGreaterThan(20);
    expect(level.difficulty).toBeGreaterThanOrEqual(1);
    expect(level.difficulty).toBeLessThanOrEqual(10);
    expect(level.timeLimit).toBeGreaterThan(0);
  });

  it('its scripted solution completes the level', () => {
    const session = new LevelSession(level);
    const result = playSolution(session);
    expect(result.failure).toBeUndefined();
    expect(result.completed).toBe(true);
    // Every action fits inside the attempt with at least a second to spare.
    expect(result.completeTick).toBeLessThanOrEqual(secondsToTicks(level.timeLimit - 1));
    expect(session.ghosts.length).toBeLessThanOrEqual(session.maxGhosts);
    expect(session.ghosts.length).toBe(level.solution.length - 1);
  });

  it('cannot be finished alone: the final run needs its ghosts', () => {
    const session = new LevelSession(level);
    const bot = new ScriptBot(level.solution[level.solution.length - 1]);
    for (let t = 0; t < secondsToTicks(level.timeLimit) && session.status === 'playing'; t++) {
      const input = bot.next(session.world.player, session.world.tick);
      if (input === END_ATTEMPT) break;
      session.step(input);
      if (session.ghosts.length > 0 || session.stats.attempts > 1) break;
    }
    expect(session.status).toBe('playing');
  });

  it('replays identically (deterministic)', () => {
    const a = new LevelSession(level);
    const b = new LevelSession(level);
    const ra = playSolution(a);
    const rb = playSolution(b);
    expect(ra).toEqual(rb);
    expect(a.world.chars.map((c) => [c.x, c.y])).toEqual(b.world.chars.map((c) => [c.x, c.y]));
  });
});
