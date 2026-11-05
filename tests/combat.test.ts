import { expect, it } from 'vitest';
import { CombatSandbox, CANNON, segmentBox, segmentCircle } from '../shared/sim/combat';
import { trainingMap } from '../shared/content';
const tank = { x: 100, y: 100, hull: 0, turret: 0, speed: 0 };
const map = { ...trainingMap, walls: [] };
it('preserves same-tick tap edges and requires a fresh press after reload', () => {
  const c = new CombatSandbox(); c.step(tank, map, ['press', 'release']);
  expect(c.shells[0].damage).toBe(22); expect(c.weapon).toBe('reloading');
  c.step(tank, map, ['press']); for (let i=0;i<CANNON.reloadTicks;i++) c.step(tank,map,[]);
  expect(c.weapon).toBe('ready');
});
it('charges to 55 damage and vents after the full hold allowance', () => {
  const c = new CombatSandbox(); c.step(tank,map,['press']); for(let i=0;i<45;i++) c.step(tank,map,[]);
  expect(c.charge).toBe(1); expect(c.mobility).toBeCloseTo(0.55); c.step(tank,map,['release']); expect(c.shells[0].damage).toBe(55);
  const vent = new CombatSandbox(); vent.step(tank,map,['press']); for(let i=0;i<90;i++) vent.step(tank,map,[]);
  expect(vent.weapon).toBe('vent recovery'); expect(vent.shells).toHaveLength(0);
});
it('cancel loses the shot and obeys rounded recovery ticks', () => {
  const c = new CombatSandbox(); c.step(tank,map,['press','cancel','release']); expect(c.shells).toHaveLength(0);
  for(let i=0;i<7;i++) c.step(tank,map,[]); expect(c.weapon).toBe('cancel recovery'); c.step(tank,map,[]); expect(c.weapon).toBe('ready');
});
it('sweeps thin walls and circles and blocks an obstructed muzzle', () => {
  expect(segmentBox(0,0,100,0,{x:50,y:-2,width:1,height:4})).toBe(0.5);
  expect(segmentCircle(0,0,100,0,50,0,20)).toBeCloseTo(0.3);
  const c = new CombatSandbox(); c.step(tank,{...map,walls:[{id:'wall',x:110,y:80,width:1,height:40}]},['press','release']); expect(c.shells).toHaveLength(0);
});
it('a healthy target survives one full shot and resets after destruction', () => {
  const c = new CombatSandbox(); c.targets = [{x:180,y:100,hp:100,reset:0}];
  for(let shot=0;shot<2;shot++) { for(let i=0;i<20;i++) c.step(tank,map,[]); c.step(tank,map,['press']); for(let i=0;i<45;i++) c.step(tank,map,[]); c.step(tank,map,['release']); for(let i=0;i<6;i++) c.step(tank,map,[]); if(shot===0) expect(c.targets[0].hp).toBe(45); }
  expect(c.targets[0].hp).toBe(0); for(let i=0;i<90;i++) c.step(tank,map,[]); expect(c.targets[0].hp).toBe(100);
});

