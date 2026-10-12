import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  LEVEL_COUNT,
  SAVE_KEY,
  clearProgress,
  computeStars,
  continueLevel,
  defaultSave,
  hasProgress,
  loadSave,
  recordCompletion,
  validateSave,
  writeSave,
} from './save';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe('save system', () => {
  it('starts fresh when nothing is saved', () => {
    const save = loadSave(new MemoryStorage());
    expect(save).toEqual(defaultSave());
    expect(save.unlocked).toBe(1);
    expect(hasProgress(save)).toBe(false);
  });

  it('saves and restores progress, best times, stars and settings', () => {
    const store = new MemoryStorage();
    let save = defaultSave();
    save = recordCompletion(save, 1, 12.5, 3, 0);
    save = recordCompletion(save, 2, 30, 2, 1);
    save = { ...save, settings: { ...save.settings, musicVolume: 0.1, reducedMotion: true, touchControls: 'on' } };
    expect(writeSave(save, store)).toBe(true);
    const loaded = loadSave(store);
    expect(loaded).toEqual(save);
    expect(loaded.unlocked).toBe(3);
    expect(loaded.levels[1]).toEqual({ bestTime: 12.5, stars: 3, fewestHints: 0 });
    expect(loaded.settings.reducedMotion).toBe(true);
  });

  it('keeps the best time and best star rating across replays', () => {
    let save = recordCompletion(defaultSave(), 4, 40, 2, 1);
    save = recordCompletion(save, 4, 55, 1, 3);
    expect(save.levels[4]).toEqual({ bestTime: 40, stars: 2, fewestHints: 1 });
    save = recordCompletion(save, 4, 20, 3, 0);
    expect(save.levels[4]).toEqual({ bestTime: 20, stars: 3, fewestHints: 0 });
  });

  it('picks up a save written under the earlier game name', () => {
    const store = new MemoryStorage();
    const old = recordCompletion(defaultSave(), 1, 12, 3, 0);
    store.setItem('past-self-enemy.save.v1', JSON.stringify(old));
    expect(loadSave(store)).toEqual(old);
    store.setItem(SAVE_KEY, JSON.stringify(defaultSave()));
    expect(loadSave(store)).toEqual(defaultSave());
  });

  it('survives corrupted JSON', () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadSave(store)).toEqual(defaultSave());
  });

  it('salvages valid parts of malformed data and clamps values', () => {
    const save = validateSave({
      version: 1,
      unlocked: 99,
      lastPlayed: -4,
      levels: { 1: { bestTime: 10, stars: 7, fewestHints: -2 }, 2: 'junk', 400: { bestTime: 3, stars: 3 }, 3: { bestTime: -1, stars: 2 } },
      settings: { masterVolume: 5, sfxVolume: 'loud', reducedMotion: 'yes', touchControls: 'sometimes', ghostPaths: false },
    });
    expect(save.unlocked).toBe(LEVEL_COUNT);
    expect(save.lastPlayed).toBe(1);
    expect(Object.keys(save.levels)).toEqual(['1']);
    expect(save.levels[1]).toEqual({ bestTime: 10, stars: 3, fewestHints: 0 });
    expect(save.settings.masterVolume).toBe(1);
    expect(save.settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(save.settings.reducedMotion).toBe(false);
    expect(save.settings.touchControls).toBe('auto');
    expect(save.settings.ghostPaths).toBe(false);
  });

  it('rejects unknown versions and non-objects', () => {
    expect(validateSave(null)).toEqual(defaultSave());
    expect(validateSave([1, 2])).toEqual(defaultSave());
    expect(validateSave({ version: 2, unlocked: 9 })).toEqual(defaultSave());
  });

  it('unlocks at least one past the highest completed level', () => {
    const save = validateSave({ version: 1, unlocked: 1, levels: { 5: { bestTime: 9, stars: 2, fewestHints: 0 } } });
    expect(save.unlocked).toBe(6);
  });

  it('handles storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    expect(loadSave(broken)).toEqual(defaultSave());
    expect(writeSave(defaultSave(), broken)).toBe(false);
    expect(loadSave(null)).toEqual(defaultSave());
  });

  it('Continue resumes the last unfinished level, else the highest unlocked', () => {
    let save = recordCompletion(defaultSave(), 1, 10, 3, 0);
    save = recordCompletion(save, 2, 10, 3, 0);
    expect(continueLevel(save)).toBe(3);
    expect(continueLevel({ ...save, lastPlayed: 3 })).toBe(3);
    expect(continueLevel({ ...save, lastPlayed: 1 })).toBe(3);
  });

  it('New Game clears progress but keeps settings', () => {
    let save = recordCompletion(defaultSave(), 1, 10, 3, 0);
    save = { ...save, settings: { ...save.settings, sfxVolume: 0.2 } };
    const fresh = clearProgress(save);
    expect(fresh.unlocked).toBe(1);
    expect(fresh.levels).toEqual({});
    expect(fresh.settings.sfxVolume).toBe(0.2);
  });

  it('awards stars for par time and hint usage', () => {
    expect(computeStars(10, 20, 0)).toBe(3);
    expect(computeStars(30, 20, 0)).toBe(2);
    expect(computeStars(10, 20, 1)).toBe(2);
    expect(computeStars(10, 20, 3)).toBe(1);
    expect(computeStars(30, 20, 3)).toBe(1);
  });
});
