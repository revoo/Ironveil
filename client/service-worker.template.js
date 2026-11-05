// VERSION and ASSETS are generated from the complete production build, including this template.
const META='ironveil-metadata';
const absolute=path=>new URL(path,self.location.origin).href;
const pointer=absolute('/__ironveil_cache/'+VERSION);
async function cacheName(){return (await (await caches.open(META)).match(pointer))?.text();}
async function ready(){const name=await cacheName();if(!name)return false;const cache=await caches.open(name);return (await Promise.all(ASSETS.map(asset=>cache.match(absolute(asset.path))))).every(Boolean);}
async function installShell(){
 const name='ironveil-shell-'+VERSION+'-'+crypto.randomUUID();
 try{
  const responses=await Promise.all(ASSETS.map(async asset=>{const response=await fetch(new Request(absolute(asset.path),{cache:'reload'}));if(!response.ok||response.redirected)throw new Error('Asset unavailable');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==asset.hash)throw new Error('Asset version mismatch');return response;}));
  const cache=await caches.open(name);await Promise.all(ASSETS.map((asset,i)=>cache.put(absolute(asset.path),responses[i])));
  // This single pointer commit exposes the candidate only after every verified asset is stored.
  await (await caches.open(META)).put(pointer,new Response(name));
  for(const old of await caches.keys())if(old.startsWith('ironveil-shell-'+VERSION+'-')&&old!==name)await caches.delete(old);
 }catch(error){await caches.delete(name);throw error;}
}
self.addEventListener('install',event=>event.waitUntil(installShell()));
// No skipWaiting: a new version cannot replace the authority/assets of an open match.
self.addEventListener('activate',event=>event.waitUntil((async()=>{const name=await cacheName();for(const old of await caches.keys())if(old.startsWith('ironveil-shell-')&&old!==name)await caches.delete(old);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(!['STATUS','REPAIR'].includes(event.data?.type))return;event.waitUntil((async()=>{let error;try{if(event.data.type==='REPAIR')await installShell();}catch{error='A connection is needed to restore offline assets.';}event.ports?.[0]?.postMessage({ready:await ready(),version:VERSION,error});})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||/^\/(api|matchmake|rooms|health)(\/|$)/.test(url.pathname))return;
 const asset=ASSETS.find(a=>a.path===url.pathname),navigation=request.mode==='navigate'&&['/','/index.html'].includes(url.pathname);
 if(!asset&&!navigation)return;
 event.respondWith((async()=>{const name=await cacheName();const cached=name?await (await caches.open(name)).match(absolute(navigation?'/index.html':url.pathname)):undefined;return cached??fetch(request);})());
});
