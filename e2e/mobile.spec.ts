import { expect, test } from '@playwright/test';
import { beginPhase, startFresh, state, waitTicks } from './helpers';

test('touch controls move and jump the player', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: /Start/ }).click();
  // Portrait phones are asked to rotate first; this test plays upright on purpose.
  await page.getByRole('button', { name: 'Play in portrait anyway' }).tap();
  await beginPhase(page);
  await expect(page.getByTestId('touch-controls')).toBeVisible();
  const pad = page.getByTestId('touch-controls');
  const hud = page.getByTestId('hud');
  const targets = [
    ...['Move left', 'Move right', 'Jump', 'Interact', 'Loop Now'].map((name) => pad.getByRole('button', { name, exact: true })),
    ...['Pause', 'Restart Attempt'].map((name) => hud.getByRole('button', { name, exact: true })),
    hud.getByRole('button', { name: /Hints/ }),
  ];
  for (const t of targets) {
    const box = await t.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const s0 = await state(page);
  const right = pad.getByRole('button', { name: 'Move right' });
  await right.dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true });
  await waitTicks(page, 30);
  await right.dispatchEvent('pointerup', { pointerId: 7, isPrimary: true });
  const s1 = await state(page);
  expect(s1.x).toBeGreaterThan(s0.x + 50);

  await pad.getByRole('button', { name: 'Jump' }).tap();
  await waitTicks(page, 12);
  expect((await state(page)).y).toBeLessThan(s1.y - 30);

  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('dialog')).toContainText('Paused');
  // Restart Level lives in the pause menu on small screens.
  await expect(page.getByRole('dialog').getByRole('button', { name: /Restart Level/ })).toBeVisible();
});
