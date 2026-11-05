import { expect, it } from 'vitest';
import { findPath } from '../shared/sim/navigation';
import { trainingMap } from '../shared/content';
it('routes an inflated hull around cover instead of through it', () => {
    const path = findPath(trainingMap, { x: 400, y: 320 }, { x: 600, y: 320 });
    expect(path.length).toBeGreaterThan(2);
    for (const p of path)
        expect(trainingMap.walls.some(w => p.x > w.x - 20 && p.x < w.x + w.width + 20 && p.y > w.y - 20 && p.y < w.y + w.height + 20)).toBe(false);
});
it('returns no route for unreachable or invalid destinations', () => {
    const map = { ...trainingMap, walls: [{ id: 'divide', x: 700, y: 0, width: 64, height: 960 }] };
    expect(findPath(map, { x: 160, y: 272 }, { x: 1400, y: 272 })).toEqual([]);
    expect(findPath(map, { x: 160, y: 272 }, { x: -10, y: 20 })).toEqual([]);
});

it('all authored spawns can reach all relay sites', async () => {
 const {SOLO_LAYOUT}=await import('../shared/content/solo-layout');
 for(const team of SOLO_LAYOUT.spawns)for(const spawn of team)for(const site of SOLO_LAYOUT.sites)expect(findPath(trainingMap,spawn,site).length).toBeGreaterThan(0);
});
