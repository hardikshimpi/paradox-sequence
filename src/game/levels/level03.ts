import type { LevelDef } from '../types';

export const level03: LevelDef = {
  id: 3,
  name: 'Two Places at Once',
  objective: 'One switch, two doors. Be on the right side of both at the right moment.',
  difficulty: 2,
  timeLimit: 12,
  map: [
    '########################',
    '########################',
    '#....###########.......#',
    '#...........####.......#',
    '#.........s.####.......#',
    '#----###########.......#',
    '#....###########.......#',
    '#----###########.......#',
    '#....###########.......#',
    '#----###########.......#',
    '#.......A......B.......#',
    '#----...A......B.....E.#',
    '#.S.....A......B.....E.#',
    '########################',
  ],
  legend: {
    s: { type: 'switch' },
    A: { type: 'door', when: '!s' },
    B: { type: 'door', when: 's' },
  },
  signs: [
    { col: 19.5, row: 3.5, text: 'A slashed symbol means' },
    { col: 19.5, row: 4.1, text: '"open while NOT active".' },
    { col: 8, row: 2.5, text: 'Jump up through thin ledges.' },
  ],
  hints: [
    'The first door is open now and the second is shut. The switch up in the gallery flips both at once.',
    'Your ghost can flip the switch for you — at the exact moment it flipped it in its own attempt.',
    'Attempt 1: climb the ledges, walk to the switch and flip it (then Loop Now). Attempt 2: go straight through the first door and wait at the second. When your ghost flips the switch, it opens.',
  ],
  intended: 'Record flipping the switch a few seconds in. Next loop, slip through the first door before the ghost flips it, then walk through the second door once it opens.',
  solution: [
    ['jump 2', 'land', 'jump 2', 'land', 'jump 2', 'land', 'jump 2', 'land', 'go 10', 'use', 'wait 0.2', 'end'],
    ['go 12', 'go 21'],
  ],
  parTime: 30,
};
