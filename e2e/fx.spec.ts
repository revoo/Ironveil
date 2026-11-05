import {expect,test,type Page} from '@playwright/test';
async function scene(page:Page,reduced=false){
 const {SoloMatch}=await import('../shared/sim/match');const {relaySmallMap}=await import('../shared/content/relay-yard');const o=new SoloMatch(relaySmallMap).view(0);o.events=[];
 await page.addInitScript(({o,reduced})=>{
  localStorage.setItem('ironveil-settings-v1',JSON.stringify({muted:true,reducedMotion:reduced,lowEffects:reduced}));
  class Fixture{onmessage:((e:MessageEvent)=>void)|null=null;constructor(){window.addEventListener('fx-burst',()=>{o.events=[{id:1,kind:'destruction',x:320,y:272,charge:1}];o.smokes=[{id:1,x:400,y:330,expires:180}];this.send();});window.addEventListener('fx-hide',()=>{o.events=[];o.ground=[];o.enemies=[];o.smokes=[];this.send();});window.addEventListener('fx-pause',()=>{o.paused=true;this.send();});}private send(){this.onmessage?.(new MessageEvent('message',{data:{type:'match',observation:o}}));}postMessage(m:{type:string}){if(m.type==='advance')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'advanced',tick:30,elapsedSeconds:1}})),0);else this.send();}}
  window.Worker=Fixture as unknown as typeof Worker;
 },{o,reduced});await page.goto('/');await expect(page.locator('#drive-status')).toHaveAttribute('data-fx-particles','0');
}
test('explosions light the battlefield, burn into wrecks, pause and disappear outside authorized ground',async({page})=>{
 await scene(page);const s=page.locator('#drive-status');await page.evaluate(()=>window.dispatchEvent(new Event('fx-burst')));await expect.poll(()=>s.getAttribute('data-fx-wrecks'),{intervals:[20]}).toBe('1');await expect.poll(async()=>Number(await s.getAttribute('data-fx-lights')),{intervals:[20]}).toBeGreaterThan(0);await expect.poll(async()=>Number(await s.getAttribute('data-fx-particles'))).toBeGreaterThan(10);await expect(s).toHaveAttribute('data-fx-smokes','1');await page.evaluate(()=>window.dispatchEvent(new Event('fx-pause')));await page.waitForTimeout(100);const time=await s.getAttribute('data-fx-time');await page.waitForTimeout(150);expect(await s.getAttribute('data-fx-time')).toBe(time);await page.evaluate(()=>window.dispatchEvent(new Event('fx-hide')));await expect(s).toHaveAttribute('data-fx-wrecks','0');await expect(s).toHaveAttribute('data-fx-particles','0');await expect(s).toHaveAttribute('data-fx-lights','0');await expect(s).toHaveAttribute('data-fx-smokes','0');
});
test('reduced effects keep smoke and the wreck silhouette without moving particles or flash lights',async({page})=>{
 await scene(page,true);const s=page.locator('#drive-status');await page.evaluate(()=>window.dispatchEvent(new Event('fx-burst')));await expect(s).toHaveAttribute('data-fx-wrecks','1');await expect(s).toHaveAttribute('data-fx-smokes','1');await expect(s).toHaveAttribute('data-fx-particles','0');await expect(s).toHaveAttribute('data-fx-lights','0');
});
