import {expect,test} from '@playwright/test';
test('settings pause play, persist accessibility and remapped fire, and apply difficulty on restart',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog',{name:'Settings'})).toBeVisible();await expect(page.locator('#match-status')).toHaveAttribute('data-paused','true');
 await page.getByLabel('Difficulty',{exact:true}).selectOption('easy');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByLabel('Low effects',{exact:true}).check();await page.getByLabel('Text size',{exact:true}).selectOption('1.25');
 await page.getByLabel('Fire key',{exact:true}).press('f');await page.getByRole('button',{name:'Save settings'}).click();await page.getByRole('button',{name:'Close settings'}).click();await page.getByRole('button',{name:'Restart match',exact:true}).click();await expect(page.locator('#match-status')).toHaveAttribute('data-difficulty','easy');
 await page.keyboard.press('Space');await page.waitForTimeout(100);expect(await page.locator('#drive-status').getAttribute('data-weapon')).toBe('ready');await page.keyboard.down('f');await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','charging');await page.keyboard.up('f');
 await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Reduced motion',{exact:true})).toBeChecked();await expect(page.getByLabel('Fire key',{exact:true})).toHaveValue('F');
});
test('guided training starts, requires actual driving, and can be restarted or skipped',async({page})=>{
 await page.goto('/?tutorial=1');await expect(page.locator('#lesson-title')).toContainText('Drive and turn');await page.waitForTimeout(150);await expect(page.locator('#lesson-title')).toContainText('Drive and turn');
 await page.keyboard.down('s');await page.waitForTimeout(800);await page.keyboard.up('s');await expect(page.locator('#lesson-title')).toContainText('Aim independently');
 await page.getByRole('button',{name:'Restart training',exact:true}).click();await expect(page.locator('#lesson-title')).toContainText('Drive and turn');await page.getByRole('link',{name:'Skip / return to solo'}).click();await expect(page.locator('#tutorial-panel')).toBeHidden();
});

test('guided training can be completed through all nine actual exercises',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:1000});await page.goto('/?tutorial=1');
 const lesson=page.locator('#lesson-title'),canvas=page.locator('canvas');const aim=async(x:number,y:number)=>{await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();if(!box)throw new Error('No battlefield');await page.mouse.move(box.x+x/960*box.width,box.y+y/540*box.height);};
 await expect(lesson).toContainText('Drive and turn');await page.keyboard.down('s');await page.waitForTimeout(800);await page.keyboard.up('s');await expect(lesson).toContainText('Aim independently');
 await aim(20,20);await expect(lesson).toContainText('Tap fire');await aim(280,272);await page.waitForTimeout(1000);await page.keyboard.press('Space');await expect(lesson).toContainText('Charge and cancel');
 await aim(580,270);const status=page.locator('#drive-status');await expect.poll(async()=>Math.abs(Number(await status.getAttribute('data-barrel')))).toBeLessThan(.05);await page.keyboard.down('Space');await expect(status).toHaveAttribute('data-weapon','charging');await page.keyboard.press('c');await expect(status).toHaveAttribute('data-weapon','cancel recovery');await page.keyboard.up('Space');await expect(status).toHaveAttribute('data-weapon','ready');await page.keyboard.down('Space');await expect.poll(async()=>Number(await status.getAttribute('data-charge'))).toBeGreaterThanOrEqual(.8);await page.keyboard.up('Space');await expect(lesson).toContainText('Read mud evidence');
 await page.keyboard.down('d');await page.waitForTimeout(1000);await page.keyboard.up('d');await expect(lesson).toContainText('Use brush');await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');await expect(lesson).toContainText('Approach quietly');
 await page.keyboard.down('Shift');await page.keyboard.down('d');await page.waitForTimeout(800);await page.keyboard.up('d');await page.keyboard.up('Shift');await expect(lesson).toContainText('Smoke escape');await page.keyboard.press('q');await page.keyboard.down('d');await page.waitForTimeout(1600);await page.keyboard.up('d');await expect(lesson).toContainText('Earn a team kill');
 await aim(580,270);await expect.poll(async()=>Math.abs(Number(await status.getAttribute('data-barrel')))).toBeLessThan(.05);await page.keyboard.press('Space');await expect(lesson).toContainText('Training complete');
});

test('a Worker failure presents a visible recovery action',async({page})=>{
 await page.addInitScript(()=>{class FailedWorker{onerror:((e:Event)=>void)|null=null;postMessage(){setTimeout(()=>this.onerror?.(new Event('error')),0);}}window.Worker=FailedWorker as unknown as typeof Worker;});
 await page.goto('/');await expect(page.locator('#session-error')).toBeVisible();await expect(page.getByRole('button',{name:'Reload game'})).toBeEnabled();
});

test('opening Settings during Worker startup keeps the new match paused',async({page})=>{
 await page.addInitScript(()=>{const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{postMessage(message:{type:string}){if(message.type==='start')setTimeout(()=>super.postMessage(message),1500);else super.postMessage(message);}} as typeof Worker;});
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog',{name:'Settings'})).toBeVisible();await expect(page.locator('#match-status')).toHaveAttribute('data-paused','true');
});

test('aim remains aligned with the cursor when interface layout moves the canvas',async({page})=>{
 await page.goto('/');const canvas=page.locator('canvas');await expect(page.locator('#drive-status')).toHaveAttribute('data-weapon','ready');await page.waitForTimeout(600);
 await page.evaluate(()=>{document.querySelector<HTMLElement>('#game')!.style.marginTop='80px';});
 const box=await canvas.boundingBox();if(!box)throw new Error('No canvas');await page.mouse.move(box.x+700/960*box.width,box.y+270/540*box.height);
 await expect.poll(async()=>Math.abs(Number(await page.locator('#drive-status').getAttribute('data-barrel')))).toBeLessThan(.03);
});
