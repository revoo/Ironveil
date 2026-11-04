import { describe, expect, it } from 'vitest';
import { Simulation } from '../shared/sim';
import { trainingMap, validateMap } from '../shared/content';
import { currentHandshake, versionsMatch } from '../shared/protocol';
describe('foundation', () => {
  it('advances by integer simulation ticks', () => { const sim = new Simulation(); for (let i = 0; i < 30; i++) sim.step(); expect(sim.tick).toBe(30); expect(sim.elapsedSeconds).toBe(1); });
  it('requires matching protocol and content versions', () => { expect(versionsMatch(currentHandshake())).toBe(true); expect(versionsMatch({ ...currentHandshake(), contentVersion: 999 })).toBe(false); expect(versionsMatch(null)).toBe(false); });
  it('validates map data and rejects malformed terrain and duplicate wall IDs', () => { expect(() => validateMap(trainingMap)).not.toThrow(); expect(() => validateMap({ ...trainingMap, terrain: [] })).toThrow(/Terrain/); const wall = { id: 'wall', x: 0, y: 0, width: 32, height: 32 }; expect(() => validateMap({ ...trainingMap, walls: [wall, wall] })).toThrow(/unique/); });
});
