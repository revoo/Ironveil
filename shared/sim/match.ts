import { SOLO_LAYOUT } from '../content/solo-layout';
import { type GameMap } from '../content';
import { driveTank, neutralInput, type DriveInput, type Tank } from './index';
import { CombatSandbox, segmentBox, segmentCircle, type Shell, type WeaponAction, type CombatEvent, type WeaponState } from './combat';
import { botIntent, newBotState, type BotState } from './bot';
export type Team = 0 | 1;
export interface Actor extends Tank {
    id: number;
    team: Team;
    hp: number;
    respawn: number;
    protection: number;
    cannon: CombatSandbox;
}
export interface ActorView extends Tank {
    id: number;
    team: Team;
    hp: number;
    respawn: number;
    protection: number;
    weapon: WeaponState;
    charge: number;
    remainingTicks: number;
}
export interface Observation {
    tick: number;
    paused: boolean;
    allies: ActorView[];
    enemies: ActorView[];
    zone: {
        x: number;
        y: number;
    };
    nextZone: {
        x: number;
        y: number;
    };
    rotationIn: number;
    scores: number[];
    secondsLeft: number;
    sudden: boolean;
    result: Team | 'draw' | null;
    shells: Shell[];
    events: CombatEvent[];
}
export interface MatchShell extends Shell {
    team: Team;
}
const sites = SOLO_LAYOUT.sites;
const spawnPoints = SOLO_LAYOUT.spawns;
export function clearSight(map: GameMap, a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}): boolean { return !map.walls.some(w => segmentBox(a.x, a.y, b.x - a.x, b.y - a.y, w) !== undefined); }
export class SoloMatch {
    actors: Actor[] = [];
    scores: number[] = [0, 0];
    tick = 0;
    botsEnabled = true;
    result: Team | 'draw' | null = null;
    sudden = false;
    paused = false;
    shells: MatchShell[] = [];
    events: CombatEvent[] = [];
    private nextShell = 1;
    private nextEvent = 1;
    private botStates: BotState[] = [];
    constructor(readonly map: GameMap, readonly seed = 1) { this.restart(); }
    get zone(): {
        x: number;
        y: number;
    } { return sites[Math.floor(this.tick / 1800) % 3]; }
    restart(): void { this.tick = 0; this.scores = [0, 0]; this.result = null; this.sudden = false; this.paused = false; this.shells = []; this.events = []; this.actors = Array.from({ length: 4 }, (_, id) => { const team = (id < 2 ? 0 : 1) as Team; return { id, team, ...spawnPoints[team][id % 2], hp: 100, hull: team === 0 ? 0 : Math.PI, turret: team === 0 ? 0 : Math.PI, speed: 0, respawn: 0, protection: 60, cannon: new CombatSandbox() }; }); this.botStates = this.actors.map(a => newBotState(a.id + 1 + this.seed * 100)); }
    setPaused(value: boolean): void { this.paused = value; this.events = []; for (const a of this.actors)
        a.cannon.cancel(); for (const b of this.botStates) {
        b.actions = [];
        b.drive = neutralInput();
    } }
    neutralize(): void { this.actors[0].cannon.cancel(); }
    private actorView(a: Actor): ActorView { const w = a.cannon.view(); return { id: a.id, team: a.team, x: a.x, y: a.y, hull: a.hull, turret: a.turret, speed: a.speed, hp: a.hp, respawn: a.respawn, protection: a.protection, weapon: w.weapon, charge: w.charge, remainingTicks: w.remainingTicks }; }
    view(team: Team): Observation {
        const allies = this.actors.filter(a => a.team === team), observers = allies.filter(a => a.hp > 0);
        const visible = (p: {
            x: number;
            y: number;
        }) => observers.some(a => Math.hypot(a.x - p.x, a.y - p.y) <= 440 && clearSight(this.map, a, p));
        return { tick: this.tick, paused: this.paused, allies: allies.map(a => this.actorView(a)), enemies: this.actors.filter(a => a.team !== team && a.hp > 0 && visible(a)).map(a => this.actorView(a)), zone: { ...this.zone }, nextZone: { ...sites[(Math.floor(this.tick / 1800) + 1) % 3] }, rotationIn: (1800 - this.tick % 1800) / 30, scores: [...this.scores], secondsLeft: Math.max(0, ((this.sudden ? 14400 : 12600) - this.tick) / 30), sudden: this.sudden, result: this.result, shells: this.shells.filter(visible).map(s => ({ id: s.id, x: s.x, y: s.y, angle: s.angle, speed: s.speed, damage: s.damage, remaining: s.remaining, charge: s.charge, hostile: s.team !== team })), events: this.events.filter(visible).map(e => ({ ...e })) };
    }
    private spawn(a: Actor): void { const enemies = this.actors.filter(e => e.team !== a.team && e.hp > 0); const options = [...spawnPoints[a.team]].sort((p, q) => { const score = (v: {
        x: number;
        y: number;
    }) => Math.min(...enemies.map(e => Math.hypot(e.x - v.x, e.y - v.y) - (clearSight(this.map, e, v) ? 300 : 0)), 5000); return score(q) - score(p); }); Object.assign(a, options[0], { hp: 100, speed: 0, vx: 0, vy: 0, respawn: 0, protection: 60, hull: a.team === 0 ? 0 : Math.PI, turret: a.team === 0 ? 0 : Math.PI }); a.cannon.reset(); this.botStates[a.id] = newBotState(a.id + 1 + this.tick + this.seed * 100); }
    step(input: DriveInput = neutralInput(), actions: WeaponAction[] = []): void {
        if (this.paused || this.result !== null)
            return;
        this.events = [];
        const old = new Map(this.actors.map(a => [a.id, { x: a.x, y: a.y }]));
        const intents = this.actors.map(a => ({ drive: a.id === 0 ? input : neutralInput(), actions: a.id === 0 ? actions : [] as WeaponAction[] }));
        if (this.botsEnabled)
            for (const a of this.actors.filter(a => a.id !== 0 && a.hp > 0)) {
                const b = this.botStates[a.id];
                if (this.tick % 5 === a.id % 5)
                    botIntent(this.view(a.team), a.id, this.map, b);
                intents[a.id] = { drive: b.drive, actions: b.actions };
                b.actions = [];
            }
        for (const a of this.actors) {
            if (a.hp <= 0) {
                if (--a.respawn <= 0)
                    this.spawn(a);
                continue;
            }
            a.protection = Math.max(0, a.protection - 1);
            driveTank(a, intents[a.id].drive, this.map, a.cannon.mobility);
            if (Math.hypot(a.x-this.zone.x,a.y-this.zone.y)<=90) a.protection=0;
        }
        for (const a of this.actors) {
            if (a.hp <= 0)
                continue;
            a.cannon.hp = a.hp;
            a.cannon.advanceWeapon(a, this.map, intents[a.id].actions);
            for (const e of a.cannon.view().events) {
                if (e.kind === 'shot')
                    a.protection = 0;
                this.events.push({ ...e, id: this.nextEvent++ });
            }
            for (const shell of a.cannon.shells)
                this.shells.push({ ...shell, id: this.nextShell++, team: a.team });
            a.cannon.shells = [];
        }
        const damage = new Map<number, number>(), survivors: MatchShell[] = [];
        for (const s of this.shells) {
            const distance = Math.min(s.speed / 30, s.remaining), dx = Math.cos(s.angle) * distance, dy = Math.sin(s.angle) * distance;
            let earliest = Infinity;
            let victim: Actor | undefined;
            for (const wall of this.map.walls) {
                const t = segmentBox(s.x, s.y, dx, dy, wall);
                if (t !== undefined && t < earliest)
                    earliest = t;
            }
            for (const a of this.actors) {
                if (a.team === s.team || a.hp <= 0 || a.protection > 0)
                    continue;
                const p = old.get(a.id)!;
                const t = segmentCircle(s.x, s.y, dx - (a.x - p.x), dy - (a.y - p.y), p.x, p.y, 20);
                if (t !== undefined && t < earliest) {
                    earliest = t;
                    victim = a;
                }
            }
            if (earliest !== Infinity) {
                if (victim)
                    damage.set(victim.id, (damage.get(victim.id) ?? 0) + s.damage);
                this.events.push({ id: this.nextEvent++, kind: 'impact', x: s.x + dx * earliest, y: s.y + dy * earliest, charge: s.charge });
                continue;
            }
            s.x += dx;
            s.y += dy;
            s.remaining -= distance;
            if (s.remaining > 0 && s.x >= 0 && s.y >= 0 && s.x <= this.map.width * this.map.tileSize && s.y <= this.map.height * this.map.tileSize)
                survivors.push(s);
        }
        this.shells = survivors;
        for (const [id, amount] of damage) {
            const a = this.actors[id];
            a.hp = Math.max(0, a.hp - amount);
            if (a.hp === 0) {
                a.respawn = 150;
                a.speed = 0;
                a.cannon.hp = 0;
                a.cannon.cancel();
                this.events.push({ id: this.nextEvent++, kind: 'destruction', x: a.x, y: a.y, charge: 0 });
            }
        }
        const occupants = this.actors.filter(a => a.hp > 0 && Math.hypot(a.x - this.zone.x, a.y - this.zone.y) <= 90);
        for (const a of occupants)
            a.protection = 0;
        let scoring: Team | undefined;
        if (occupants.length && occupants.every(a => a.team === occupants[0].team))
            scoring = occupants[0].team;
        if ((this.tick + 1) % 30 === 0 && scoring !== undefined) {
            this.scores[scoring]++;
            if (this.sudden)
                this.result = scoring;
        }
        this.tick++;
        if (this.scores[0] >= 180)
            this.result = 0;
        else if (this.scores[1] >= 180)
            this.result = 1;
        if (this.tick >= 12600 && !this.sudden && this.result === null) {
            if (this.scores[0] !== this.scores[1])
                this.result = this.scores[0] > this.scores[1] ? 0 : 1;
            else
                this.sudden = true;
        }
        if (this.tick >= 14400 && this.result === null)
            this.result = 'draw';
        this.events = this.events.slice(-64);
    }
}
