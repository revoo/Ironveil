import {expect,test} from '@playwright/test';
test('local match starts four tanks, pauses all ticks, and restarts',async({page})=>{
 await page.goto('/');const status=page.locator('#match-status');
 await expect(page.getByRole('button',{name:'Pause'})).toBeVisible();
 await expect(status).toHaveAttribute('data-allies','2');await expect(status).toHaveAttribute('data-total','4');
 await expect.poll(async()=>Number(await status.getAttribute('data-tick'))).toBeGreaterThan(10);
 await page.getByRole('button',{name:'Pause'}).click();await expect(status).toHaveAttribute('data-paused','true');
 const tick=await status.getAttribute('data-tick');await page.waitForTimeout(250);await expect(status).toHaveAttribute('data-tick',tick!);
 await page.getByRole('button',{name:'Resume'}).click();await expect(status).toHaveAttribute('data-paused','false');
 await page.getByRole('button',{name:'Restart match'}).click();await expect(status).toHaveAttribute('data-score','0:0');
 await expect(page.locator('#drive-status')).toHaveAttribute('data-hp','100');
});
test('solo needs no server and visibility loss auto-pauses',async({page})=>{
 await page.route('**/matchmake/**',route=>route.abort());await page.goto('/');
 const status=page.locator('#match-status');await expect(status).toHaveAttribute('data-paused','false');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(status).toHaveAttribute('data-paused','true');
});

test('shared early steps remain close and both runtimes finish a match',async({page})=>{
 const {SoloMatch}=await import('../shared/sim/match');const {relaySmallMap:trainingMap}=await import('../shared/content/relay-yard');
 const match=new SoloMatch(trainingMap,17);const history:number[][][]=[];for(let i=0;i<14400&&match.result===null;i++){match.step();if(i<300)history.push(match.actors.map(a=>[a.x,a.y,a.hull,a.turret,a.hp]));}
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const run=()=>new Promise<{history:number[][][];tick:number;scores:number[];result:number}>(resolve=>{const worker=new Worker('/e2e/solo-scenario.worker.ts',{type:'module'});worker.onmessage=e=>{resolve(e.data);worker.terminate();};worker.postMessage('run');});
  return [await run(),await run()];
 });
 expect(result[0]).toEqual(result[1]); // Same-runtime seeded replay must be reproducible.
 let maxDifference=0;for(let t=0;t<history.length;t++)for(let a=0;a<4;a++)for(let k=0;k<5;k++)maxDifference=Math.max(maxDifference,Math.abs(history[t][a][k]-result[0].history[t][a][k]));expect(maxDifference).toBeLessThan(1e-7);
 expect(result[0].result).not.toBeNull();expect(match.result).not.toBeNull();expect(Math.max(...result[0].scores)).toBeGreaterThanOrEqual(180);
 // Long combat trajectories may diverge across JS runtimes after tiny transcendental rounding differences.

});

test('result presentation shows the final score and Play again resets it',async({page})=>{
 const {SoloMatch}=await import('../shared/sim/match');const {relaySmallMap:trainingMap}=await import('../shared/content/relay-yard');
 const match=new SoloMatch(trainingMap);const initial=match.view(0);match.botsEnabled=false;match.scores=[180,20];match.step();const final=match.view(0);
 // A controlled Worker fixture verifies the presentation contract; rules and real Worker execution are tested separately.
 await page.addInitScript(({initial,final})=>{
  class FixtureWorker {
   onmessage:((event:MessageEvent)=>void)|null=null;
   postMessage(message:{type:string}){const data=message.type==='advance'?{type:'advanced',tick:30,elapsedSeconds:1}:message.type==='start'?{type:'match',observation:final}:message.type==='reset'?{type:'match',observation:initial}:null;if(data)setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data})),0);}
  }
  window.Worker=FixtureWorker as unknown as typeof Worker;
 },{initial,final});
 await page.goto('/');await expect(page.getByRole('region',{name:'Match results'})).toBeVisible();await expect(page.getByRole('heading',{name:'VICTORY'})).toBeVisible();await expect(page.locator('#result-summary')).toContainText('180 — 20');
 await page.getByRole('button',{name:'Play again'}).click();await expect(page.locator('#results')).toBeHidden();await expect(page.locator('#match-status')).toHaveAttribute('data-score','0:0');
});

test('resuming a held Space requires a fresh press after recovery',async({page})=>{
 await page.goto('/');const status=page.locator('#drive-status');await expect(status).toHaveAttribute('data-weapon','ready');
 await page.keyboard.down('Space');await expect(status).toHaveAttribute('data-weapon','charging');
 await page.getByRole('button',{name:'Pause'}).click();await page.getByRole('button',{name:'Resume'}).click();
 await page.waitForTimeout(400);await page.keyboard.down('Space');await page.waitForTimeout(100);
 expect(await status.getAttribute('data-weapon')).toBe('ready');await page.keyboard.up('Space');await page.keyboard.down('Space');await expect(status).toHaveAttribute('data-weapon','charging');await page.keyboard.up('Space');
});

test('Q deploys smoke once, shows its cooldown, and pause freezes its lifetime',async({page})=>{
 await page.goto('/');const status=page.locator('#match-status');await expect(status).toHaveAttribute('data-smokes','0');
 await page.keyboard.press('q');await expect(status).toHaveAttribute('data-smokes','1');await expect.poll(async()=>Number(await status.getAttribute('data-smoke-cooldown'))).toBeGreaterThan(500);
 await page.keyboard.press('q');await expect(status).toHaveAttribute('data-smokes','1');await page.getByRole('button',{name:'Pause'}).click();
 const cooldown=await status.getAttribute('data-smoke-cooldown');await page.waitForTimeout(250);await expect(status).toHaveAttribute('data-smoke-cooldown',cooldown!);
});
