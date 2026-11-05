import {SKILL,type Difficulty} from '../content/difficulty';
import type { Observation } from './match';
import { findPath } from './navigation';
import type { GameMap } from '../content';
import { neutralInput, type DriveInput } from './index';
import { segmentBox, type WeaponAction } from './combat';
export interface BotState {
    searchIndex?: number;
    searchUntil?: number;
    visitedEvidence?: (string | number)[];
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
export function botIntent(o: Observation, id: number, map: GameMap, s: BotState,difficulty:Difficulty='normal'): void {
    const skill=SKILL[difficulty];
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
        aim = Math.atan2(enemy.y - self.y, enemy.x - self.x) + (s.seed / 0xffffffff - 0.5) * skill.aimError;
        const aligned = Math.abs(Math.atan2(Math.sin(aim - self.turret), Math.cos(aim - self.turret))) < 0.13;
        if (o.tick - (s.acquired ?? o.tick) >= skill.reactionTicks && aligned && self.weapon === 'ready')
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
    // Static landmarks are search waypoints, never knowledge of hidden tanks.
    s.searchIndex ??= (s.seed + id) % o.searchAreas.length;
    let search = o.searchAreas[s.searchIndex];
    if (Math.hypot(self.x-search.x,self.y-search.y)<64 || (s.searchUntil ?? 0)<=o.tick) {
        s.searchIndex = (s.searchIndex+1)%o.searchAreas.length;
        s.searchUntil = o.tick+600;
        search=o.searchAreas[s.searchIndex];
    }
    let goal = {...search};
    if (enemy) {
        // Approach distant contacts; orbit nearby contacts instead of parking to shoot.
        const angle=Math.atan2(self.y-enemy.y,self.x-enemy.x);
        const flank=(id%2?1:-1)*(Math.floor(o.tick/90)%2?0.65:0.35);
        goal={x:enemy.x+Math.cos(angle+flank)*190,y:enemy.y+Math.sin(angle+flank)*190};
    }
    if (enemy && self.hp <= 35 && self.smokeIn === 0) {
        s.smoke = true;
        s.repositionUntil = o.tick + 60;
        const direction = Math.atan2(self.y - enemy.y, self.x - enemy.x);
        s.repositionGoal = { x: Math.max(48, Math.min(map.width * map.tileSize - 48, self.x + Math.cos(direction + 0.5) * 160)), y: Math.max(48, Math.min(map.height * map.tileSize - 48, self.y + Math.sin(direction + 0.5) * 160)) };
    }
    if (!enemy) {
        const sight = o.sightings.find(e => e.expires > o.tick && o.tick-(e.expires-90)<=skill.memoryTicks);
        const track = o.tracks.filter(t => t.stage === 0 && t.expires > o.tick && Math.hypot(t.x - self.x, t.y - self.y) < 250).sort((a, b) => Math.hypot(a.x - self.x, a.y - self.y) - Math.hypot(b.x - self.x, b.y - self.y))[0];
        const sound = o.sounds.find(s => s.expires > o.tick);
        const evidence = sight ?? track;
        const evidenceId = evidence?.id ?? sound?.id;
        if (evidenceId !== undefined && !(s.visitedEvidence ?? []).includes(evidenceId)) {
            s.evidenceId = evidenceId;
            s.visitedEvidence = [...(s.visitedEvidence ?? []), evidenceId].slice(-64);
            s.investigateUntil = o.tick + skill.investigateTicks;
            s.investigateGoal = evidence ? { x: evidence.x, y: evidence.y } : { x: Math.max(48, Math.min(map.width * map.tileSize - 48, self.x + Math.cos(sound!.sector * Math.PI / 4) * 160)), y: Math.max(48, Math.min(map.height * map.tileSize - 48, self.y + Math.sin(sound!.sector * Math.PI / 4) * 160)) };
        }
        if (s.investigateGoal && Math.hypot(self.x-s.investigateGoal.x,self.y-s.investigateGoal.y)<40)
            s.investigateUntil=0;
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
        if (!s.path.length && Math.hypot(self.x - search.x, self.y - search.y) > 40) {
            goal = { ...search };
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
