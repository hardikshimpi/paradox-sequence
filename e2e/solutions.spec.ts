import { expect, test } from '@playwright/test';
import { PHASES } from '../src/game/phases';
import { beginPhase, openLevel, startFresh, unlockedSave } from './helpers';

/**
 * Plays every level's verified solution through the real browser game loop:
 * the ghost attempts are recorded instantly, then the final attempt runs in
 * real time with scripted inputs until the results screen appears.
 * One test per world, so worlds run in parallel.
 */
for (const phase of PHASES) {
  test(`${phase.name}: all fifteen levels are solvable in the browser`, async ({ page }) => {
    test.setTimeout(240_000);
    await startFresh(page, unlockedSave(phase.last));
    await openLevel(page, phase.first);
    await beginPhase(page);

    for (let id = phase.first; id <= phase.last; id++) {
      await expect(page.getByTestId('hud')).toContainText(`L${String(id).padStart(2, '0')}`);
      await page.waitForFunction((n) => (window as any).__pastSelf?.session.def.id === n, id);
      await page.evaluate(() => (window as any).__pastSelf.devPlaySolution());
      await expect(page.getByTestId('completion')).toBeVisible({ timeout: 25_000 });
      expect(await page.evaluate(() => (window as any).__pastSelf.session.ghosts.length)).toBeGreaterThan(0);
      if (id < phase.last) await page.getByRole('button', { name: 'Next Level' }).click();
    }

    const completion = page.getByTestId('completion');
    if (phase.id < PHASES.length) {
      await expect(completion).toContainText(`${phase.name} cleared`);
      await completion.getByRole('button', { name: `Enter ${PHASES[phase.id].name}` }).click();
      await expect(page.getByTestId('world-card')).toHaveAttribute('aria-labelledby', 'world-title');
      await expect(page.getByRole('heading', { name: PHASES[phase.id].name })).toBeVisible();
    } else {
      await expect(completion).toContainText('You beat yourself');
    }
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('paradox-sequence.save.v1')!));
    for (let id = phase.first; id <= phase.last; id++) expect(save.levels[id], `level ${id} saved`).toBeTruthy();
  });
}
