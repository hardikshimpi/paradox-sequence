import type { LevelDef } from '../types';

export const level10: LevelDef = {
  id: 10,
  name: 'Three of a Kind',
  objective: 'The heavy plate needs two bodies. You make three.',
  difficulty: 3,
  timeLimit: 12,
  map: [
    '########################',
    '###################....#',
    '#................##...E#',
    '#................##...E#',
    '#................##..###',
    '#................##..###',
    '#................##..###',
    '#................##..###',
    '#................##..###',
    '#.................G..###',
    '#.................G..###',
    '#.................G..###',
    '#HH.^^#^^..S......Gpp###',
    '########################',
  ],
  legend: {
    H: { type: 'plate', required: 2 },
    G: { type: 'door', when: '!H' },
    p: { type: 'platform', to: [0, -8], speed: 2.5, when: 'H' },
  },
  signs: [
    { col: 8.5, row: 4, text: 'The dots on a plate show how many must stand on it.' },
    { col: 8.5, row: 4.6, text: 'The gate to the lift shuts once the plate is full.' },
  ],
  hints: [
    'Look at the two dots above the far-left plate: one ghost is not enough.',
    'Two ghosts can stand on the same plate. The lift gate closes when the plate is full, so be on the lift before that.',
    'Attempts 1 and 2: cross the spikes and stand on the heavy plate. Attempt 3: go straight right, through the gate and onto the lift, and ride it up.',
  ],
  intended: 'Record two ghosts on the heavy plate. On the third run, board the lift before the second ghost arrives.',
  solution: [
    ['go 9', 'jump 6', 'land', 'jump 3', 'land', 'go 1', 'end'],
    ['go 9', 'jump 6', 'land', 'jump 3', 'land', 'go 2', 'end'],
    ['go 17', 'jump 19', 'land', 'until 6', 'go 22'],
  ],
  parTime: 34,
};
