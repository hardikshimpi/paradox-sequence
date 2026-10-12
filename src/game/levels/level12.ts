import type { LevelDef } from '../types';

export const level12: LevelDef = {
  id: 12,
  name: 'The Key Is Not Yours',
  objective: 'Two keys on one road. Decide which of you carries which — and who gets there first.',
  difficulty: 3,
  timeLimit: 14,
  map: [
    '########################',
    '########################',
    '#...........############',
    '#...........############',
    '#...........############',
    '#...........############',
    '#..............J.......#',
    '#..............J..PP...#',
    '#...........############',
    '#.........--..D...L....#',
    '#.............D...L....#',
    '#........--...D...L..E.#',
    '#.S..a..j.....D...L..E.#',
    '########################',
  ],
  legend: {
    a: { type: 'key', color: 'amber' },
    j: { type: 'key', color: 'jade' },
    J: { type: 'lock', color: 'jade' },
    L: { type: 'lock', color: 'amber' },
    P: { type: 'plate' },
    D: { type: 'door', when: 'P' },
  },
  signs: [
    { col: 6, row: 3, text: 'A key belongs to whoever touches it first —' },
    { col: 6, row: 3.6, text: 'past selves included.' },
  ],
  hints: [
    'Both keys lie on the same path. Your ghost will grab every key it walks over — unless something else got there first.',
    'You need the amber key; your ghost needs the jade one. Jumping over a key leaves it on the floor. Delaying a ghost lets you get ahead of it.',
    'Attempt 1: wait a second, then walk right (taking the jade key), climb the ledges, open the jade lock and stand on the plate. Attempt 2: grab the amber key, jump over the jade key, and wait at the door.',
  ],
  intended: 'Delay the ghost so you reach the amber key first, and jump over the jade key so the ghost can use it on the upper lock.',
  solution: [
    ['wait 1', 'go 9', 'jump 9', 'land', 'jump 11', 'land', 'jump 13', 'land', 'go 18', 'end'],
    ['go 6', 'jump 9', 'land', 'go 13', 'go 21'],
  ],
  parTime: 34,
};
