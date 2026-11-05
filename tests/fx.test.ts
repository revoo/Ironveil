import {expect,it} from 'vitest';
import {BattleFx,smokePuffs,shockwave} from '../client/fx';
const shot=(id=1,charge=1)=>({id,kind:'shot' as const,x:200,y:200,angle:0,charge});
it('makes charged shots brighter and richer, deduplicating confirmed events',()=>{
 const tap=new BattleFx(),full=new BattleFx();tap.emit(shot(1,0));full.emit(shot());expect(full.lights[0].radius).toBeGreaterThan(tap.lights[0].radius);expect(full.particles.length).toBeGreaterThan(tap.particles.length);const n=full.particles.length;full.emit(shot());expect(full.particles.length).toBe(n);
});
it('animates and expires particles, lights and wrecks on presentation time only',()=>{
 const fx=new BattleFx();fx.emit({...shot(),kind:'destruction'});expect(fx.wrecks.length).toBe(1);const before=JSON.stringify(fx.particles);fx.step(.2,true);expect(JSON.stringify(fx.particles)).toBe(before);fx.step(.2);expect(JSON.stringify(fx.particles)).not.toBe(before);fx.step(20);expect(fx.particles.length+fx.lights.length+fx.wrecks.length).toBe(0);
});
it('bounds a sustained firefight, clears on reset and accepts new session event ids',()=>{
 const fx=new BattleFx();for(let i=1;i<500;i++)fx.emit({...shot(i),kind:'destruction'});expect(fx.particles.length).toBeLessThanOrEqual(420);expect(fx.lights.length).toBeLessThanOrEqual(20);expect(fx.wrecks.length).toBeLessThanOrEqual(12);fx.reset();expect(fx.particles.length+fx.lights.length+fx.wrecks.length).toBe(0);fx.emit(shot());expect(fx.particles.length).toBeGreaterThan(0);
});
it('reduces particle budgets and suppresses moving particles and flash lights for reduced motion',()=>{
 const full=new BattleFx(),low=new BattleFx({lowEffects:true}),reduced=new BattleFx({reducedMotion:true});full.emit(shot());low.emit(shot());reduced.emit(shot());expect(low.particles.length).toBeLessThan(full.particles.length);expect(reduced.particles.length+reduced.lights.length).toBe(0);full.configure({reducedMotion:true});expect(full.particles.length+full.lights.length).toBe(0);
});
it('keeps smoke puffs inside the authoritative radius with stable reduced-motion geometry',()=>{
 const a=smokePuffs(4,2),b=smokePuffs(4,3);expect(a.length).toBeGreaterThan(8);expect(b).not.toEqual(a);for(const p of a)expect(Math.hypot(p.x,p.y)+p.radius).toBeLessThanOrEqual(100.001);expect(smokePuffs(4,2,true)).toEqual(smokePuffs(4,3,true));
});
it('makes repeatable effects without mutating authority events',()=>{
 const e=Object.freeze(shot()),a=new BattleFx(),b=new BattleFx();a.emit(e);b.emit(e);a.step(.1);b.step(.1);expect(a.particles).toEqual(b.particles);expect(e).toEqual(shot());
});
it('expands and fades blast pressure rings while muzzle flashes have no shockwave',()=>{const fx=new BattleFx();fx.emit({...shot(1),kind:'destruction'});const flash=fx.lights[0],early=shockwave(flash);expect(early).toBeDefined();fx.step(.15);const later=shockwave(flash)!;expect(later.radius).toBeGreaterThan(early!.radius);expect(later.alpha).toBeLessThan(early!.alpha);fx.emit(shot(2));expect(shockwave(fx.lights[1])).toBeUndefined();});
