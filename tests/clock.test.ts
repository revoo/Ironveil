import {expect,it} from 'vitest';import {FixedClock} from '../shared/sim/clock';
it('advances 30 fixed steps per elapsed second despite irregular callbacks',()=>{
 const c=new FixedClock(0);let steps=0;for(const t of [10,40,71,102,155,201,243,290,330,380,430,480,530,580,630,680,730,780,830,880,930,980,1000])steps+=c.advance(t);expect(steps).toBe(30);
});
it('bounds catch-up after a stall and discards old debt',()=>{const c=new FixedClock(0);expect(c.advance(5000)).toBe(4);expect(c.advance(5000)).toBe(0);expect(c.advance(5034)).toBe(1);});
it('consumes elapsed pause time without fast-forward on resume',()=>{const c=new FixedClock(0);expect(c.advance(30000,true)).toBe(0);expect(c.advance(30034)).toBe(1);});
