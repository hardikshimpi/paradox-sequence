import { COLS, ROWS } from './constants';
import type { LevelDef, ObjectSpec, Placement } from './types';

/**
 * Builds a full-size test level. `lines` are the bottom rows of the room
 * (without border walls); they sit directly on the floor, with open air above.
 */
export function room(lines: string[], legend: Record<string, ObjectSpec & Placement> = {}, extra: Partial<LevelDef> = {}): LevelDef {
  const inner = COLS - 2;
  const rows: string[] = ['#'.repeat(COLS)];
  const open = ROWS - 2 - lines.length;
  for (let i = 0; i < open; i++) rows.push('#' + '.'.repeat(inner) + '#');
  for (const l of lines) {
    if (l.length > inner) throw new Error(`test row too long: ${l}`);
    rows.push('#' + l.padEnd(inner, '.') + '#');
  }
  rows.push('#'.repeat(COLS));
  // Tests that do not care about the exit get an unreachable one in the top-right corner.
  if (!lines.some((l) => l.includes('E'))) rows[1] = rows[1].slice(0, COLS - 2) + 'E#';
  return {
    id: 99,
    name: 'Test Room',
    objective: '',
    difficulty: 1,
    timeLimit: 10,
    map: rows,
    legend,
    hints: ['', '', ''],
    intended: '',
    solution: [],
    parTime: 10,
    ...extra,
  };
}
