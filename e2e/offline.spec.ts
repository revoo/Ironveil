import {chromium,expect,test} from '@playwright/test';
const releaseURL=process.env.IRONVEIL_RELEASE_URL??'http://127.0.0.1:4173/';
test('production solo survives a full browser shutdown and restart with networking disabled',async({},info)=>{
 const profile=info.outputPath('offline-profile');let context=await chromium.launchPersistentContext(profile,{headless:true});
 try{let page=await context.newPage();await page.goto(releaseURL);await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true',{timeout:20000});await context.close();
 context=await chromium.launchPersistentContext(profile,{headless:true,offline:true});page=await context.newPage();await page.goto(releaseURL);await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true');await expect.poll(async()=>Number(await page.locator('#match-status').getAttribute('data-tick'))).toBeGreaterThan(15);await expect(page.locator('canvas')).toBeVisible();await page.locator('canvas').click();await expect(page.locator('#drive-status')).toHaveAttribute('data-audio-ready','true');const x=Number(await page.locator('#drive-status').getAttribute('data-x'));await page.keyboard.down('d');await expect.poll(async()=>Number(await page.locator('#drive-status').getAttribute('data-x'))).toBeGreaterThan(x+10);await page.keyboard.up('d');
 }finally{await context.close();}
});
test('missing cached Worker content is detected and can be restored online',async({browser})=>{
 const context=await browser.newContext();try{const page=await context.newPage();await page.goto(releaseURL);await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true',{timeout:20000});
 await page.evaluate(async()=>{for(const name of await caches.keys())if(name.startsWith('ironveil-shell-')){const cache=await caches.open(name);for(const key of await cache.keys())if(key.url.includes('/assets/worker-'))await cache.delete(key);}window.dispatchEvent(new Event('offline'));});
 await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','false');await page.getByRole('button',{name:'Restore offline assets'}).click();await expect(page.locator('#offline-status')).toHaveAttribute('data-ready','true');
 }finally{await context.close();}
});

test('an uncached first visit requires connectivity',async({browser})=>{const context=await browser.newContext({offline:true});try{const page=await context.newPage();await expect(page.goto(releaseURL)).rejects.toThrow();}finally{await context.close();}});
