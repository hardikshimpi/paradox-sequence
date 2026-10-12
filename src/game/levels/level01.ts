import type { LevelDef } from '../types';

export const level01: LevelDef = {
  id: 1,
  name: 'The First Loop',
  objective: 'Hold the plate open with your past self, then walk out.',
  difficulty: 1,
  timeLimit: 10,
  map: [
    '########################',
    '########################',
    '########################',
    '########################',
    '#..............#########',
    '#..............#.......#',
    '#..............#.......#',
    '#..............#.......#',
    '#..............#.......#',
    '#..............D.......#',
    '#..............D.......#',
    '#..............D.....E.#',
    '#aa...S........D.....E.#',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    D: { type: 'door', when: 'a' },
  },
  signs: [
    { col: 7.5, row: 5.5, text: 'The door only opens while the plate is held.' },
    { col: 7.5, row: 6.3, text: 'Stand on it until the loop ends — or press Loop Now.' },
    { col: 19, row: 6.5, text: 'Your past self repeats every move.' },
  ],
  hints: [
    'Look at the plate in the bottom-left corner. It has the same colour as the door.',
    'Each attempt is recorded. When it ends, a ghost replays exactly what you did.',
    'Attempt 1: walk left onto the plate and wait (or press Loop Now). Attempt 2: your ghost holds the plate — walk right to the exit.',
  ],
  intended: 'Record one attempt standing on the plate. In the next loop the ghost holds the door open while you walk to the exit.',
  solution: [
    ['go 1', 'end'],
    ['go 21'],
  ],
  parTime: 20,
};
