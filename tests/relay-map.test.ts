import { expect, it } from 'vitest';
import { relayMap, relaySmallMap, normalizeRelay } from '../shared/content/relay-yard';
import raw from '../shared/content/maps/relay-yard.json';
import { findPath } from '../shared/sim/navigation';
it('normalizes full and small authored Tiled layouts with named landmarks and stable geometry', () => {
    expect([relayMap.width, relayMap.height]).toEqual([75, 50]);
    expect([relaySmallMap.width, relaySmallMap.height]).toEqual([50, 30]);
    expect(relaySmallMap.landmarks?.map(l => l.name)).toEqual(['Radio Tower', 'Depot', 'Broken Bridge']);
    for (const team of relaySmallMap.spawns!)
        for (const spawn of team)
            for (const site of relaySmallMap.sites!)
                expect(findPath(relaySmallMap, spawn, site).length).toBeGreaterThan(0);
});
it('rejects unsupported terrain properties and malformed authored layers', () => {
    const data = structuredClone(raw);
    data.layers = data.layers.filter(l => l.name !== 'terrain');
    expect(() => normalizeRelay(data, 'small')).toThrow(/terrain/);
    const invalid = structuredClone(raw);
    invalid.tilesets[0].tiles[0].type = 'water';
    expect(() => normalizeRelay(invalid, 'small')).toThrow(/terrain/);
});
it('each small relay has at least three navigable approach points', () => {
    for (const site of relaySmallMap.sites!) {
        const entries = [[120, 0], [-120, 0], [0, 120], [0, -120]].map(([dx, dy]) => ({ x: site.x + dx, y: site.y + dy }));
        expect(entries.filter(p => findPath(relaySmallMap, relaySmallMap.spawns![0][0], p).length > 0).length).toBeGreaterThanOrEqual(3);
    }
});
