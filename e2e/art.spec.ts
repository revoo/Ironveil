import {expect,test} from '@playwright/test';
test('sprite presentation removes hidden contacts immediately and recreates them on authorized reveal',async({page})=>{
 const {SoloMatch}=await import('../shared/sim/match');const {relaySmallMap}=await import('../shared/content/relay-yard');
 const m=new SoloMatch(relaySmallMap);Object.assign(m.actors[2],{x:300,y:272,protection:0});m.actors[2].cannon.advanceWeapon(m.actors[2],relaySmallMap,['press']);const shown=m.view(0),hidden={...shown,enemies:[],sightings:[{id:2,x:300,y:272,expires:90}]};
 await page.addInitScript(({shown,hidden})=>{
  class FixtureWorker{
   onmessage:((event:MessageEvent)=>void)|null=null;private hidden=false;
   constructor(){window.addEventListener('hide-contact',()=>{this.hidden=true;this.send();});window.addEventListener('reveal-contact',()=>{this.hidden=false;this.send();});}
   private send(){this.onmessage?.(new MessageEvent('message',{data:{type:'match',observation:this.hidden?hidden:shown}}));}
   postMessage(message:{type:string}){if(message.type==='advance')setTimeout(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'advanced',tick:30,elapsedSeconds:1}})),0);else this.send();}
  }
  window.Worker=FixtureWorker as unknown as typeof Worker;
 },{shown,hidden});
 await page.goto('/');const status=page.locator('#drive-status');await expect(status).toHaveAttribute('data-enemy-sprites','1');await expect(status).toHaveAttribute('data-ally-sprites','1');await expect(status).toHaveAttribute('data-charging-contacts','1');
 await page.evaluate(()=>window.dispatchEvent(new Event('hide-contact')));await expect(status).toHaveAttribute('data-enemy-sprites','0');await expect(status).toHaveAttribute('data-charging-contacts','0');
 await page.evaluate(()=>window.dispatchEvent(new Event('reveal-contact')));await expect(status).toHaveAttribute('data-enemy-sprites','1');
});
