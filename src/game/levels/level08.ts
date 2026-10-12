import type { LevelDef } from '../types';

export const level08: LevelDef = {
  id: 8,
  name: 'The Wrong Order',
  objective: 'The panel wants its plates pressed in order. The timeline decides what "first" means.',
  difficulty: 3,
  timeLimit: 12,
  exitWhen: 'q',
  map: [
    '########################',
    '########################',
    '#......................#',
    '#......................#',
    '#.........qqq..........#',
    '#......................#',
    '#......................#',
    '#.....................E#',
    '#.S.................Y.E#',
    '#####..######..#########',
    '#####..######..#########',
    '#####..######..#########',
    '#####XX######ZZ#########',
    '########################',
  ],
  legend: {
    X: { type: 'plate' },
    Y: { type: 'plate' },
    Z: { type: 'plate' },
    q: { type: 'sequence', inputs: ['Z', 'X', 'Y'] },
  },
  signs: [
    { col: 11.5, row: 2.6, text: 'Press the plates in the order the panel shows.' },
    { col: 11.5, row: 6.3, text: 'The pits are one-way trips.' },
  ],
  hints: [
    'Read the panel left to right: the far pit first, the near pit second, the plate by the exit last.',
    'Order is about when on the timeline each plate is pressed — not which attempt you recorded first. A ghost can wait before acting.',
    'Attempt 1: jump the near pit and drop into the far one. Attempt 2: wait about 3 seconds, then drop into the near pit. Attempt 3: cross both pits and step on the last plate after the other two are lit.',
  ],
  intended: 'Ghost 1 drops into the far pit early; ghost 2 waits, then drops into the near pit; you press the final plate last and leave.',
  solution: [
    ['go 4', 'jump 7', 'land', 'go 13', 'land', 'end'],
    ['until 3', 'go 5', 'land', 'end'],
    ['go 4', 'jump 7', 'land', 'go 12', 'jump 15', 'land', 'until 4.5', 'go 22'],
  ],
  parTime: 36,
};
