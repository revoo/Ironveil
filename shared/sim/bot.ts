import type { Observation } from './match';
import { findPath } from './navigation';
import type { GameMap } from '../content';
import { neutralInput, type DriveInput } from './index';
import { segmentBox, type WeaponAction } from './combat';
export interface BotState {
    seed: number;
    drive: DriveInput;
    actions: WeaponAction[];
    path: {
        x: number;
        y: number;
    }[];
    goal?: {
        x: number;
        y: number;
    };
    planned: number;
    lastPosition?: {
        x: number;
        y: number;
    };
    stuck: number;
    targetId?: number;
    acquired?: number;
}
export function newBotState(seed: number): BotState { return { seed, drive: neutralInput(), actions: [], path: [], planned: -100, stuck: 0 }; }
/** Deliberately accepts only authorized team observations and static map geometry. */
export function botIntent(o: Observation, id: number, map: GameMap, s: BotState): void {
    const self = o.allies.find(a => a.id === id);
    s.actions = [];
    if (!self || self.hp <= 0) {
        s.drive = neutralInput();
        return;
    }
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    const enemy = o.enemies.filter(e => !map.walls.some(w => segmentBox(self.x, self.y, e.x - self.x, e.y - self.y, w) !== undefined)).sort((a, b) => Math.hypot(a.x - self.x, a.y - self.y) - Math.hypot(b.x - self.x, b.y - self.y))[0];
    let aim = self.turret;
    if (enemy) {
        if (s.targetId !== enemy.id) {
            s.targetId = enemy.id;
            s.acquired = o.tick;
        }
        aim = Math.atan2(enemy.y - self.y, enemy.x - self.x) + (s.seed / 0xffffffff - 0.5) * 0.1;
        const aligned = Math.abs(Math.atan2(Math.sin(aim - self.turret), Math.cos(aim - self.turret))) < 0.13;
        if (o.tick - (s.acquired ?? o.tick) >= 8 && aligned && self.weapon === 'ready')
            s.actions.push('press');
        if (self.weapon === 'charging' && aligned && self.charge >= (Math.hypot(enemy.x - self.x, enemy.y - self.y) > 280 ? 0.55 : 0.15))
            s.actions.push('release');
    }
    else {
        s.targetId = undefined;
        s.acquired = undefined;
        if (self.weapon === 'charging')
            s.actions.push('cancel');
    }
    const goal = { x: o.zone.x + (id % 2 ? -24 : 24), y: o.zone.y + (id % 2 ? 24 : -24) };
    if (!s.goal || Math.hypot(goal.x - s.goal.x, goal.y - s.goal.y) > 32 || o.tick - s.planned >= 60 || s.path.length === 0) {
        s.path = findPath(map, self, goal);
        s.goal = goal;
        s.planned = o.tick;
    }
    while (s.path.length && Math.hypot(s.path[0].x - self.x, s.path[0].y - self.y) < 18)
        s.path.shift();
    if (o.tick % 60 < 10) {
        if (s.lastPosition && Math.hypot(self.x - s.lastPosition.x, self.y - s.lastPosition.y) < 8)
            s.stuck++;
        else
            s.stuck = 0;
        s.lastPosition = { x: self.x, y: self.y };
        if (s.stuck >= 2) {
            s.path = findPath(map, self, { x: goal.x, y: goal.y + ((s.seed % 2) ? 64 : -64) });
            s.stuck = 0;
        }
    }
    const waypoint = s.path[0];
    let x = waypoint ? waypoint.x - self.x : 0, y = waypoint ? waypoint.y - self.y : 0;
    if (Math.hypot(self.x - goal.x, self.y - goal.y) < 40) {
        x = 0;
        y = 0;
    }
    s.drive = { x, y, aim, silent: false };
}
