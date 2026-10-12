/** The five themed chapters of the game. Pure data, shared by UI, renderer and tests. */
export type ThemeId = 'echo' | 'foundry' | 'tide' | 'neon' | 'horizon';

export interface Phase {
  id: number;
  name: string;
  tagline: string;
  theme: ThemeId;
  /** Mechanic this phase introduces. */
  introduces: string;
  first: number;
  last: number;
}

export const LEVELS_PER_PHASE = 15;

export const PHASES: Phase[] = [
  { id: 1, name: 'Echo Labs', tagline: 'Where the loop begins.', theme: 'echo', introduces: 'Plates, switches, doors, lifts, keys, lasers, sequences', first: 1, last: 15 },
  { id: 2, name: 'Clockwork Foundry', tagline: 'Belts, shutters and borrowed seconds.', theme: 'foundry', introduces: 'Conveyor belts and timed shutters', first: 16, last: 30 },
  { id: 3, name: 'Drowned Observatory', tagline: 'Springs and gates beneath the tide.', theme: 'tide', introduces: 'Bounce pads and portals', first: 31, last: 45 },
  { id: 4, name: 'Neon Spire', tagline: 'Some walls stop only ghosts — and some only you.', theme: 'neon', introduces: 'Echo screens: cyan stops ghosts, gold stops you', first: 46, last: 60 },
  { id: 5, name: 'Event Horizon', tagline: 'The floor forgets. You must not.', theme: 'horizon', introduces: 'Crumbling floors — and everything at once', first: 61, last: 75 },
];

export function phaseOf(levelId: number): Phase {
  return PHASES.find((p) => levelId >= p.first && levelId <= p.last) ?? PHASES[0];
}
