import {segmentBox,segmentCircle} from './combat';
import {TUNING,type GameMap} from '../content';
export interface Point {
    x: number;
    y: number;
}
/** Four-neighbour weighted A*: conservative wall inflation keeps the circular hull clear. */
export function findPath(map: GameMap, start: Point, goal: Point, extraCost?: (point:Point)=>number): Point[] {
    const size = map.tileSize, width = map.width, count = width * map.height;
    const cell = (p: Point) => Math.floor(p.y / size) * width + Math.floor(p.x / size);
    const point = (n: number): Point => ({ x: (n % width + 0.5) * size, y: (Math.floor(n / width) + 0.5) * size });
    const inside = (p: Point) => p.x >= 20 && p.y >= 20 && p.x <= width * size - 20 && p.y <= map.height * size - 20;
    if (!inside(start) || !inside(goal))
        return [];
    const openCell = (n: number) => { const p = point(n); return inside(p) && !map.walls.some(w => p.x > w.x - 24 && p.x < w.x + w.width + 24 && p.y > w.y - 24 && p.y < w.y + w.height + 24); };
    const first = cell(start), last = cell(goal);
    if (!openCell(last))return [];
    if(!openCell(first)){
        // Drift can enter a hull-sized gap with no conservative grid-center node.
        // Join the grid through a short swept-hull-safe segment, never through a wall.
        const candidates:number[]=[];
        for(let y=Math.max(0,Math.floor(start.y/size)-4);y<Math.min(map.height,Math.floor(start.y/size)+5);y++)for(let x=Math.max(0,Math.floor(start.x/size)-4);x<Math.min(width,Math.floor(start.x/size)+5);x++){
            const n=y*width+x,p=point(n),r=TUNING.tankRadius-1e-6;
            if(openCell(n)&&!map.walls.some(w=>{
                const dx=p.x-start.x,dy=p.y-start.y;
                const strips=[{x:w.x-r,y:w.y,width:w.width+2*r,height:w.height},{x:w.x,y:w.y-r,width:w.width,height:w.height+2*r}];
                return strips.some(box=>segmentBox(start.x,start.y,dx,dy,box)!==undefined)||[w.x,w.x+w.width].some(x=>[w.y,w.y+w.height].some(y=>segmentCircle(start.x,start.y,dx,dy,x,y,r)!==undefined));
            }))candidates.push(n);
        }
        candidates.sort((a,b)=>Math.hypot(point(a).x-start.x,point(a).y-start.y)+Math.hypot(point(a).x-goal.x,point(a).y-goal.y)-Math.hypot(point(b).x-start.x,point(b).y-start.y)-Math.hypot(point(b).x-goal.x,point(b).y-goal.y));
        for(const n of candidates.slice(0,4)){const p=point(n);if(n===last)return[p];const rest=findPath(map,p,goal,extraCost);if(rest.length)return[p,...rest];}
        return [];
    }
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
            const cost = costs[n] + terrainCost[map.terrain[next]] + Math.max(0,extraCost?.(point(next))??0);
            if (cost < costs[next]) {
                costs[next] = cost;
                parent[next] = n;
                open.push(next);
            }
        }
    }
    return [];
}
