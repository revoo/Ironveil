import { describe, expect, it } from 'vitest';
import { driveTank, Simulation, type Tank } from '../shared/sim';
import { trainingMap, TUNING, type GameMap } from '../shared/content';
const tank = (overrides: Partial<Tank> = {}): Tank => ({ x: 160, y: 160, hull: 0, turret: 0, speed: 0, ...overrides });
const map: GameMap = { ...trainingMap, terrain: Array(trainingMap.width * trainingMap.height).fill('grass'), walls: [] };
const run = (t: Tank, x: number, y: number, ticks: number, silent = false, m = map) => { for (let i = 0; i < ticks; i++) driveTank(t, { x, y, aim: 0, silent }, m); };
describe('fixed-step driving', () => {
  it('normalizes diagonal input and limits hull and turret rotation', () => {
    const a = tank({ hull: Math.PI / 4 }), b = tank({ hull: Math.PI / 4 });
    run(a, 1, 1, 30); run(b, 0.1, 0.1, 30);
    expect(a.x).toBeCloseTo(b.x); expect(a.y).toBeCloseTo(b.y);
    const c = tank(); driveTank(c, { x: 0, y: 1, aim: Math.PI / 2, silent: false }, map);
    expect(c.hull).toBeCloseTo(TUNING.hullTurn / 30); expect(c.turret).toBeCloseTo(TUNING.turretTurn / 30);
  });
  it('rotates in place when facing away and decelerates after release', () => {
    const t = tank(); run(t, -1, 0, 1); expect(t.speed).toBe(0); expect(t.hull).not.toBe(0);
    const moving = tank(); run(moving, 1, 0, 30); expect(moving.speed).toBe(180); run(moving, 0, 0, 5); expect(moving.speed).toBe(0);
  });
  it('applies terrain and silent speed factors', () => {
    const mud = { ...map, terrain: Array(map.width * map.height).fill('mud') };
    const t = tank(); run(t, 1, 0, 60, true, mud); expect(t.speed).toBeCloseTo(180 * 0.65 * 0.4);
  });
  it('updates speed when crossing from grass into mud', () => {
    const terrain = Array(map.width * map.height).fill('grass');
    for (let y = 0; y < map.height; y++) for (let x = 8; x < map.width; x++) terrain[y * map.width + x] = 'mud';
    const t = tank({ x: 200 });
    run(t, 1, 0, 60, false, { ...map, terrain });
    expect(t.x).toBeGreaterThan(256); expect(t.speed).toBeCloseTo(180 * 0.65);
  });
  it('blocks walls and slides along them', () => {
    const wallMap = { ...map, walls: [{ id: 'wall', x: 200, y: 0, width: 32, height: 400 }] };
    const t = tank({ x: 175, y: 100, hull: Math.PI / 4 }); run(t, 1, 1, 60, false, wallMap);
    expect(t.x).toBeLessThanOrEqual(180); expect(t.y).toBeGreaterThan(180);
  });
  it('uses the same fixed scenario regardless of rendering schedule', () => {
    const a = new Simulation(map), b = new Simulation(map), input = { x: 1, y: 0, aim: 1, silent: false };
    for (let frame = 0; frame < 60; frame++) { if (frame % 2 === 0) a.step(input); }
    for (let frame = 0; frame < 120; frame++) { if (frame % 4 === 0) b.step(input); }
    expect(a.tank).toEqual(b.tank);
  });
});
