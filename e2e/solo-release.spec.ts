import {expect,test} from '@playwright/test';
test('scoreboard uses authorized team facts, supports hold/release and clears on blur',async({page})=>{
 await page.goto('/');await expect(page.locator('#match-status')).toHaveAttribute('data-allies','2');await expect(page.locator('#drive-status')).toHaveAttribute('data-ally-sprites','1');await page.locator('canvas').click();await page.keyboard.down('Tab');await expect(page.getByRole('region',{name:'Scoreboard',exact:true})).toBeVisible();await expect(page.locator('#scoreboard')).toContainText('Blue');await expect(page.locator('#scoreboard')).toContainText('First to 15');
 await page.keyboard.up('Tab');await expect(page.locator('#scoreboard')).toBeHidden();await page.keyboard.down('Tab');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('#scoreboard')).toBeHidden();await page.keyboard.up('Tab');
});
test('fullscreen keeps the same logical viewport and can be exited',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.id)).toBe('game');await expect(page.locator('canvas')).toHaveAttribute('width','960');await expect(page.locator('canvas')).toHaveAttribute('height','540');await page.evaluate(()=>document.exitFullscreen());await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
});
test('music controls persist separately from effects volume',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Music volume',{exact:true}).fill('0');await page.getByLabel('Effects volume',{exact:true}).fill('0.7');await page.getByRole('button',{name:'Save settings'}).click();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Music volume',{exact:true})).toHaveValue('0');await expect(page.getByLabel('Effects volume',{exact:true})).toHaveValue('0.7');
});
test('graphics context loss pauses authority and offers reload recovery',async({page})=>{
 await page.goto('/');await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','ready');await page.evaluate(()=>{const c=document.querySelector('canvas')!;const gl=c.getContext('webgl')??c.getContext('webgl2');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)throw new Error('Context-loss extension unavailable');ext.loseContext();});await expect(page.locator('#session-error')).toBeVisible();await expect(page.locator('#match-status')).toHaveAttribute('data-paused','true');await page.getByRole('button',{name:'Reload game'}).click();await expect(page.locator('#session-error')).toBeHidden();await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','ready');
});

test('Tab navigates page controls until the battlefield has keyboard focus',async({page})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeFocused();await expect(page.locator('#drive-status')).toHaveAttribute('data-ally-sprites','1');await page.locator('canvas').click();await page.keyboard.down('Tab');await expect(page.locator('#scoreboard')).toBeVisible();await page.keyboard.up('Tab');
});
