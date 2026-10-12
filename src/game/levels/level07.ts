import type { LevelDef } from '../types';

export const level07: LevelDef = {
  id: 7,
  name: "Don't Waste a Second",
  objective: 'The plate is a long climb away and the clock is short. Neither of you can dawdle.',
  difficulty: 3,
  timeLimit: 8.5,
  map: [
    '########################',
    '#....#########.........#',
    '#aa..#########.........#',
    '#----#########........E#',
    '#....#########........E#',
    '#----#########.......###',
    '#....#########.......###',
    '#----#########.....#####',
    '#....#########.....#####',
    '#----........#...#######',
    '#............D...#######',
    '#----........D.#########',
    '#.........S..D.#########',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    D: { type: 'door', when: 'a' },
  },
  signs: [{ col: 18, row: 1.6, text: '8.5 seconds. Plan both runs.' }],
  hints: [
    'Compare the clock with the distances: the climb to the plate and the climb to the exit together barely fit.',
    'Your ghost has to reach the plate as fast as possible — any pause in its recording is a pause you have to wait out later.',
    'Attempt 1: run left and jump straight up the ledges to the plate without stopping, then Loop Now. Attempt 2: wait right at the door; the moment it opens, run and climb the steps to the exit.',
  ],
  intended: 'A fast, clean ghost run to the top-left plate, then an immediate dash through the door and up the terraces.',
  solution: [
    ['go 3', 'jump 3', 'land', 'jump 3', 'land', 'jump 3', 'land', 'jump 3', 'land', 'jump 3', 'land', 'go 1', 'end'],
    ['go 14', 'jump 15', 'land', 'jump 17', 'land', 'jump 19', 'land', 'jump 21', 'land', 'go 22'],
  ],
  parTime: 22,
};
