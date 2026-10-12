export const SAVE_KEY = 'paradox-sequence.save.v1';
/** Saves written under the game's earlier name; read once if no current save exists. */
export const LEGACY_SAVE_KEYS = ['past-self-enemy.save.v1'];
import { LEVELS } from '../game/levels';

export const LEVEL_COUNT = LEVELS.length;

export type TouchMode = 'auto' | 'on' | 'off';

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  /** Disables particles, bobbing, screen shake and flicker. */
  reducedMotion: boolean;
  /** Draw each ghost's original route. */
  ghostPaths: boolean;
  /** Stronger outlines and opaque ghosts. */
  highContrast: boolean;
  touchControls: TouchMode;
  /** Ask before Restart Level wipes the ghosts. */
  confirmRestartLevel: boolean;
}

export interface LevelRecord {
  bestTime: number;
  stars: 1 | 2 | 3;
  fewestHints: number;
}

export interface SaveData {
  version: 1;
  /** Highest unlocked level id (1-based). */
  unlocked: number;
  /** Most recently played level id. */
  lastPlayed: number;
  levels: Record<number, LevelRecord>;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.4,
  reducedMotion: false,
  ghostPaths: true,
  highContrast: false,
  touchControls: 'auto',
  confirmRestartLevel: true,
};

export function defaultSave(): SaveData {
  return { version: 1, unlocked: 1, lastPlayed: 1, levels: {}, settings: { ...DEFAULT_SETTINGS } };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // e.g. storage blocked by privacy settings
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const int = (v: unknown, min: number, max: number, fallback: number): number => Math.round(num(v, min, max, fallback));
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export function validateSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isObj(raw)) return { ...d };
  return {
    masterVolume: num(raw.masterVolume, 0, 1, d.masterVolume),
    sfxVolume: num(raw.sfxVolume, 0, 1, d.sfxVolume),
    musicVolume: num(raw.musicVolume, 0, 1, d.musicVolume),
    reducedMotion: bool(raw.reducedMotion, d.reducedMotion),
    ghostPaths: bool(raw.ghostPaths, d.ghostPaths),
    highContrast: bool(raw.highContrast, d.highContrast),
    touchControls: raw.touchControls === 'on' || raw.touchControls === 'off' || raw.touchControls === 'auto' ? raw.touchControls : d.touchControls,
    confirmRestartLevel: bool(raw.confirmRestartLevel, d.confirmRestartLevel),
  };
}

/** Accepts anything; returns a well-formed save, salvaging whatever is valid. */
export function validateSave(raw: unknown): SaveData {
  const save = defaultSave();
  if (!isObj(raw) || raw.version !== 1) return save;
  save.settings = validateSettings(raw.settings);
  if (isObj(raw.levels)) {
    for (const [k, v] of Object.entries(raw.levels)) {
      const id = Number(k);
      if (!Number.isInteger(id) || id < 1 || id > LEVEL_COUNT || !isObj(v)) continue;
      const bestTime = num(v.bestTime, 0, 1e7, -1);
      if (bestTime <= 0) continue;
      save.levels[id] = {
        bestTime,
        stars: int(v.stars, 1, 3, 1) as 1 | 2 | 3,
        fewestHints: int(v.fewestHints, 0, 3, 3),
      };
    }
  }
  const highestCompleted = Math.max(0, ...Object.keys(save.levels).map(Number));
  save.unlocked = Math.max(int(raw.unlocked, 1, LEVEL_COUNT, 1), Math.min(LEVEL_COUNT, highestCompleted + 1));
  save.lastPlayed = int(raw.lastPlayed, 1, save.unlocked, 1);
  return save;
}

export function loadSave(storage: StorageLike | null = browserStorage()): SaveData {
  if (!storage) return defaultSave();
  let text: string | null = null;
  try {
    text = storage.getItem(SAVE_KEY);
    for (const key of LEGACY_SAVE_KEYS) text ??= storage.getItem(key);
  } catch {
    return defaultSave();
  }
  if (!text) return defaultSave();
  try {
    return validateSave(JSON.parse(text));
  } catch {
    return defaultSave(); // corrupted JSON
  }
}

export function writeSave(data: SaveData, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // quota exceeded or storage disabled
  }
}

export function clearProgress(save: SaveData): SaveData {
  return { ...defaultSave(), settings: { ...save.settings } };
}

/** 3 stars: no hints and within par. Each hint tier used or a slow finish costs a star (minimum 1). */
export function computeStars(timeSeconds: number, parSeconds: number, hintsUsed: number): 1 | 2 | 3 {
  let stars = 3;
  if (hintsUsed > 0) stars--;
  if (hintsUsed >= 3) stars--;
  if (timeSeconds > parSeconds) stars--;
  return Math.max(1, stars) as 1 | 2 | 3;
}

export function recordCompletion(save: SaveData, levelId: number, timeSeconds: number, stars: 1 | 2 | 3, hintsUsed: number): SaveData {
  const prev = save.levels[levelId];
  const levels = {
    ...save.levels,
    [levelId]: {
      bestTime: prev ? Math.min(prev.bestTime, timeSeconds) : timeSeconds,
      stars: (prev ? Math.max(prev.stars, stars) : stars) as 1 | 2 | 3,
      fewestHints: prev ? Math.min(prev.fewestHints, hintsUsed) : hintsUsed,
    },
  };
  return { ...save, levels, unlocked: Math.min(LEVEL_COUNT, Math.max(save.unlocked, levelId + 1)), lastPlayed: levelId };
}

/** Level that "Continue" resumes: the last level played if it is unfinished, otherwise the highest unlocked. */
export function continueLevel(save: SaveData): number {
  if (save.lastPlayed <= save.unlocked && !save.levels[save.lastPlayed]) return save.lastPlayed;
  return save.unlocked;
}

export function hasProgress(save: SaveData): boolean {
  return save.unlocked > 1 || Object.keys(save.levels).length > 0 || save.lastPlayed > 1;
}
