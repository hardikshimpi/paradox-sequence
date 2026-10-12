import type { LevelDef } from '../types';

export const level05: LevelDef = {
  id: 5,
  name: 'The Locked Route',
  objective: 'The plate is locked away and the key is far. Send yourself on an errand.',
  difficulty: 2,
  timeLimit: 16,
  map: [
    '########################',
    '########################',
    '####...................#',
    '####...................#',
    '####.................k.#',
    '####...........#########',
    '####..............#....#',
    '####.........##...#....#',
    '####.........##...#....#',
    '####.......####...#....#',
    '#..L.......####...D....#',
    '#..L.....######...D..E.#',
    '#aaL..S..######...D..E.#',
    '########################',
  ],
  legend: {
    a: { type: 'plate' },
    L: { type: 'lock', color: 'amber' },
    k: { type: 'key', color: 'amber' },
    D: { type: 'door', when: 'a' },
  },
  signs: [{ col: 8, row: 3, text: 'Keys open matching locks on touch — whoever carries them.' }],
  hints: [
    'The plate that opens the exit door is sealed behind an amber lock. The amber key is up on the high ledge.',
    'Ghosts carry keys and open locks just like you do.',
    'Attempt 1: climb to the key, bring it back to the lock, step onto the plate and Loop Now. Attempt 2: head to the exit door and wait — your ghost unlocks the plate and holds it.',
  ],
  intended: 'Record a run that fetches the key, unlocks the alcove and holds the plate. Next loop, wait at the exit door for the ghost to finish its errand.',
  solution: [
    ['go 8', 'jump 10', 'land', 'jump 12', 'land', 'jump 14', 'land', 'jump 16', 'land', 'go 21', 'go 15', 'go 13', 'land', 'go 4', 'go 1', 'end'],
    ['go 8', 'jump 10', 'land', 'jump 12', 'land', 'jump 14', 'land', 'go 16', 'land', 'go 21'],
  ],
  parTime: 40,
};
