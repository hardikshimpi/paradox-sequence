import { expect, test } from '@playwright/test';
import { beginPhase, holdUntilX, openLevel, startFresh, state, unlockedSave, waitTicks } from './helpers';

test.describe('main menu', () => {
  test('every menu button works', async ({ page }) => {
    await startFresh(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Paradox Sequence');

    await page.getByRole('button', { name: /How to Play/ }).click();
    await expect(page.getByRole('heading', { name: 'How to Play' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    await page.getByRole('button', { name: /^Settings/ }).click();
    const music = page.getByLabel('Ambient music');
    await music.fill('20');
    await page.getByRole('switch', { name: 'High contrast' }).click();
    await expect(page.getByRole('switch', { name: 'High contrast' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Back' }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('paradox-sequence.save.v1')!));
    expect(saved.settings.musicVolume).toBe(0.2);
    expect(saved.settings.highContrast).toBe(true);

    await page.getByRole('button', { name: /World Map/ }).click();
    await expect(page.getByTestId('world-map')).toBeVisible();
    for (const w of ['echo', 'foundry', 'tide', 'neon', 'horizon']) await expect(page.getByTestId(`map-${w}`)).toBeVisible();
    await expect(page.getByTestId('map-foundry')).toHaveAttribute('aria-label', /sealed/);
    await page.getByTestId('map-echo').click();
    await expect(page.getByRole('tab', { name: /Echo Labs/ })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: /Event Horizon/ }).click();
    await expect(page.getByRole('heading', { name: 'Event Horizon' })).toBeVisible();
    await expect(page.getByTestId('level-75')).toBeDisabled();
    await page.getByRole('tab', { name: /Echo Labs/ }).click();
    await expect(page.getByTestId('level-1')).toBeEnabled();
    await expect(page.getByTestId('level-2')).toBeDisabled();
    await expect(page.getByTestId('level-15')).toBeDisabled();
    await page.getByTestId('level-1').click();
    await beginPhase(page);
    await expect(page.getByTestId('hud')).toBeVisible();
  });

  test('New Game asks before erasing progress', async ({ page }) => {
    await startFresh(page, unlockedSave(5));
    await expect(page.getByRole('button', { name: /Continue/ })).toContainText('The Locked Route');
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.getByRole('dialog')).toContainText('Start a new game?');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: /Continue/ })).toContainText('The Locked Route');
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.getByRole('button', { name: 'Erase progress' }).click();
    await beginPhase(page);
    await expect(page.getByTestId('hud')).toContainText('L01');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('paradox-sequence.save.v1')!));
    expect(saved.unlocked).toBe(1);
  });
});

