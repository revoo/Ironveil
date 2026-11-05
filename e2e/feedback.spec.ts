import {expect,test} from '@playwright/test';
test('confirmed combat cues remain readable with muted audio and reduced effects, then expire',async({page})=>{
 const {SoloMatch}=await import('../shared/sim/match');const {relaySmallMap}=await import('../shared/content/relay-yard');const o=new SoloMatch(relaySmallMap).view(0);o.tick=10;o.feedback=[{id:1,kind:'hit',expires:30},{id:2,kind:'kill',expires:30},{id:3,kind:'damage',sector:4,expires:30}];
 await page.addInitScript(o=>{
  localStorage.setItem('ironveil-settings-v1',JSON.stringify({muted:true,reducedMotion:true,lowEffects:true}));
  class FixtureWorker{
   onmessage:((event:MessageEvent)=>void)|null=null;
   constructor(){window.addEventListener('expire-feedback',()=>{o.tick=30;this.send();});}
   private send(){this.onmessage?.(new MessageEvent('message',{data:{type:'match',observation:o}}));}
   postMessage(message:{type:string}){if(message.type==='advance')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'advanced',tick:30,elapsedSeconds:1}})),0);else this.send();}
  }
  window.Worker=FixtureWorker as unknown as typeof Worker;
 },o);
 await page.goto('/');await expect(page.locator('#combat-feedback')).toContainText('ENEMY DESTROYED');await expect(page.locator('#combat-feedback')).toContainText('INCOMING W');
 await page.evaluate(()=>window.dispatchEvent(new Event('expire-feedback')));await expect(page.locator('#combat-feedback')).toHaveText('');
});
