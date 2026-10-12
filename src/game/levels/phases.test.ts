import { describe, expect, it } from 'vitest';
import { LEVELS_PER_PHASE, PHASES, phaseOf } from '../phases';
import { LEVELS } from './index';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const levelsOf = (p: (typeof PHASES)[number]) => LEVELS.filter((l) => l.id >= p.first && l.id <= p.last);
const ghostsNeeded = (id: number) => LEVELS[id - 1].solution.length - 1;
const typesIn = (id: number) => new Set(Object.values(LEVELS[id - 1].legend).map((o) => o.type));

describe('phases', () => {
  it('there are five themed phases of fifteen levels covering every level', () => {
    expect(PHASES).toHaveLength(5);
    expect(new Set(PHASES.map((p) => p.theme)).size).toBe(5);
    expect(LEVELS).toHaveLength(PHASES.length * LEVELS_PER_PHASE);
    PHASES.forEach((p, i) => {
      expect(p.first).toBe(i * LEVELS_PER_PHASE + 1);
      expect(p.last).toBe((i + 1) * LEVELS_PER_PHASE);
      expect(levelsOf(p)).toHaveLength(LEVELS_PER_PHASE);
    });
    for (const l of LEVELS) expect(phaseOf(l.id).first).toBeLessThanOrEqual(l.id);
  });

  it('difficulty never drops from one level to the next', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].difficulty, `level ${LEVELS[i].id}`).toBeGreaterThanOrEqual(LEVELS[i - 1].difficulty);
    expect(LEVELS[0].difficulty).toBe(1);
    expect(LEVELS[LEVELS.length - 1].difficulty).toBe(10);
  });

  it('each phase is harder on average than the one before', () => {
    const avgDifficulty = PHASES.map((p) => mean(levelsOf(p).map((l) => l.difficulty)));
    const avgGhosts = PHASES.map((p) => mean(levelsOf(p).map((l) => ghostsNeeded(l.id))));
    for (let i = 1; i < PHASES.length; i++) {
      expect(avgDifficulty[i]).toBeGreaterThan(avgDifficulty[i - 1]);
      expect(avgGhosts[i]).toBeGreaterThanOrEqual(avgGhosts[i - 1]);
    }
  });

  it('each new phase is built around its new mechanic', () => {
    const uses = (phase: number, type: string) => levelsOf(PHASES[phase - 1]).filter((l) => typesIn(l.id).has(type as never)).length;
    expect(uses(2, 'conveyor')).toBeGreaterThanOrEqual(10);
    expect(uses(3, 'pad') + uses(3, 'portal')).toBeGreaterThanOrEqual(15);
    expect(uses(4, 'barrier')).toBe(15);
    expect(uses(5, 'crumble')).toBe(15);
    // None of the new mechanics leak into the first phase.
    for (const t of ['conveyor', 'pad', 'portal', 'barrier', 'crumble']) expect(uses(1, t)).toBe(0);
  });
});
