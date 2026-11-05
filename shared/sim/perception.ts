import type { GameMap } from '../content';
import { terrainAt } from './index';
import { segmentBox, segmentCircle } from './combat';
export interface Point {
    x: number;
    y: number;
}
export interface Smoke extends Point {
    id: number;
    expires: number;
}
export interface Track extends Point {
    id: string;
    axis: number;
    expires: number;
    stage: number;
}
export interface Sighting extends Point {
    id: number;
    expires: number;
}
export interface SoundCue {
    id: number;
    kind: 'engine' | 'charge' | 'shot' | 'smoke';
    sector: number;
    band: 'near' | 'far';
    expires: number;
}
export interface RawSound extends Point {
    id: number;
    source: number;
    team: number;
    kind: SoundCue['kind'];
    radius: number;
    expires: number;
}
export function groundSight(map: GameMap, smokes: Smoke[], from: Point, to: Point, radius = 440): boolean {
    const dx = to.x - from.x, dy = to.y - from.y;
    return Math.hypot(dx, dy) <= radius && !map.walls.some(w => segmentBox(from.x, from.y, dx, dy, w) !== undefined) && !smokes.some(s => segmentCircle(from.x, from.y, dx, dy, s.x, s.y, 100) !== undefined);
}
export function tankSight(map: GameMap, smokes: Smoke[], from: Point, target: Point & {
    revealUntil: number;
}, tick: number): boolean {
    return groundSight(map, smokes, from, target) && (terrainAt(map, target.x, target.y) !== 'brush' || target.revealUntil > tick || Math.hypot(target.x - from.x, target.y - from.y) <= 110);
}
