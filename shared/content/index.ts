export const TUNING = Object.freeze({ tickRate: 30, grassSpeed: 180, tankRadius: 20, hullTurn: 220 * Math.PI / 180, turretTurn: 150 * Math.PI / 180 });
export type Terrain = 'grass' | 'road' | 'mud' | 'brush';
export interface GameMap { version: number; id: string; width: number; height: number; tileSize: number; terrain: Terrain[]; walls: { id: string; x: number; y: number; width: number; height: number }[] }
const width = 50, height = 30;
const terrain: Terrain[] = Array.from({ length: width * height }, (_, i) => {
  const x = i % width, y = Math.floor(i / width);
  if (y >= 13 && y <= 16) return 'road';
  if (x >= 16 && x <= 24 && y >= 18 && y <= 25) return 'mud';
  if (x >= 30 && x <= 39 && y >= 4 && y <= 10) return 'brush';
  return 'grass';
});
export const trainingMap: GameMap = { version: 1, id: 'training', width, height, tileSize: 32, terrain, walls: [
  { id: 'west-cover', x: 480, y: 240, width: 32, height: 180 },
  { id: 'east-cover', x: 960, y: 480, width: 192, height: 32 },
  { id: 'north-cover', x: 700, y: 160, width: 160, height: 32 },
] };
export function validateMap(value: unknown): asserts value is GameMap {
  if (!value || typeof value !== 'object') throw new Error('Map must be an object');
  const m = value as Partial<GameMap>;
  if (m.version !== 1 || typeof m.id !== 'string' || !m.id.trim()) throw new Error('Map requires supported version 1 and a nonempty id');
  if (![m.width, m.height, m.tileSize].every(n => Number.isInteger(n) && (n as number) > 0)) throw new Error('Map dimensions and tileSize must be positive integers');
  if (!Array.isArray(m.terrain) || m.terrain.length !== m.width! * m.height! || !m.terrain.every(t => ['grass', 'road', 'mud', 'brush'].includes(t))) throw new Error('Terrain must contain one supported value per tile');
  if (!Array.isArray(m.walls)) throw new Error('Map walls must be an array');
  const ids = new Set<string>();
  for (const wall of m.walls) {
    if (!wall || typeof wall.id !== 'string' || !wall.id.trim() || ids.has(wall.id)) throw new Error('Walls require unique nonempty IDs');
    ids.add(wall.id);
    if (![wall.x, wall.y, wall.width, wall.height].every(Number.isFinite) || wall.x < 0 || wall.y < 0 || wall.width <= 0 || wall.height <= 0 || wall.x + wall.width > m.width! * m.tileSize! || wall.y + wall.height > m.height! * m.tileSize!) throw new Error(`Wall ${wall.id} has invalid bounds`);
  }
}
