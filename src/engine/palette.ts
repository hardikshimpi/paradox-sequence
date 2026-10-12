import type { KeyColor } from '../game/types';

export const COLORS = {
  bgTop: '#06080f',
  bgBottom: '#0b1022',
  grid: 'rgba(140, 160, 255, 0.06)',
  wall: '#252e57',
  wallEdge: '#3d4a85',
  wallTop: '#6476c2',
  wallInner: '#1d2448',
  ledge: '#4a5a96',
  spike: '#ff4d6d',
  hazard: '#ff3b5c',
  player: '#ffd76a',
  playerDark: '#2b2108',
  text: '#c9d1f2',
  textDim: '#7d87b3',
  exit: '#e8f3ff',
  promptBg: 'rgba(10, 13, 28, 0.88)',
};

/** Signal channels: each plate/switch/sequence gets a colour AND a glyph, so links never rely on colour alone. */
export const CHANNEL_COLORS = ['#3ddbd9', '#ff9f43', '#b18cff', '#9be564', '#ff6fb5', '#5aa9ff', '#f5e663', '#ff7b54'];
export const GLYPHS = ['circle', 'triangle', 'square', 'diamond', 'cross', 'star', 'hex', 'bar'] as const;
export type Glyph = (typeof GLYPHS)[number];

/** Ghost hues avoid the player's gold so the live player always stands out. */
export const GHOST_HUES = [190, 268, 150, 322, 218, 12];
export const ghostColor = (n: number, a = 1): string => `hsla(${GHOST_HUES[(n - 1) % GHOST_HUES.length]}, 85%, 72%, ${a})`;

export const KEY_COLORS: Record<KeyColor, string> = {
  amber: '#ffb020',
  jade: '#3fe0a0',
  rose: '#ff7aa8',
};