test.describe('gameplay', () => {
  test('starts, counts down, moves and jumps', async ({ page }) => {
    await startFresh(page);
    await page.getByRole('button', { name: /Start/ }).click();
    await beginPhase(page);
    await expect(page.getByTestId('hud')).toBeVisible();
    const s0 = await state(page);
    await waitTicks(page, 30);
    const timer = await page.getByTestId('timer').textContent();
    expect(parseFloat(timer!)).toBeLessThan(10);

    await holdUntilX(page, 'ArrowRight', '>', s0.x + 60);
    const s1 = await state(page);
    expect(s1.x).toBeGreaterThan(s0.x + 60);

    await page.keyboard.press('Space');
    await waitTicks(page, 10);
    expect((await state(page)).y).toBeLessThan(s1.y - 30);
  });

  test('records a ghost, restarts the attempt, restarts the level', async ({ page }) => {
    await startFresh(page);
    await page.getByRole('button', { name: /Start/ }).click();
    await beginPhase(page);
    await holdUntilX(page, 'ArrowLeft', '<', 60);
    expect((await state(page)).plates).toEqual([true]);

    await page.keyboard.press('t'); // Loop Now
    await expect(page.getByTestId('ghost-count')).toContainText('1/6');
    expect((await state(page)).ghosts).toBe(1);

    await waitTicks(page, 20);
    const before = await state(page);
    await page.keyboard.press('r'); // Restart Attempt keeps ghosts
    await page.waitForFunction((a) => (window as any).__pastSelf.session.stats.attempts > a, before.attempts);
    const after = await state(page);
    expect(after.ghosts).toBe(1);
    expect(after.tick).toBeLessThan(before.tick);

    await page.getByRole('button', { name: 'Restart Level' }).click();
    await expect(page.getByRole('dialog')).toContainText('Restart Level?');
    await page.getByRole('button', { name: 'Clear ghosts & restart' }).click();
    await expect(page.getByTestId('ghost-count')).toContainText('0/6');
    expect((await state(page)).ghosts).toBe(0);
  });

  test('interacts with a switch', async ({ page }) => {
    await startFresh(page, unlockedSave(3));
    await openLevel(page, 3);
    await expect(page.getByTestId('hud')).toContainText('L03');
    // Climb the four one-way ledges, then walk to the switch and press Interact.
    for (let i = 0; i < 4; i++) {
      const y = (await state(page)).y;
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction((y0) => {
        const p = (window as any).__pastSelf.session.world.player;
        return p.grounded && p.y < y0 - 40;
      }, y);
    }
    await holdUntilX(page, 'ArrowRight', '>', 395);
    expect((await state(page)).switches).toEqual([false]);
    await page.keyboard.press('e');
    await waitTicks(page, 2);
    expect((await state(page)).switches).toEqual([true]);
  });

  test('pause menu and hints do not reset the puzzle', async ({ page }) => {
    await startFresh(page);
    await page.getByRole('button', { name: /Start/ }).click();
    await beginPhase(page);
    await holdUntilX(page, 'ArrowRight', '>', 300);
    const s = await state(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toContainText('Paused');
    expect((await state(page)).paused).toBe(true);
    await page.getByRole('button', { name: 'Controls' }).click();
    await expect(page.getByRole('dialog')).toContainText('Restart Level');
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: /Resume/ }).click();

    await page.keyboard.press('h');
    await page.getByRole('button', { name: 'Reveal hint 1' }).click();
    await expect(page.getByTestId('hint-1')).toBeVisible();
    await page.getByRole('button', { name: 'Back to puzzle' }).click();
    const after = await state(page);
    expect(after.attempts).toBe(s.attempts);
    expect(after.tick).toBeGreaterThanOrEqual(s.tick);
    await expect(page.getByRole('button', { name: /Hints, 1 of 3 used/ })).toBeVisible();
  });

  test('completes level 1, shows results, advances and remembers progress', async ({ page }) => {
    await startFresh(page);
    await page.getByRole('button', { name: /Start/ }).click();
    await beginPhase(page);
    await holdUntilX(page, 'ArrowLeft', '<', 60);
    await page.keyboard.press('t');
    await expect(page.getByTestId('ghost-count')).toContainText('1/6');
    await waitTicks(page, 5);
    await page.keyboard.down('ArrowRight');
    await expect(page.getByTestId('completion')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.up('ArrowRight');
    await expect(page.getByTestId('completion')).toContainText('The First Loop');
    await expect(page.getByTestId('complete-time')).toHaveText(/\d:\d\d\.\d/);
    await expect(page.getByTestId('completion')).toContainText('Hints used');

    await page.getByRole('button', { name: 'Next Level' }).click();
    await expect(page.getByTestId('hud')).toContainText('L02');
    expect((await state(page)).level).toBe(2);

    await page.reload();
    await expect(page.getByRole('button', { name: /Continue/ })).toContainText('Hold the Door');
    await page.getByRole('button', { name: /World Map/ }).click();
    await page.getByTestId('map-echo').click();
    await expect(page.getByTestId('level-1')).toHaveAttribute('aria-label', /completed, [123] stars/);
    await expect(page.getByTestId('level-2')).toBeEnabled();
    await expect(page.getByTestId('level-3')).toBeDisabled();
  });
});
