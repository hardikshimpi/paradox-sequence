import { expect, test, type Page } from '@playwright/test';
import { beginPhase, openLevel, startFresh, state, unlockedSave, waitTicks } from './helpers';

/** Every visible box must sit inside the viewport. */
async function fitsViewport(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.scrollingElement!;
    return { vw, vh, scrollW: doc.scrollWidth, scrollH: doc.scrollHeight };
  });
}

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.width > b.x && a.y < b.y + b.h && a.y + a.height > b.y;

test('landscape phone: menu, world map and game all fit; controls never cover the room', async ({ page }) => {
  await startFresh(page, unlockedSave(20));
  const size = await fitsViewport(page);
  expect(size.vw).toBeGreaterThan(size.vh);
  // Main menu fits without scrolling.
  expect(size.scrollH).toBeLessThanOrEqual(size.vh + 1);
  for (const name of [/Continue/, /New Game/, /World Map/, /How to Play/, /Settings/]) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.vh);
  }

  // World map: all five worlds on screen and tappable.
  await page.getByRole('button', { name: /World Map/ }).tap();
  for (const w of ['echo', 'foundry', 'tide', 'neon', 'horizon']) {
    const box = await page.getByTestId(`map-${w}`).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.vw);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.vh);
  }
  await page.getByTestId('map-foundry').tap();
  await expect(page.getByRole('tab', { name: /Clockwork Foundry/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('level-18').tap();
  await expect(page.getByTestId('touch-controls')).toBeVisible();

  // HUD lives in the side gutters; nothing interactive overlaps the room.
  const world = await page.evaluate(() => (window as any).__pastSelf.worldBox as { x: number; y: number; w: number; h: number });
  expect(world.h).toBeGreaterThan(size.vh * 0.6);
  const controls = page.locator('[data-testid=touch-controls] button, [data-testid=hud] button, [data-testid=hud] .timer, [data-testid=hud] .chip');
  const count = await controls.count();
  expect(count).toBeGreaterThan(6);
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    if (!box) continue;
    expect(overlaps(box, world), `control ${i} overlaps the room`).toBe(false);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(size.vh);
  }

  // Touch input still drives the player.
  const s0 = await state(page);
  const right = page.getByTestId('touch-controls').getByRole('button', { name: 'Move right' });
  await right.dispatchEvent('pointerdown', { pointerId: 3, isPrimary: true });
  await waitTicks(page, 25);
  await right.dispatchEvent('pointerup', { pointerId: 3, isPrimary: true });
  expect((await state(page)).x).toBeGreaterThan(s0.x + 40);

  // Pause and results fit on a short screen.
  await page.getByRole('button', { name: 'Pause' }).tap();
  const panel = await page.getByRole('dialog').locator('.panel').boundingBox();
  expect(panel!.y).toBeGreaterThanOrEqual(0);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(size.vh);
  await page.getByRole('button', { name: /Resume/ }).tap();
  await page.evaluate(() => (window as any).__pastSelf.devPlaySolution());
  await expect(page.getByTestId('completion')).toBeVisible({ timeout: 20_000 });
  const done = await page.getByTestId('completion').locator('.panel').boundingBox();
  expect(done!.y + done!.height).toBeLessThanOrEqual(size.vh);
  await expect(page.getByRole('button', { name: 'Next Level' })).toBeInViewport();
});

test('portrait phone: the game asks you to rotate and pauses', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 });
  await startFresh(page, unlockedSave(2));
  await openLevel(page, 2);
  await expect(page.getByTestId('rotate-overlay')).toBeVisible();
  const t0 = (await state(page)).tick;
  await page.waitForTimeout(400);
  expect((await state(page)).tick).toBe(t0);
  await page.getByRole('button', { name: 'Play in portrait anyway' }).tap();
  await expect(page.getByTestId('rotate-overlay')).toBeHidden();
  await waitTicks(page, 10);
  // Rotating back to landscape needs no prompt at all.
  await page.setViewportSize({ width: 860, height: 412 });
  await expect(page.getByTestId('rotate-overlay')).toBeHidden();
  await beginPhaseIfAny(page);
});

async function beginPhaseIfAny(page: Page) {
  if (await page.getByTestId('world-card').isVisible().catch(() => false)) await beginPhase(page);
}
