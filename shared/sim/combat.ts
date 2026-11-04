import type { GameMap } from '../content';
import type { Tank } from './index';
export const CANNON = Object.freeze({ fullTicks: 45, holdTicks: 45, reloadTicks: 20, cancelTicks: 8, ventTicks: 24, range: 900 });
export type WeaponAction = 'press' | 'release' | 'cancel';
export type WeaponState = 'ready' | 'charging' | 'reloading' | 'cancel recovery' | 'vent recovery';
export interface Shell { id: number; x: number; y: number; angle: number; speed: number; damage: number; remaining: number; charge: number }
export interface Dummy { x: number; y: number; hp: number; reset: number }
export interface CombatView { weapon: WeaponState; charge: number; remainingTicks: number; shells: Shell[]; targets: Dummy[]; hits: number }
/** Swept point against an axis-aligned box; returns normalized first impact. */
export function segmentBox(x: number, y: number, dx: number, dy: number, box: { x: number; y: number; width: number; height: number }): number | undefined {
  let near = 0, far = 1;
  for (const [p, d, lo, hi] of [[x, dx, box.x, box.x + box.width], [y, dy, box.y, box.y + box.height]]) {
    if (Math.abs(d) < 1e-10) { if (p < lo || p > hi) return; }
    else { const a = (lo - p) / d, b = (hi - p) / d; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); if (near > far) return; }
  }
  return near;
}
export function segmentCircle(x: number, y: number, dx: number, dy: number, cx: number, cy: number, radius: number): number | undefined {
  const ox = x - cx, oy = y - cy, a = dx * dx + dy * dy, c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  if (a === 0) return;
  const b = 2 * (ox * dx + oy * dy), disc = b * b - 4 * a * c;
  if (disc < 0) return;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t >= 0 && t <= 1) return t;
}
export class CombatSandbox {
  weapon: WeaponState = 'ready';
  private timer = 0;
  private chargingTicks = 0;
  private nextId = 1;
  shells: Shell[] = [];
  targets: Dummy[] = [{ x: 350, y: 272, hp: 100, reset: 0 }, { x: 700, y: 600, hp: 100, reset: 0 }];
  hits = 0;
  get charge(): number { return Math.min(1, this.chargingTicks / CANNON.fullTicks); }
  get mobility(): number { return this.weapon === 'charging' ? 1 - 0.45 * this.charge : 1; }
  view(): CombatView { return { weapon: this.weapon, charge: this.weapon === 'charging' ? this.charge : 0, remainingTicks: this.weapon === 'charging' ? CANNON.fullTicks + CANNON.holdTicks - this.chargingTicks : this.timer, shells: this.shells, targets: this.targets, hits: this.hits }; }
  cancel(): void { if (this.weapon === 'charging') { this.weapon = 'cancel recovery'; this.timer = CANNON.cancelTicks; this.chargingTicks = 0; } }
  step(tank: Tank, map: GameMap, actions: WeaponAction[]): void {
    if (this.weapon !== 'ready' && this.weapon !== 'charging' && --this.timer <= 0) this.weapon = 'ready';
    if (this.weapon === 'charging') {
      this.chargingTicks++;
      if (this.chargingTicks >= CANNON.fullTicks + CANNON.holdTicks) { this.weapon = 'vent recovery'; this.timer = CANNON.ventTicks; }
    }
    for (const action of actions) {
      if (action === 'cancel') this.cancel();
      else if (action === 'press' && this.weapon === 'ready') { this.weapon = 'charging'; this.chargingTicks = 0; }
      else if (action === 'release' && this.weapon === 'charging') {
        const charge = this.charge, dx = Math.cos(tank.turret) * 34, dy = Math.sin(tank.turret) * 34;
        // Muzzle clearance uses the entire firing segment, not just its endpoint.
        if (!map.walls.some(w => segmentBox(tank.x, tank.y, dx, dy, w) !== undefined)) this.shells.push({ id: this.nextId++, x: tank.x + dx, y: tank.y + dy, angle: tank.turret, speed: 400 + charge * 350, damage: 22 + charge * 33, remaining: CANNON.range, charge });
        this.weapon = 'reloading'; this.timer = CANNON.reloadTicks;
      }
    }
    for (const target of this.targets) if (target.hp <= 0 && --target.reset <= 0) target.hp = 100;
    const survivors: Shell[] = [];
    for (const shell of this.shells) {
      const distance = Math.min(shell.speed / 30, shell.remaining), dx = Math.cos(shell.angle) * distance, dy = Math.sin(shell.angle) * distance;
      let earliest = Infinity; let victim: Dummy | undefined;
      for (const wall of map.walls) { const t = segmentBox(shell.x, shell.y, dx, dy, wall); if (t !== undefined && t < earliest) earliest = t; }
      for (const target of this.targets) { if (target.hp <= 0) continue; const t = segmentCircle(shell.x, shell.y, dx, dy, target.x, target.y, 20); if (t !== undefined && t < earliest) { earliest = t; victim = target; } }
      if (earliest !== Infinity) { if (victim) { victim.hp = Math.max(0, victim.hp - shell.damage); if (victim.hp === 0) victim.reset = 90; this.hits++; } continue; }
      shell.x += dx; shell.y += dy; shell.remaining -= distance;
      if (shell.remaining > 0 && shell.x >= 0 && shell.y >= 0 && shell.x <= map.width * map.tileSize && shell.y <= map.height * map.tileSize) survivors.push(shell);
    }
    this.shells = survivors;
  }
}
