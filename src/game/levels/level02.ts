import type { LevelDef } from '../types';

export const level02: LevelDef = {
  id: 2,
  name: 'Hold the Door',
  objective: 'The plate is far from the door. Your ghost has to climb up — and stay.',
  difficulty: 1,
  timeLimit: 12,
  map: [
    '########################',
    '#...............#......#',
    '#...............#......#',
    '#...............#......#',
    '#aa.............#......#',
    '####............#......#',
    '####............#......#',
    '######..........#......#',
    '######..........#......#',
    '########........#......#',
    '########........D......#',
    '##########......D....E.#',
    '##########..S...D....E.#',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    D: { type: 'door', when: 'a' },
  },
  signs: [
    { col: 10, row: 2.2, text: 'A ghost repeats your moves, then keeps standing where you stopped.' },
    { col: 19.5, row: 4, text: 'Ghosts need time to get there.' },
    { col: 19.5, row: 4.6, text: 'So will you.' },
  ],
  hints: [
    'The plate sits at the very top of the stairs on the left, far from the door.',
    'A plate only works while someone stands on it. A ghost that has finished its recording stays put — on the plate, if that is where you left it.',
    'Attempt 1: climb the steps to the plate and stay there (or press Loop Now). Attempt 2: wait at the door until your ghost reaches the plate, then walk to the exit.',
  ],
  intended: 'Climb the terraces to the plate and end the attempt there. Next loop, wait at the door for the ghost to arrive, then exit.',
  solution: [
    ['go 10', 'jump 8', 'land', 'jump 6', 'land', 'jump 4', 'land', 'jump 2', 'land', 'go 1', 'end'],
    ['go 15', 'go 21'],
  ],
  parTime: 30,
};
