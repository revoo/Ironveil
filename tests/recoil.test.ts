import {expect,it} from 'vitest';import {RecoilRig} from '../client/recoil';import {SoloMatch} from '../shared/sim/match';import {trainingMap} from '../shared/content';
function peak(charge:number){const r=new RecoilRig();r.kick(charge,0);let barrel=0,body=0;for(let i=0;i<60;i++){const p=r.step(1/240);barrel=Math.max(barrel,p.barrel);body=Math.max(body,Math.hypot(p.x,p.y));}return{barrel,body};}
it('adds momentum, builds into a kick, then springs back and settles',()=>{
 const r=new RecoilRig();r.kick(1,0);expect(r.step(0)).toEqual({x:0,y:0,barrel:0});const kick=r.step(.035);expect(kick.barrel).toBeGreaterThan(5);expect(kick.x).toBeLessThan(-1);expect(kick.y).toBeCloseTo(0);expect(r.step(.165).barrel).toBeLessThan(0);const rest=r.step(1);expect(Math.abs(rest.barrel)+Math.hypot(rest.x,rest.y)).toBeLessThan(.001);
});
it('scales both barrel and body response with actual shot charge',()=>{
 const tap=peak(0),half=peak(.5),full=peak(1);expect(tap.barrel).toBeGreaterThan(.5);expect(half.barrel).toBeGreaterThan(tap.barrel);expect(full.barrel).toBeGreaterThan(tap.barrel*3);expect(full.body).toBeGreaterThan(tap.body*3);expect(full.barrel).toBeLessThan(16);expect(full.body).toBeLessThan(5);
});
it('keeps body recoil aligned with the shot direction',()=>{const r=new RecoilRig();r.kick(1,Math.PI/2);const p=r.step(.06);expect(p.x).toBeCloseTo(0);expect(p.y).toBeLessThan(-1);});
it('has the same motion at different render rates and recovers from a long frame',()=>{
 const samples=[30,60,144].map(rate=>{const r=new RecoilRig();r.kick(.8,.7);for(let i=0;i<rate;i++)r.step(.3/rate);return r.step(0);});for(const p of samples){expect(p.x).toBeCloseTo(samples[0].x,9);expect(p.y).toBeCloseTo(samples[0].y,9);expect(p.barrel).toBeCloseTo(samples[0].barrel,9);}
 const r=new RecoilRig();r.kick(1,0);const p=r.step(5);expect(Math.hypot(p.x,p.y)+Math.abs(p.barrel)).toBeLessThan(.001);
});
it('bounds repeated impulses and clears suppressed/reset motion without a deferred kick',()=>{
 const r=new RecoilRig();for(let i=0;i<100;i++){r.kick(1,.5);const p=r.step(.001);expect(Number.isFinite(p.barrel)).toBe(true);expect(Math.abs(p.barrel)).toBeLessThanOrEqual(16);expect(Math.hypot(p.x,p.y)).toBeLessThanOrEqual(5.000001);}expect(r.step(.01,true)).toEqual({x:0,y:0,barrel:0});expect(r.step(.1)).toEqual({x:0,y:0,barrel:0});r.kick(1,0);r.reset();expect(r.step(.1)).toEqual({x:0,y:0,barrel:0});
});
it('identifies authorized shot recoil without exposing a hidden shooter through a visible projectile',()=>{
 const m=new SoloMatch({...trainingMap,walls:[],terrain:trainingMap.terrain.map(()=>'grass')});m.botsEnabled=false;Object.assign(m.actors[0],{x:100,y:100,turret:0});m.actors.slice(1).forEach(a=>Object.assign(a,{x:1000,y:800,protection:0}));
 const before={x:m.actors[0].x,y:m.actors[0].y};m.shells=[{id:100,team:0,owner:0,x:950,y:800,angle:0,speed:60,damage:22,remaining:100,charge:0}];m.step(undefined,['press','release']);
 expect(m.view(0).events.find(e=>e.kind==='shot')).toMatchObject({actorId:0,angle:0,charge:0});expect({x:m.actors[0].x,y:m.actors[0].y}).toEqual(before);expect(m.view(1).events.some(e=>e.kind==='shot')).toBe(false);expect(m.view(1).shells.length).toBeGreaterThan(0);for(const s of m.view(1).shells){expect(s).not.toHaveProperty('actorId');expect(s).not.toHaveProperty('owner');}
});
