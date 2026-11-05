import {expect,it} from 'vitest';
import {buildDressing} from '../client/art';
import {relaySmallMap} from '../shared/content/relay-yard';
it('builds repeatable static foliage without changing the gameplay map',()=>{
 const before=JSON.stringify(relaySmallMap),a=buildDressing(relaySmallMap);
 expect(a.length).toBeGreaterThan(100);expect(buildDressing(relaySmallMap)).toEqual(a);expect(JSON.stringify(relaySmallMap)).toBe(before);
});
it('keeps every decorative canopy inside brush so art does not suggest new cover',()=>{
 const trees=buildDressing(relaySmallMap).filter(p=>p.kind==='pine');expect(trees.length).toBeGreaterThan(0);
 for(const p of trees){const col=Math.floor(p.x/32),row=Math.floor(p.y/32);expect(relaySmallMap.terrain[row*relaySmallMap.width+col]).toBe('brush');expect(p.x%32).toBe(16);expect(p.y%32).toBe(16);expect(p.radius).toBeLessThanOrEqual(15);}
});
it('keeps dressing bounded to known terrain and clear of collision interiors',()=>{
 const art=buildDressing(relaySmallMap);expect(art.length).toBeLessThanOrEqual(relaySmallMap.terrain.length);
 for(const p of art){expect(p.x-p.radius).toBeGreaterThanOrEqual(0);expect(p.y-p.radius).toBeGreaterThanOrEqual(0);expect(p.x+p.radius).toBeLessThanOrEqual(relaySmallMap.width*32);expect(p.y+p.radius).toBeLessThanOrEqual(relaySmallMap.height*32);expect(relaySmallMap.walls.some(w=>p.x>w.x&&p.x<w.x+w.width&&p.y>w.y&&p.y<w.y+w.height)).toBe(false);}
});
