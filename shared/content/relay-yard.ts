import raw from './maps/relay-yard.json' with { type: 'json' };
import { validateMap, type GameMap, type Terrain } from './index';
type Obj = {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    properties?: {
        name: string;
        value: unknown;
    }[];
};
type Layer = {
    name: string;
    type: string;
    data?: number[];
    objects?: Obj[];
};
type Source = {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    orientation: string;
    infinite: boolean;
    layers: Layer[];
    tilesets: {
        firstgid: number;
        tiles: {
            id: number;
            type: string;
        }[];
    }[];
};
/** Normalize the supported authored Tiled layers once for both authority and presentation. */
export function normalizeRelay(value: unknown, layout: string): GameMap {
    if (!value || typeof value !== 'object')
        throw new Error('Tiled map must be an object');
    const source = value as Source;
    if (source.orientation !== 'orthogonal' || source.infinite || source.tilewidth !== 32 || source.tileheight !== 32 || !Number.isInteger(source.width) || !Number.isInteger(source.height) || !Array.isArray(source.layers))
        throw new Error('Unsupported Tiled geometry');
    const supported = ['terrain', 'collision', 'spawns', 'objectives', 'landmarks', 'bounds'];
    if (source.layers.length !== supported.length || source.layers.some(l => !supported.includes(l.name)) || new Set(source.layers.map(l => l.name)).size !== supported.length)
        throw new Error('Missing or unsupported terrain/object layers');
    const layer = (name: string) => source.layers.find(l => l.name === name)!;
    const objects = (name: string) => { const l = layer(name); if (l.type !== 'objectgroup' || !Array.isArray(l.objects))
        throw new Error(`Missing ${name} objects`); return l.objects; };
    const all = supported.filter(n => n !== 'terrain').flatMap(objects), ids = new Set<number>();
    for (const o of all) {
        if (!Number.isSafeInteger(o.id) || ids.has(o.id) || ![o.x, o.y, o.width, o.height].every(Number.isFinite) || (o.rotation ?? 0) !== 0)
            throw new Error('Invalid or duplicate object IDs/geometry');
        ids.add(o.id);
        for (const p of o.properties ?? [])
            if (!['layout', 'team', 'order'].includes(p.name))
                throw new Error('Unsupported object property');
    }
    const tiles = source.tilesets;
    if (!Array.isArray(tiles) || tiles.length !== 1 || tiles[0].firstgid !== 1)
        throw new Error('Unsupported terrain tileset');
    const terrainTypes = new Map<number, Terrain>();
    for (const tile of tiles[0].tiles) {
        if (!['grass', 'road', 'mud', 'brush'].includes(tile.type))
            throw new Error('Unsupported terrain property');
        terrainTypes.set(tile.id + 1, tile.type as Terrain);
    }
    const data = layer('terrain').data;
    if (layer('terrain').type !== 'tilelayer' || !Array.isArray(data) || data.length !== source.width * source.height || data.some(n => !terrainTypes.has(n)))
        throw new Error('Invalid terrain layer');
    const bounds = objects('bounds').find(o => o.name === layout);
    if (!bounds || ![bounds.x, bounds.y, bounds.width, bounds.height].every(n => n % 32 === 0) || bounds.width <= 0 || bounds.height <= 0 || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > source.width * 32 || bounds.y + bounds.height > source.height * 32)
        throw new Error('Invalid authored bounds');
    const props = (o: Obj) => Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
    const included = (o: Obj) => props(o).layout === layout;
    const width = bounds.width / 32, height = bounds.height / 32;
    const terrain: Terrain[] = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            terrain.push(terrainTypes.get(data[(y + bounds.y / 32) * source.width + x + bounds.x / 32])!);
    const walls = objects('collision').filter(o => o.x < bounds.x + bounds.width && o.x + o.width > bounds.x && o.y < bounds.y + bounds.height && o.y + o.height > bounds.y).map(o => ({ id: String(o.id), x: Math.max(o.x, bounds.x) - bounds.x, y: Math.max(o.y, bounds.y) - bounds.y, width: Math.min(o.x + o.width, bounds.x + bounds.width) - Math.max(o.x, bounds.x), height: Math.min(o.y + o.height, bounds.y + bounds.height) - Math.max(o.y, bounds.y) }));
    const point = (o: Obj) => ({ x: o.x - bounds.x, y: o.y - bounds.y });
    const spawnObjects = objects('spawns').filter(included);
    if (spawnObjects.some(o => props(o).team !== 0 && props(o).team !== 1))
        throw new Error('Unsupported spawn team');
    const spawns = [0, 1].map(team => spawnObjects.filter(o => props(o).team === team).map(point)) as [
        {
            x: number;
            y: number;
        }[],
        {
            x: number;
            y: number;
        }[]
    ];
    if (spawns.some(team => team.length < 2))
        throw new Error('Two spawns per team required');
    const objectiveObjects = objects('objectives').filter(included).sort((a, b) => Number(props(a).order) - Number(props(b).order));
    if (objectiveObjects.length !== 3 || objectiveObjects.some((o, i) => props(o).order !== i))
        throw new Error('Three ordered objectives required');
    const sites = objectiveObjects.map(o => ({ id: String(o.id), ...point(o) }));
    const landmarks = objects('landmarks').map(o => ({ id: o.id, name: o.name, ...point(o) })).filter(o => o.x >= 0 && o.y >= 0 && o.x < bounds.width && o.y < bounds.height);
    const result: GameMap = { version: 1, id: 'relay-yard-' + layout, width, height, tileSize: 32, terrain, walls, spawns, sites, landmarks };
    validateMap(result);
    for (const p of [...spawns.flat(), ...sites])
        if (p.x < 20 || p.y < 20 || p.x > bounds.width - 20 || p.y > bounds.height - 20 || walls.some(w => { const x = Math.max(w.x, Math.min(p.x, w.x + w.width)), y = Math.max(w.y, Math.min(p.y, w.y + w.height)); return Math.hypot(p.x - x, p.y - y) < 20; }))
            throw new Error('Spawn/objective lacks hull clearance');
    return result;
}
export const relayMap = normalizeRelay(raw, 'full'), relaySmallMap = normalizeRelay(raw, 'small');
