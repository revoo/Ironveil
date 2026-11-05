import { type GameMap } from '../content';
export interface Point {
    x: number;
    y: number;
}
/** Four-neighbour weighted A*: conservative wall inflation keeps the circular hull clear. */
export function findPath(map: GameMap, start: Point, goal: Point): Point[] {
    const size = map.tileSize, width = map.width, count = width * map.height;
    const cell = (p: Point) => Math.floor(p.y / size) * width + Math.floor(p.x / size);
    const point = (n: number): Point => ({ x: (n % width + 0.5) * size, y: (Math.floor(n / width) + 0.5) * size });
    const inside = (p: Point) => p.x >= 20 && p.y >= 20 && p.x <= width * size - 20 && p.y <= map.height * size - 20;
    if (!inside(start) || !inside(goal))
        return [];
    const openCell = (n: number) => { const p = point(n); return inside(p) && !map.walls.some(w => p.x > w.x - 24 && p.x < w.x + w.width + 24 && p.y > w.y - 24 && p.y < w.y + w.height + 24); };
    const first = cell(start), last = cell(goal);
    if (!openCell(last))
        return [];
    const costs = new Float64Array(count).fill(Infinity), parent = new Int32Array(count).fill(-1), closed = new Uint8Array(count), open = [first];
    costs[first] = 0;
    const h = (n: number) => Math.abs(n % width - last % width) + Math.abs(Math.floor(n / width) - Math.floor(last / width));
    const terrainCost = { grass: 1, road: 1 / 1.1, mud: 1 / 0.65, brush: 1 / 0.8 };
    while (open.length) {
        open.sort((a, b) => (costs[b] + h(b) * 0.9) - (costs[a] + h(a) * 0.9));
        const n = open.pop()!;
        if (closed[n])
            continue;
        if (n === last) {
            const result: Point[] = [];
            for (let at = last; at !== first; at = parent[at]) {
                if (at < 0)
                    return [];
                result.push(point(at));
            }
            return result.reverse();
        }
        closed[n] = 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = n % width + dx, y = Math.floor(n / width) + dy;
            if (x < 0 || y < 0 || x >= width || y >= map.height)
                continue;
            const next = y * width + x;
            if (closed[next] || !openCell(next))
                continue;
            const cost = costs[n] + terrainCost[map.terrain[next]];
            if (cost < costs[next]) {
                costs[next] = cost;
                parent[next] = n;
                open.push(next);
            }
        }
    }
    return [];
}
