import type { LevelDef } from '../types';

export const level04: LevelDef = {
  id: 4,
  name: 'The Moving Platform',
  objective: 'The lift only climbs while its plate is held. Ride it to the top.',
  difficulty: 2,
  timeLimit: 14,
  map: [
    '########################',
    '#################......#',
    '#################....E.#',
    '#################....E.#',
    '#################..#####',
    '#...............#..#####',
    '#...............#..#####',
    '#...............#..#####',
    '#...............#..#####',
    '#...............#..#####',
    '#...............#..#####',
    '#..................#####',
    '#aa...^^.....S...pp#####',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    p: { type: 'platform', to: [0, -8], speed: 2.5, when: 'a' },
  },
  signs: [
    { col: 8.5, row: 6.5, text: 'Spikes are deadly — for ghosts too.' },
    { col: 8.5, row: 8.5, text: 'Jump onto the lift and wait for it to rise.' },
  ],
  hints: [
    'The lift in the shaft has the same colour and symbol as the plate on the far left.',
    'The lift rises only while the plate is held and sinks again when it is released. A ghost can hold the plate while you ride.',
    'Attempt 1: jump the spikes and stand on the plate (Loop Now). Attempt 2: jump onto the lift right away and ride it up when your ghost reaches the plate.',
  ],
  intended: 'Record standing on the far plate. Next loop, board the lift before the ghost arrives; it carries you up to the exit ledge.',
  solution: [
    ['go 8', 'jump 4', 'land', 'go 1', 'end'],
    ['go 16', 'jump 17', 'land', 'until 6', 'go 21'],
  ],
  parTime: 30,
};