it('moves the patrol target while keeping a stationary aiming target', () => {
  const c = new CombatSandbox(), first = { ...c.targets[0] }, second = { ...c.targets[1] };
  for(let i=0;i<15;i++) c.step(tank,map,[]);
  expect(c.targets[0].x).toBe(first.x); expect(c.targets[1].x).not.toBe(second.x);
});
it('sweeps against relative target motion through the shell path', () => {
  const c = new CombatSandbox();
  // Cross the shell path between snapshots; neither endpoint overlaps it.
  c.targets = [{x:150,y:50,hp:100,reset:0}];
  Object.assign(c.targets[0], { vy: 3000 });
  c.shells = [{id:1,x:100,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0}];
  c.step(tank,map,[]); expect(c.targets[0].hp).toBe(78);
});
it('resolves all same-tick shells before applying damage', () => {
  const c = new CombatSandbox(); c.targets = [{x:150,y:100,hp:22,reset:0}, {x:180,y:100,hp:100,reset:0}];
  c.shells = [1,2].map(id => ({id,x:100,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0}));
  c.step(tank,map,[]);
  expect(c.targets[0].hp).toBe(0); expect(c.targets[1].hp).toBe(100); expect(c.hits).toBe(2);
});
it('walls win equal-time impacts and nearest targets block farther targets', () => {
  const c = new CombatSandbox(); c.targets = [{x:150,y:100,hp:100,reset:0}];
  const shell = {id:1,x:100,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0};
  c.shells = [{...shell}]; c.step(tank,{...map,walls:[{id:'tie',x:130,y:80,width:1,height:40}]},[]);
  expect(c.targets[0].hp).toBe(100);
  const d = new CombatSandbox(); d.targets = [{x:180,y:100,hp:100,reset:0}, {x:150,y:100,hp:100,reset:0}]; d.shells=[{...shell}]; d.step(tank,map,[]);
  expect(d.targets.map(t=>t.hp)).toEqual([100,78]);
});

it('player survives one charged hit, dies on the second and loses held charge', () => {
  const c = new CombatSandbox();
  c.step(tank,map,['press']);
  const incoming = (id: number) => ({id,x:50,y:100,angle:0,speed:3000,damage:55,remaining:900,charge:1,hostile:true});
  c.shells=[incoming(1)]; c.step(tank,map,[]);
  expect(c.view()).toMatchObject({hp:45});
  c.shells=[incoming(2)]; c.step(tank,map,[]);
  expect(c.view()).toMatchObject({hp:0}); expect(c.weapon).not.toBe('charging');
  c.step(tank,map,['release','press','release']); expect(c.shells).toHaveLength(0);
});
it('reset restores HP, clears projectiles and requires fresh fire', () => {
  const c = new CombatSandbox(); c.step(tank,map,['press','release']);
  c.reset();
  expect(c.view()).toMatchObject({hp:100,weapon:'ready',hits:0,shells:[]});
});

it('allows a same-tick trade before processing deaths', () => {
  const c = new CombatSandbox(); c.hp = 22; c.targets = [{x:154,y:100,hp:22,reset:0}];
  c.shells=[{id:999,x:50,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0,hostile:true}];
  c.step(tank,map,['press','release']);
  expect(c.hp).toBe(0); expect(c.targets[0].hp).toBe(0); expect(c.hits).toBe(1);
});
it('patrol stays inside its authored lane through repeated reversals', () => {
  const c = new CombatSandbox();
  for(let i=0;i<1800;i++) { c.step(tank,map,[]); expect(c.targets[1].x).toBeGreaterThanOrEqual(600); expect(c.targets[1].x).toBeLessThanOrEqual(900); }
});

it('publishes bounded, one-tick shot/impact/destruction events at actual impact positions', () => {
 const c=new CombatSandbox(); c.targets=[{x:154,y:100,hp:22,reset:0}]; c.step(tank,map,['press','release']);
 const events=c.view().events;
 expect(events).toEqual(expect.arrayContaining([expect.objectContaining({kind:'shot',charge:0}),expect.objectContaining({kind:'impact',x:134,y:100}),expect.objectContaining({kind:'destruction',x:154,y:100})]));
 const ids=events.map((e)=>e.id); expect(new Set(ids).size).toBe(ids.length); c.step(tank,map,[]); expect(c.view().events).toEqual([]);
});
it('vent recovery lasts 24 ticks and release at the threshold cannot salvage the shot', () => {
 const c=new CombatSandbox(); c.step(tank,map,['press']); for(let i=0;i<89;i++) c.step(tank,map,[]);
 c.step(tank,map,['release']); expect(c.weapon).toBe('vent recovery'); expect(c.shells).toEqual([]);
 for(let i=0;i<23;i++) c.step(tank,map,[]); expect(c.weapon).toBe('vent recovery'); c.step(tank,map,['release']); expect(c.weapon).toBe('ready'); expect(c.shells).toEqual([]);
});
