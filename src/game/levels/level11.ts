import type { LevelDef } from '../types';

export const level11: LevelDef = {
  id: 11,
  name: 'The Disappearing Bridge',
  objective: 'The button keeps the bridge alive for two seconds. The walk takes longer.',
  difficulty: 3,
  timeLimit: 14,
  map: [
    '########################',
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#....................E.#',
    '#b.S.......P.........E.#',
    '#####AAAAAAABBBBBBB#####',
    '#####..............#####',
    '#####..............#####',
    '#####^^^^^^^^^^^^^^#####',
    '########################',
  ],
  legend: {
    b: { type: 'switch', timed: 2 },
    P: { type: 'plate' },
    A: { type: 'bridge', when: 'b' },
    B: { type: 'bridge', when: 'P' },
  },
  signs: [
    { col: 12, row: 3, text: 'Round buttons stay lit for a moment. Pressing again re-arms them.' },
    { col: 12, row: 5.5, text: 'The second bridge needs someone on the plate — standing on the first bridge.' },
  ],
  hints: [
    'The plate in the middle sits on the first bridge. If that bridge fades, whoever stands there falls.',
    'A ghost can keep pressing the button over and over, keeping the first bridge alive for the whole loop.',
    'Attempt 1: stand at the button and press it every second and a half until the loop ends. Attempt 2: walk out to the middle plate and stay. Attempt 3: cross both bridges.',
  ],
  intended: 'Ghost 1 keeps re-arming the button, ghost 2 holds the mid-bridge plate, and you walk across both spans.',
  solution: [
    [
      'go 1', 'use', 'wait 1.5', 'use', 'wait 1.5', 'use', 'wait 1.5', 'use', 'wait 1.5', 'use',
      'wait 1.5', 'use', 'wait 1.5', 'use', 'wait 1.5', 'use', 'wait 1.5', 'use', 'end',
    ],
    ['until 0.6', 'go 11', 'end'],
    ['until 1', 'go 21'],
  ],
  parTime: 40,
};
