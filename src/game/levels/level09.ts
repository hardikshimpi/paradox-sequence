import type { LevelDef } from '../types';

export const level09: LevelDef = {
  id: 9,
  name: 'The Dangerous Shortcut',
  objective: 'One plate turns the first laser off — and the second one on. Time the hand-off.',
  difficulty: 3,
  timeLimit: 12,
  map: [
    '########################',
    '########################',
    '#.......################',
    '#.......################',
    '#.......################',
    '#.......################',
    '#.......################',
    '#.......################',
    '#.......################',
    '#aa.......L....M...N...#',
    '####......L....M...N...#',
    '####......L....M...N.E.#',
    '######.S..L.^^.M...N.E.#',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    L: { type: 'laser', when: '!a' },
    M: { type: 'laser', when: 'a' },
    N: { type: 'laser', cycle: { on: 1, off: 1.4 } },
  },
  signs: [
    { col: 4, row: 3, text: 'Same plate,' },
    { col: 4, row: 3.6, text: 'opposite lasers.' },
  ],
  hints: [
    'The first laser shows the plate symbol crossed out; the second shows it plain. They are never both off at once.',
    'Your ghost can stand on the plate for a while and then step off. You need to be between the lasers when it does.',
    'Attempt 1: stand on the plate, then about 4.5 seconds in step off onto the low step and Loop Now. Attempt 2: once the first laser drops, hop the spikes and wait by the second laser; when it drops, go — and pass the blinking laser while it is dark.',
  ],
  intended: 'The ghost holds the plate (first laser off) and later steps off (second laser off). You pass each laser in its window, then time the blinking one.',
  solution: [
    ['go 6', 'jump 4', 'land', 'jump 2', 'land', 'go 1', 'until 4.5', 'go 4', 'land', 'end'],
    ['until 1.5', 'go 11', 'jump 14', 'land', 'until 4.8', 'go 18', 'until 5.85', 'go 21'],
  ],
  parTime: 30,
};
