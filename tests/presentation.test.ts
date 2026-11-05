import { expect, it } from 'vitest';
import { PoseBuffer } from '../client/presentation';
const pose = (x: number, hull = 0) => ({ x, y: 20, hull, turret: hull });
it('renders intermediate positions between simulation messages', () => {
  const b = new PoseBuffer(); b.push(1, pose(0), 0); b.push(2, pose(6), 1000 / 30);
  expect(b.sample(1000 / 30)?.x).toBeCloseTo(0);
  expect(b.sample(50)?.x).toBeCloseTo(3);
  expect(b.sample(1000 / 15)?.x).toBeCloseTo(6);
});
it('takes the short rotation path across the angle boundary', () => {
  const b = new PoseBuffer(); b.push(1, pose(0, Math.PI - 0.1), 0); b.push(2, pose(0, -Math.PI + 0.1), 1000 / 30);
  expect(Math.abs(b.sample(50)!.hull)).toBeCloseTo(Math.PI);
});
it('holds the latest position during stalls and resets after a long gap', () => {
  const b = new PoseBuffer(); expect(b.sample(0)).toBeUndefined(); b.push(1, pose(0), 0); b.push(2, pose(6), 34);
  expect(b.sample(1000)?.x).toBe(6); b.push(30, pose(300), 1000); expect(b.sample(1000)?.x).toBe(300);
});
it('ignores duplicate and older snapshots', () => {
  const b = new PoseBuffer(); b.push(2, pose(10), 0); b.push(1, pose(999), 10); b.push(2, pose(999), 20); expect(b.sample(30)?.x).toBe(10);
});

it('snaps teleports instead of drawing through the map',()=>{const b=new PoseBuffer();b.push(1,pose(0),0);b.push(2,pose(1000),34);expect(b.sample(40)?.x).toBe(1000);});

it('preserves confirmed transient events across catch-up snapshots, deduplicates and bounds backlog',async()=>{
 const {EventInbox}=await import('../client/presentation');const q=new EventInbox<{id:number}>();q.push([{id:1}]);q.push([]);q.push([{id:1},{id:2}]);expect(q.drain()).toEqual([{id:1},{id:2}]);expect(q.drain()).toEqual([]);
 q.push(Array.from({length:100},(_,i)=>({id:i+3})));expect(q.drain()).toHaveLength(64);q.push([{id:103}]);q.clear();expect(q.drain()).toEqual([]);q.push([{id:103}]);expect(q.drain()).toEqual([]);
});
