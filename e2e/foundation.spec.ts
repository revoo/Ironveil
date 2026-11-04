import { expect, test } from '@playwright/test';
import { Client } from 'colyseus.js';
import { currentHandshake } from '../shared/protocol';

test('browser starts the shared worker and connects to the server', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#worker-status')).toContainText('tick 30 (1.00 s)');
  await expect(page.locator('#server-status')).toContainText('connected · versions match');
  await expect(page.locator('canvas')).toBeVisible();
});

test('server rejects mismatched protocol and content versions', async () => {
  const client = new Client('ws://127.0.0.1:2567');
  await expect(client.joinOrCreate('foundation', { ...currentHandshake(), protocolVersion: -1 })).rejects.toThrow();
  await expect(client.joinOrCreate('foundation', { ...currentHandshake(), contentVersion: -1 })).rejects.toThrow();
  const room = await client.joinOrCreate('foundation', currentHandshake());
  await room.leave();
});


test('driving stops after focus is lost', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('#drive-status');
  await expect(status).toHaveAttribute('data-x', /.+/);
  const initial = Number(await status.getAttribute('data-x'));
  await page.locator('canvas').click();
  await page.keyboard.down('d');
  await expect.poll(async () => Number(await status.getAttribute('data-x'))).toBeGreaterThan(initial + 10);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => Number(await status.getAttribute('data-speed'))).toBe(0);
  const stopped = Number(await status.getAttribute('data-x'));
  await page.waitForTimeout(250);
  expect(Number(await status.getAttribute('data-x'))).toBeCloseTo(stopped, 3);
  await page.keyboard.up('d');
});


test('tap fire damages a target through Worker authority', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('#drive-status');
  await expect(status).toHaveAttribute('data-weapon', 'ready');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');
  await page.mouse.move(box.x + box.width * 350 / 960, box.y + box.height * 272 / 540);
  await page.waitForTimeout(800);
  await page.mouse.down(); await page.mouse.up();
  await expect.poll(async () => Number(await status.getAttribute('data-hits'))).toBe(1);
});
