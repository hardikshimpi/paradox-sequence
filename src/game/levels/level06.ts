import type { LevelDef } from '../types';

export const level06: LevelDef = {
  id: 6,
  name: 'The Second You',
  objective: 'Two doors, two plates, one of you. Build a chain of ghosts.',
  difficulty: 2,
  timeLimit: 12,
  map: [
    '########################',
    '########################',
    '########################',
    '########################',
    '#......#.......#.......#',
    '#......#.......#.......#',
    '#......#.......#.......#',
    '#......#.......#.......#',
    '#......#....BB.#.......#',
    '#......C..####.D.......#',
    '#......C.......D.......#',
    '#......C##.....D.....E.#',
    '#.S.AA.C##.....D.....E.#',
    '########################',
  ],
  legend: {
    A: { type: 'plate' },
    B: { type: 'plate' },
    C: { type: 'door', when: 'A' },
    D: { type: 'door', when: 'B' },
  },
  signs: [{ col: 4, row: 6, text: 'Ghosts stack up.' }, { col: 4, row: 6.6, text: 'Each loop adds another.' }],
  hints: [
    'The second plate is on the ledge between the two doors — you can only reach it once the first door is open.',
    'Every recorded attempt stays. A second ghost can rely on the first one, just like you do.',
    'Attempt 1: stand on the first plate. Attempt 2: go through the first door and stand on the ledge plate. Attempt 3: walk through both doors.',
  ],
  intended: 'Ghost 1 holds the first plate; ghost 2 passes the first door and holds the ledge plate; you walk through both doors.',
  solution: [
    ['go 4', 'end'],
    ['go 7', 'jump 9', 'land', 'jump 11', 'land', 'go 12', 'end'],
    ['go 7', 'jump 10', 'land', 'go 21'],
  ],
  parTime: 36,
};
