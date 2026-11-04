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
