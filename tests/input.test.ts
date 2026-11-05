import { expect, it } from 'vitest';
import { WeaponInbox } from '../shared/sim/input';
it('deduplicates edges across simulation ticks and rejects old or malformed sequences', () => {
 const q=new WeaponInbox(); expect(q.push(1,'press')).toBe(true); expect(q.push(1,'press')).toBe(false); expect(q.drain()).toEqual(['press']);
 expect(q.push(1,'release')).toBe(false); expect(q.push(0,'release')).toBe(false); expect(q.push(NaN,'release')).toBe(false); expect(q.push(2,'release')).toBe(true); expect(q.drain()).toEqual(['release']);
});
it('bounds a flood and neutralization clears queued edges without allowing replay', () => {
 const q=new WeaponInbox(); for(let i=1;i<=100;i++) q.push(i,'press'); expect(q.drain().length).toBeLessThanOrEqual(16);
 q.push(101,'release'); q.clear(); expect(q.drain()).toEqual([]); expect(q.push(101,'release')).toBe(false);
});
