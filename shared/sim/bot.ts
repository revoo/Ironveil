import type { Observation } from './match';
import { findPath } from './navigation';
import type { GameMap } from '../content';
import { neutralInput, type DriveInput } from './index';
import { segmentBox, type WeaponAction } from './combat';
export interface BotState {
    mode?: 'navigate' | 'attack' | 'investigate' | 'reposition';
    smoke?: boolean;
    investigateUntil?: number;
    investigateGoal?: {
        x: number;
        y: number;
    };
    repositionUntil?: number;
    repositionGoal?: {
        x: number;
        y: number;
    };
    evidenceId?: string | number;
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
    s.smoke = false;
    s.mode = 'navigate';
    if (!self || self.hp <= 0) {
        s.drive = neutralInput();
        return;
    }
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    const enemy = o.enemies.filter(e => !map.walls.some(w => segmentBox(self.x, self.y, e.x - self.x, e.y - self.y, w) !== undefined)).sort((a, b) => Math.hypot(a.x - self.x, a.y - self.y) - Math.hypot(b.x - self.x, b.y - self.y))[0];
    let aim = self.turret;
    if (enemy) {
        s.mode = 'attack';
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
    let goal = { x: o.zone.x + (id % 2 ? -24 : 24), y: o.zone.y + (id % 2 ? 24 : -24) };
    if (enemy && self.hp <= 35 && self.smokeIn === 0) {
        s.smoke = true;
        s.repositionUntil = o.tick + 60;
        const direction = Math.atan2(self.y - enemy.y, self.x - enemy.x);
        s.repositionGoal = { x: Math.max(48, Math.min(map.width * 32 - 48, self.x + Math.cos(direction + 0.5) * 160)), y: Math.max(48, Math.min(map.height * 32 - 48, self.y + Math.sin(direction + 0.5) * 160)) };
    }
    if (!enemy) {
        const sight = o.sightings.find(e => e.expires > o.tick);
        const track = o.tracks.filter(t => t.stage === 0 && t.expires > o.tick && Math.hypot(t.x - self.x, t.y - self.y) < 250).sort((a, b) => Math.hypot(a.x - self.x, a.y - self.y) - Math.hypot(b.x - self.x, b.y - self.y))[0];
        const sound = o.sounds.find(s => s.expires > o.tick);
        const evidence = sight ?? track;
        const evidenceId = evidence?.id ?? sound?.id;
        if (evidenceId !== undefined && evidenceId !== s.evidenceId) {
            s.evidenceId = evidenceId;
            s.investigateUntil = o.tick + 60;
            s.investigateGoal = evidence ? { x: evidence.x, y: evidence.y } : { x: Math.max(48, Math.min(map.width * 32 - 48, self.x + Math.cos(sound!.sector * Math.PI / 4) * 160)), y: Math.max(48, Math.min(map.height * 32 - 48, self.y + Math.sin(sound!.sector * Math.PI / 4) * 160)) };
        }
        if ((s.investigateUntil ?? 0) > o.tick && s.investigateGoal) {
            goal = s.investigateGoal;
            s.mode = 'investigate';
        }
    }
    if ((s.repositionUntil ?? 0) > o.tick && s.repositionGoal) {
        goal = s.repositionGoal;
        s.mode = 'reposition';
    }
    if (!s.goal || Math.hypot(goal.x - s.goal.x, goal.y - s.goal.y) > 32 || o.tick - s.planned >= 60 || s.path.length === 0) {
        s.path = findPath(map, self, goal);
        if (!s.path.length && Math.hypot(self.x - o.zone.x, self.y - o.zone.y) > 40) {
            goal = { ...o.zone };
            s.path = findPath(map, self, goal);
            s.mode = 'navigate';
        }
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
    s.drive = { x, y, aim, silent: s.mode === 'investigate' && Math.hypot(self.x - goal.x, self.y - goal.y) < 160 };
}
