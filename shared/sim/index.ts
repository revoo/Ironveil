import { TUNING, type GameMap, type Terrain } from '../content';

export interface DriveInput { x: number; y: number; aim: number; silent: boolean }
export interface Tank { x: number; y: number; hull: number; turret: number; speed: number; vx?: number; vy?: number }
export const neutralInput = (): DriveInput => ({ x: 0, y: 0, aim: 0, silent: false });
const DT = 1 / TUNING.tickRate;
const factors: Record<Terrain, number> = { grass: 1, road: 1.1, mud: 0.65, brush: 0.8 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
function approachAngle(current: number, target: number, max: number): number {
  return wrap(current + Math.max(-max, Math.min(max, wrap(target - current))));
}
export function terrainAt(map: GameMap, x: number, y: number): Terrain {
  const tx = Math.max(0, Math.min(map.width - 1, Math.floor(x / map.tileSize)));
  const ty = Math.max(0, Math.min(map.height - 1, Math.floor(y / map.tileSize)));
  return map.terrain[ty * map.width + tx];
}
export function speedCap(map: GameMap, x: number, y: number, silent: boolean): number {
  return TUNING.grassSpeed * factors[terrainAt(map, x, y)] * (silent ? 0.4 : 1);
}
function blocked(map: GameMap, x: number, y: number): boolean {
  const r = TUNING.tankRadius;
  if (x < r || y < r || x > map.width * map.tileSize - r || y > map.height * map.tileSize - r) return true;
  return map.walls.some(w => {
    const cx = Math.max(w.x, Math.min(x, w.x + w.width));
    const cy = Math.max(w.y, Math.min(y, w.y + w.height));
    return (x - cx) ** 2 + (y - cy) ** 2 < r ** 2;
  });
}
/** Fixed-step movement shared by every host. Angles are world-relative radians. */
export function driveTank(tank: Tank, input: DriveInput, map: GameMap, mobility = 1): void {
  const magnitude = Math.hypot(input.x, input.y);
  const moving = Number.isFinite(magnitude) && magnitude > 0;
  if (moving) tank.hull = approachAngle(tank.hull, Math.atan2(input.y, input.x), TUNING.hullTurn * DT);
  if (Number.isFinite(input.aim)) tank.turret = approachAngle(tank.turret, input.aim, TUNING.turretTurn * DT);
  const cap = speedCap(map, tank.x, tank.y, input.silent) * mobility;
  const desiredX = moving ? input.x / magnitude * cap : 0;
  const desiredY = moving ? input.y / magnitude * cap : 0;
  // World velocity persists independently of the hull: steering redirects momentum, not position.
  let vx = tank.vx ?? Math.cos(tank.hull) * tank.speed;
  let vy = tank.vy ?? Math.sin(tank.hull) * tank.speed;
  const blend = 1 - Math.exp(-DT / (moving ? TUNING.driveResponseSeconds : TUNING.coastDragSeconds));
  vx += (desiredX - vx) * blend; vy += (desiredY - vy) * blend;
  if (moving && Math.hypot(vx-desiredX,vy-desiredY)<0.05) { vx=desiredX;vy=desiredY; }
  if (!moving && Math.hypot(vx,vy)<2) { vx=0;vy=0; }
  const dx=vx*DT,dy=vy*DT;
  // Remove only the blocked velocity component so cover allows a tangential slide.
  if (!blocked(map,tank.x+dx,tank.y)) tank.x+=dx; else vx=0;
  if (!blocked(map,tank.x,tank.y+dy)) tank.y+=dy; else vy=0;
  tank.vx=vx;tank.vy=vy;tank.speed=Math.hypot(vx,vy);

}
export class Simulation {
  private ticks = 0;
  readonly tank: Tank = { x: 160, y: 272, hull: 0, turret: 0, speed: 0 };
  constructor(private readonly map?: GameMap) {}
  get tick(): number { return this.ticks; }
  get elapsedSeconds(): number { return this.ticks / TUNING.tickRate; }
  step(input: DriveInput = neutralInput()): void { if (this.map) driveTank(this.tank, input, this.map); this.ticks++; }
}
