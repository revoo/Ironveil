import {expect,it} from 'vitest';import vm from 'node:vm';import {createHash,webcrypto} from 'node:crypto';
import {serviceWorkerSource} from '../tools/offline';
const bodies={'/index.html':'shell','/assets/app.js':'game'};const assets=Object.entries(bodies).map(([path,body])=>({path,hash:createHash('sha256').update(body).digest('hex')}));
function runtime(version:string,store=new Map<string,Map<string,Response>>(),fail=false,manifest=assets){const hooks:Record<string,(e:any)=>void>={};const key=(r:any)=>new URL(typeof r==='string'?r:r.url,'http://localhost').href;
 const caches={open:async(name:string)=>{if(!store.has(name))store.set(name,new Map());const entries=store.get(name)!;return {match:async(r:any)=>entries.get(key(r))?.clone(),put:async(r:any,v:Response)=>{entries.set(key(r),v.clone());},keys:async()=>[...entries.keys()].map(k=>new Request(k))};},keys:async()=>[...store.keys()],delete:async(name:string)=>store.delete(name)};
 const self={location:new URL('http://localhost/sw.js'),clients:{claim:async()=>{}},addEventListener:(name:string,callback:any)=>{hooks[name]=callback;}};
 vm.runInNewContext(serviceWorkerSource(manifest,version),{self,caches,crypto:webcrypto,Response,Request,URL,Date,fetch:async(r:any)=>{const path=new URL(typeof r==='string'?r:r.url,'http://localhost').pathname;if(fail&&path==='/assets/app.js')throw new Error('interrupted');return new Response(bodies[path as keyof typeof bodies],{status:200});}});
 return {store,async install(){let pending:Promise<unknown>=Promise.resolve();hooks.install({waitUntil:(p:Promise<unknown>)=>{pending=p;}});await pending;},async ready(){let ready:any;let pending:Promise<unknown>=Promise.resolve();hooks.message?.({data:{type:'STATUS'},ports:[{postMessage:(v:any)=>ready=v}],waitUntil:(p:Promise<unknown>)=>{pending=p;}});await pending;return ready;},async fetch(path:string){let pending:Promise<Response>|undefined;hooks.fetch?.({request:new Request('http://localhost'+path),respondWith:(p:Promise<Response>)=>{pending=p;}});return pending;}};
}
it('commits a complete verified cache and does not replace it after an interrupted update',async()=>{
 const first=runtime('one');await first.install();expect(await first.ready()).toMatchObject({ready:true});
 const update=runtime('two',first.store,true);await expect(update.install()).rejects.toThrow();expect(await first.ready()).toMatchObject({ready:true});expect([...first.store.keys()].filter(k=>k.includes('two'))).toEqual([]);
 expect(await (await first.fetch('/assets/app.js'))?.text()).toBe('game');expect(await first.fetch('/api/rooms')).toBeUndefined();
});
it('detects missing assets instead of claiming offline readiness',async()=>{
 const env=runtime('missing');await env.install();for(const [name,entries]of env.store)if(name.startsWith('ironveil-shell'))entries.delete('http://localhost/assets/app.js');expect(await env.ready()).toMatchObject({ready:false});
});

it('rejects a mismatched asset hash and preserves the installed shell',async()=>{const first=runtime('good');await first.install();const bad=runtime('bad',first.store,false,assets.map(a=>({...a,hash:'0'.repeat(64)})));await expect(bad.install()).rejects.toThrow(/version mismatch/);expect(await first.ready()).toMatchObject({ready:true});});
