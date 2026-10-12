import type { ThemeId } from '../game/phases';

export interface Theme {
  id: ThemeId;
  bgTop: string;
  bgBottom: string;
  grid: string;
  wall: string;
  wallInner: string;
  wallEdge: string;
  wallTop: string;
  hatch: string;
  ledge: string;
  sign: string;
  /** Backdrop art drawn once into the static layer. */
  backdrop: 'grid' | 'gears' | 'depths' | 'skyline' | 'nebula';
  /** Ambient particles drawn every frame (render-only). */
  ambient: 'dust' | 'embers' | 'bubbles' | 'rain' | 'stars';
  ambientColor: string;
  /** CSS accent for menus and cards. */
  accent: string;
  /** Root chord for the ambient music (Hz). */
  chord: number[];
}

export const THEMES: Record<ThemeId, Theme> = {
  echo: {
    id: 'echo',
    bgTop: '#06080f',
    bgBottom: '#0b1022',
    grid: 'rgba(140,160,255,0.06)',
    wall: '#252e57',
    wallInner: '#1d2448',
    wallEdge: '#3d4a85',
    wallTop: '#6476c2',
    hatch: 'rgba(160,180,255,0.07)',
    ledge: '#6476c2',
    sign: '#7d87b3',
    backdrop: 'grid',
    ambient: 'dust',
    ambientColor: '170,190,255',
    accent: '#7fdcff',
    chord: [55, 82.41, 110, 164.81],
  },
  foundry: {
    id: 'foundry',
    bgTop: '#0f0805',
    bgBottom: '#1e110a',
    grid: 'rgba(255,170,90,0.05)',
    wall: '#3a2717',
    wallInner: '#2b1c10',
    wallEdge: '#6e4524',
    wallTop: '#d08a40',
    hatch: 'rgba(255,190,120,0.07)',
    ledge: '#d08a40',
    sign: '#b08a68',
    backdrop: 'gears',
    ambient: 'embers',
    ambientColor: '255,150,70',
    accent: '#ff9f43',
    chord: [49, 73.42, 98, 146.83],
  },
  tide: {
    id: 'tide',
    bgTop: '#020e14',
    bgBottom: '#05242c',
    grid: 'rgba(90,230,220,0.05)',
    wall: '#0f3a44',
    wallInner: '#0a2c34',
    wallEdge: '#1e6774',
    wallTop: '#5ad8cc',
    hatch: 'rgba(120,240,230,0.07)',
    ledge: '#5ad8cc',
    sign: '#6fa9aa',
    backdrop: 'depths',
    ambient: 'bubbles',
    ambientColor: '160,250,240',
    accent: '#5ad8cc',
    chord: [43.65, 65.41, 87.31, 130.81],
  },
  neon: {
    id: 'neon',
    bgTop: '#0b0414',
    bgBottom: '#1c072d',
    grid: 'rgba(255,90,220,0.05)',
    wall: '#2a1141',
    wallInner: '#1f0b31',
    wallEdge: '#6d2aa1',
    wallTop: '#ff4fd8',
    hatch: 'rgba(255,120,230,0.07)',
    ledge: '#ff4fd8',
    sign: '#a979c2',
    backdrop: 'skyline',
    ambient: 'rain',
    ambientColor: '150,200,255',
    accent: '#ff4fd8',
    chord: [61.74, 92.5, 123.47, 185],
  },
  horizon: {
    id: 'horizon',
    bgTop: '#020106',
    bgBottom: '#0a0616',
    grid: 'rgba(200,180,255,0.045)',
    wall: '#1b1532',
    wallInner: '#130f26',
    wallEdge: '#4b3b8c',
    wallTop: '#cdb9ff',
    hatch: 'rgba(210,190,255,0.06)',
    ledge: '#cdb9ff',
    sign: '#9184b8',
    backdrop: 'nebula',
    ambient: 'stars',
    ambientColor: '230,220,255',
    accent: '#cdb9ff',
    chord: [36.71, 55, 73.42, 110],
  },
};
