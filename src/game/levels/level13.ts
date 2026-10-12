import type { LevelDef } from '../types';

export const level13: LevelDef = {
  id: 13,
  name: 'The Last Safe Moment',
  objective: 'At 6 seconds the furnace lights. Everything has to happen before then.',
  difficulty: 4,
  timeLimit: 12,
  map: [
    '########################',
    '#......................#',
    '#......................#',
    '#................s.....#',
    '#........###############',
    '#....----###############',
    '#........###############',
    '#....----###############',
    '#........###############',
    '#....----.A..B...N.....#',
    '#.........A..B...N.....#',
    '#....----.A..B...N...E.#',
    '#PP...S...A..B...N...E.#',
    '########################',
  ],
  legend: {
    P: { type: 'plate' },
    s: { type: 'switch' },
    A: { type: 'door', when: 's' },
    B: { type: 'door', when: 'P' },
    N: { type: 'laser', cycle: { on: 0.8, off: 1.2 } },
    F: { type: 'laser', startsAt: 6, at: [1, 12, 3, 1] },
  },
  signs: [
    { col: 3, row: 10.2, text: 'Furnace: 6s' },
    { col: 13, row: 1.6, text: 'The switch is a long way from the doors.' },
  ],
  hints: [
    'The plate sits inside the furnace beam, which switches on for good at 6 seconds. The second door only stays open until then.',
    'The first door needs the switch, which takes a while to reach. Its ghost flips it late — so you have a narrow window between both events.',
    'Attempt 1: stand on the furnace plate. Attempt 2: climb the ledges and run straight to the switch. Attempt 3: wait at the first door, pass both doors as soon as it opens, then cross the blinking laser while it is dark.',
  ],
  intended: 'Ghost 1 holds the furnace plate until the furnace lights; ghost 2 races to the switch. You slip through both doors in the gap between those two moments.',
  solution: [
    ['go 1', 'end'],
    ['jump 6', 'land', 'jump 6', 'land', 'jump 6', 'land', 'jump 6', 'land', 'jump 9', 'land', 'go 17', 'use', 'wait 0.2', 'end'],
    ['go 10', 'go 16', 'until 6.85', 'go 21'],
  ],
  parTime: 36,
};
