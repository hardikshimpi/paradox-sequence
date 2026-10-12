import { expect, type Page } from '@playwright/test';
import { phaseOf } from '../src/game/phases';

export interface GameState {
  level: number;
  x: number;
  y: number;
  tick: number;
  ghosts: number;
  attempts: number;
  status: string;
  plates: boolean[];
  switches: boolean[];
  paused: boolean;
}

/** Read-only view of the running game, exposed only with ?e2e. */
export async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const c = (window as unknown as { __pastSelf: any }).__pastSelf;
    const w = c.session.world;
    return {
      level: c.session.def.id,
      x: w.player.x,
      y: w.player.y,
      tick: w.tick,
      ghosts: c.session.ghosts.length,
      attempts: c.session.stats.attempts,
      status: c.session.status,
      plates: w.plates.map((p: any) => p.pressed),
      switches: w.switches.map((s: any) => s.on),
      paused: c.isPaused,
    };
  });
}

/** Hold a key until the player's x passes a threshold. */
export async function holdUntilX(page: Page, key: string, cmp: '<' | '>', x: number) {
  await page.keyboard.down(key);
  await page.waitForFunction(
    ([c, v]) => {
      const p = (window as unknown as { __pastSelf: any }).__pastSelf.session.world.player;
      return c === '<' ? p.x < v : p.x > v;
    },
    [cmp, x] as const,
    { timeout: 15_000 },
  );
  await page.keyboard.up(key);
}

export async function waitTicks(page: Page, n: number) {
  const start = (await state(page)).tick;
  await page.waitForFunction((t) => (window as unknown as { __pastSelf: any }).__pastSelf.session.world.tick >= t, start + n);
}

export async function startFresh(page: Page, save?: object) {
  await page.goto('/?e2e');
  await page.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem('paradox-sequence.save.v1', JSON.stringify(s));
  }, save ?? null);
  await page.goto('/?e2e');
  await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible();
}

export const unlockedSave = (unlocked: number) => ({
  version: 1,
  unlocked,
  lastPlayed: unlocked,
  levels: Object.fromEntries(Array.from({ length: unlocked - 1 }, (_, i) => [i + 1, { bestTime: 30, stars: 2, fewestHints: 0 }])),
  settings: { masterVolume: 0, sfxVolume: 0, musicVolume: 0, reducedMotion: true, ghostPaths: true, highContrast: false, touchControls: 'auto', confirmRestartLevel: true },
});

/** The first room of each world opens with a title card that pauses the loop. */
export async function beginPhase(page: Page) {
  const card = page.getByTestId('world-card');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Begin' }).click();
  await expect(card).toBeHidden();
}

/** Main menu → World Map → the level's world → the level itself. */
export async function openLevel(page: Page, id: number) {
  await page.getByRole('button', { name: /World Map/ }).click();
  await expect(page.getByTestId('world-map')).toBeVisible();
  await page.getByTestId(`map-${phaseOf(id).theme}`).click();
  await page.getByTestId(`level-${id}`).click();
}
