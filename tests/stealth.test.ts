import { expect, it } from 'vitest';
import { SoloMatch } from '../shared/sim/match';
import { trainingMap, type GameMap } from '../shared/content';
const map = (terrain = 'grass'): GameMap => ({ ...trainingMap, walls: [], terrain: Array(trainingMap.width * trainingMap.height).fill(terrain) });
function setup(m: SoloMatch) { m.botsEnabled = false; m.actors[1].hp = 0; m.actors[1].respawn = 9999; Object.assign(m.actors[0], { x: 200, y: 200 }); Object.assign(m.actors[2], { x: 400, y: 200 }); Object.assign(m.actors[3], { x: 1400, y: 800 }); }
it('brush conceals at distance, reveals nearby, and firing never bypasses cover', () => {
    const m = new SoloMatch(map('brush'));
    setup(m);
    expect(m.view(0).enemies).toEqual([]);
    m.actors[2].x = 300;
    expect(m.view(0).enemies.map(a => a.id)).toContain(2);
    m.actors[2].x = 400;
    m.actors[2].cannon.advanceWeapon(m.actors[2], m.map, ['press', 'release']);
    // Actual match firing is authoritative; inject a visible shot intent through the bot-free cannon for this boundary check.
    Object.assign(m.actors[2], { revealUntil: 36 });
    expect(m.view(0).enemies.map(a => a.id)).toContain(2);
    m.map.walls.push({ id: 'cover', x: 300, y: 100, width: 32, height: 200 });
    expect(m.view(0).enemies).toEqual([]);
});
it('smoke deploys immediately, cancels charge, blocks rays from inside and expires on the sim clock', () => {
    const m = new SoloMatch(map());
    setup(m);
    m.actors[0].cannon.advanceWeapon(m.actors[0], m.map, ['press']);
    expect(m.deploySmoke(0)).toBe(true);
    expect(m.deploySmoke(0)).toBe(false);
    expect(m.actors[0].cannon.weapon).toBe('cancel recovery');
    expect(m.view(0).enemies).toEqual([]);
    m.setPaused(true);
    const before = JSON.stringify(m);
    for (let i = 0; i < 200; i++)
        m.step();
    expect(JSON.stringify(m)).toBe(before);
    m.setPaused(false);
    for (let i = 0; i < 150; i++)
        m.step();
    expect(m.smokes).toHaveLength(0);
    expect(m.view(0).enemies.map(a => a.id)).toContain(2);
    for (let i = 150; i < 540; i++)
        m.step();
    expect(m.deploySmoke(0)).toBe(true);
});
it('stale sightings freeze the last authorized position and expire after three seconds', () => {
    const m = new SoloMatch(map());
    setup(m);
    m.step();
    const seen = m.view(0).enemies.find(a => a.id === 2)!;
    m.actors[2].x = 1000;
    m.step();
    expect(m.view(0).enemies).toEqual([]);
    expect(m.view(0).sightings).toContainEqual(expect.objectContaining({ id: 2, x: seen.x, y: seen.y }));
    m.actors[2].x = 1200;
    m.step();
    expect(m.view(0).sightings[0].x).toBe(seen.x);
    for (let i = 0; i < 90; i++)
        m.step();
    expect(m.view(0).sightings).toEqual([]);
});
it('mud stamps can be discovered later, reveal no owner and expire while memory is bounded', () => {
    const m = new SoloMatch(map('mud'));
    setup(m);
    m.actors[2].x = 1300;
    for (let i = 0; i < 45; i++)
        m.step({ x: 1, y: 0, aim: 0, silent: true });
    expect(m.tracks.length).toBeGreaterThan(0);
    expect(m.view(1).tracks).toEqual([]);
    Object.assign(m.actors[2], { x: 200, y: 250 });
    m.step();
    const stamps = m.view(1).tracks;
    expect(stamps.length).toBeGreaterThan(0);
    expect(Object.keys(stamps[0]).sort()).toEqual(['axis', 'expires', 'id', 'stage', 'x', 'y']);
    m.actors[2].x = 1300;
    m.step();
    expect(m.view(1).tracks.length).toBe(stamps.length);
    for (let i = 0; i < 400; i++)
        m.step();
    expect(m.tracks).toEqual([]);
    expect(m.view(1).tracks).toEqual([]);
});
it('hidden sounds carry only coarse sectors and bands, and silent movement waits for actual braking', () => {
    const m = new SoloMatch({ ...map(), walls: [{ id: 'cover', x: 300, y: 100, width: 32, height: 300 }] });
    setup(m);
    Object.assign(m.actors[2], { speed: 150, vx: 150, silent: true });
    m.step();
    expect(m.view(0).sounds.length).toBeGreaterThan(0);
    for (const cue of m.view(0).sounds) {
        expect(Object.keys(cue).sort()).toEqual(['band', 'expires', 'id', 'kind', 'sector']);
        expect(cue.sector).toBeGreaterThanOrEqual(0);
        expect(cue.sector).toBeLessThan(8);
    }
    Object.assign(m.actors[2], { speed: 0, vx: 0, vy: 0 });
    for (let i = 0; i < 20; i++)
        m.step();
    expect(m.view(0).sounds).toEqual([]);
});
it('smoke does not stop shells and evidence storage is bounded', () => {
    const m = new SoloMatch(map());
    setup(m);
    m.actors[2].protection = 0;
    m.deploySmoke(0);
    m.shells = [{ id: 1, team: 0, x: 300, y: 200, angle: 0, speed: 3000, damage: 22, remaining: 900, charge: 0 }];
    m.step();
    expect(m.actors[2].hp).toBe(78);
    m.tracks = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), x: 400, y: 200, axis: 0, expires: 360, stage: 0 }));
    m.smokes = [];
    m.step();
    expect(m.tracks.length).toBe(640);
    expect(m.view(0).tracks.length).toBeLessThanOrEqual(640);
});
it('quiet movement becomes silent only after actual speed reaches the terrain-adjusted cap', () => {
    const m = new SoloMatch({ ...map(), walls: [{ id: 'cover', x: 300, y: 100, width: 32, height: 300 }] });
    setup(m);
    m.actors[2].x = 400;
    Object.assign(m.actors[0], { speed: 180, vx: 180 });
    m.step({ x: 1, y: 0, aim: 0, silent: true });
    expect(m.view(1).sounds.some(s => s.kind === 'engine')).toBe(true);
    for (let i = 0; i < 50; i++)
        m.step({ x: 0, y: 1, aim: 0, silent: true });
    expect(m.view(0).allies[0].quiet).toBe(true);
    expect(m.view(1).sounds.filter(s => s.kind === 'engine')).toEqual([]);
});
it('a visible shell never carries a hidden shooters identity or muzzle coordinates', () => {
    const m = new SoloMatch(map('brush'));
    setup(m);
    m.actors[2].x = 900;
    m.shells = [{ id: 17, team: 1, x: 300, y: 200, angle: 0, speed: 500, damage: 22, remaining: 500, charge: 0 }];
    const o = m.view(0);
    expect(o.enemies).toEqual([]);
    expect(o.shells).toHaveLength(1);
    expect(Object.keys(o.shells[0]).sort()).toEqual(['angle', 'charge', 'damage', 'hostile', 'id', 'remaining', 'speed', 'x', 'y']);
    expect(o.shells[0].x).toBe(300);
});
it('charging in brush creates sound without revealing the tank and smoke respects longer recoveries', () => {
    const m = new SoloMatch(map('brush'));
    setup(m);
    m.actors[2].cannon.advanceWeapon(m.actors[2], m.map, ['press']);
    m.step();
    expect(m.view(0).enemies).toEqual([]);
    expect(m.view(0).sounds.some(s => s.kind === 'charge')).toBe(true);
    const c = m.actors[0].cannon;
    c.advanceWeapon(m.actors[0], m.map, ['press', 'release']);
    c.recoverFromSmoke();
    expect(c.weapon).toBe('reloading');
});

it('track axis is identical in opposite travel directions, including negative headings',()=>{
 const axes=[1,-1].map(direction=>{const m=new SoloMatch(map('mud'));setup(m);Object.assign(m.actors[0],{vx:100*direction,vy:100*direction,speed:Math.SQRT2*100,trackDistance:32});m.step();return m.tracks[0].axis;});
 expect(axes[0]).toBeGreaterThanOrEqual(0);expect(axes[1]).toBeGreaterThanOrEqual(0);expect(axes[0]).toBeCloseTo(axes[1]);expect(axes[1]).toBeLessThan(Math.PI);
});
