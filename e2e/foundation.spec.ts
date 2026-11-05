import { expect, test } from '@playwright/test';
import { Client } from 'colyseus.js';
import { currentHandshake } from '../shared/protocol';

test('browser starts the shared worker and connects to the server', async ({ page }) => {
  await page.goto('/?range=1&diagnostics=1');
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
  await page.goto('/?range=1');
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


test('Space tap damages a target through Worker authority', async ({ page }) => {
  await page.goto('/?range=1');
  const status = page.locator('#drive-status');
  await expect(status).toHaveAttribute('data-weapon', 'ready');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');
  await page.mouse.move(box.x + box.width * 350 / 960, box.y + box.height * 272 / 540);
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await expect.poll(async () => Number(await status.getAttribute('data-hits'))).toBe(1);
});


test('Space holds charge, right click cancels, and left click does not fire', async ({ page }) => {
  await page.goto('/?range=1');
  const status = page.locator('#drive-status');
  await expect(status).toHaveAttribute('data-weapon', 'ready');
  await page.locator('canvas').click();
  await page.waitForTimeout(100);
  await expect(status).toHaveAttribute('data-weapon', 'ready');
  await page.keyboard.down('Space');
  await expect(status).toHaveAttribute('data-weapon', 'charging');
  // Latch the short Worker-confirmed transition: a slow CI frame can skip its visual window.
  await status.evaluate(element=>{
    const status=element as HTMLElement;status.dataset.observedCancel='false';
    const observer=new MutationObserver(()=>{if(status.dataset.weapon==='cancel recovery'){status.dataset.observedCancel='true';observer.disconnect();}});
    observer.observe(status,{attributes:true,attributeFilter:['data-weapon']});
  });
  await page.locator('canvas').click({ button: 'right' });
  await expect(status).toHaveAttribute('data-observed-cancel', 'true');
  await page.keyboard.up('Space');
  await expect(status).toHaveAttribute('data-weapon', 'ready');
  await expect(status).toHaveAttribute('data-recoil-kicks', '0');
  await expect(status).toHaveAttribute('data-hits', '0');
});

test('range reset clears damage and toggled incoming training fire', async ({ page }) => {
  await page.goto('/?range=1');
  const status = page.locator('#drive-status');
  await expect(status).toHaveAttribute('data-hp','100');
  await page.keyboard.press('t');
  await expect(status).toHaveAttribute('data-incoming','true');
  await expect.poll(async()=>Number(await status.getAttribute('data-hp')), {timeout:8000}).toBeLessThan(100);
  await page.keyboard.press('r');
  await expect(status).toHaveAttribute('data-hp','100');
  await expect(status).toHaveAttribute('data-incoming','false');
  await expect(status).toHaveAttribute('data-x','160');
});

test('sound unlocks on interaction and mute can be toggled', async ({page}) => {
 await page.goto('/?range=1'); const status=page.locator('#drive-status');
 await page.locator('canvas').click();
 await expect(status).toHaveAttribute('data-audio-ready','true');
 await page.keyboard.press('m'); await expect(status).toHaveAttribute('data-muted','true');
 await page.keyboard.press('m'); await expect(status).toHaveAttribute('data-muted','false');
});
test('losing focus while charging cancels without firing', async ({page}) => {
 await page.goto('/?range=1'); const status=page.locator('#drive-status');
 await expect(status).toHaveAttribute('data-weapon','ready'); await page.keyboard.down('Space');
 await expect(status).toHaveAttribute('data-weapon','charging');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await page.keyboard.up('Space'); await expect(status).toHaveAttribute('data-weapon','ready');
 await expect(status).toHaveAttribute('data-hits','0');
});
