import {expect,test} from '@playwright/test';
test('production boots, accepts input and pauses across desktop engines',async({page})=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/');await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true');await page.locator('canvas').click({position:{x:300,y:250}});await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');await expect.poll(async()=>Number(await page.locator('#drive-status').getAttribute('data-x'))).toBeGreaterThan(180);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.locator('#match-status')).toHaveAttribute('data-paused','true');
 expect(errors).toEqual([]);
});
test('production range remains local even when legacy diagnostics are requested',async({page})=>{
 const sockets:string[]=[];page.on('websocket',s=>sockets.push(s.url()));await page.goto('http://127.0.0.1:4173/?range=1&diagnostics=1');await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','ready');await expect(page.locator('#server-status')).toContainText('entirely on this device');expect(sockets).toEqual([]);
});

test('cached production reloads with offline emulation',async({page,context,browserName})=>{
 test.skip(browserName==='webkit','Playwright WebKit offline navigation bug: github.com/microsoft/playwright/issues/42775');
 await page.goto('http://127.0.0.1:4173/');await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true');await context.setOffline(true);await page.reload();await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','ready');await expect(page.locator('#session-error')).toBeHidden();
});
