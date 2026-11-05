import type {Difficulty} from '../content/difficulty';
import { groundSight, tankSight, type Smoke, type Track, type Sighting, type SoundCue, type RawSound } from './perception';
import { terrainAt, speedCap } from './index';
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
    smokeReady: number;
    revealUntil: number;
    silent: boolean;
    trackDistance: number;
    lastTrack: number;
}
export interface ActorView extends Tank {
    id: number;
    team: Team;
    hp: number;
    respawn: number;
    protection: number;
    smokeIn: number;
    quiet: boolean;
    revealed: boolean;
    weapon: WeaponState;
    charge: number;
    remainingTicks: number;
}
export interface Observation {
    difficulty:Difficulty;
    smokes: Smoke[];
    tracks: Track[];
    sightings: Sighting[];
    sounds: SoundCue[];
    ground: number[];
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
export function clearSight(map: GameMap, a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}): boolean { return !map.walls.some(w => segmentBox(a.x, a.y, b.x - a.x, b.y - a.y, w) !== undefined); }
export class SoloMatch {
    smokes: Smoke[] = [];
    tracks: Track[] = [];
    private rawSounds: RawSound[] = [];
    private nextEvidence = 1;
    private trackMemory: [
        Map<string, Track>,
        Map<string, Track>
    ] = [new Map(), new Map()];
    private sightings: [
        Map<number, Sighting>,
        Map<number, Sighting>
    ] = [new Map(), new Map()];
    private ground: [
        number[],
        number[]
    ] = [[], []];
    private groundDirty = true;
    private groundTick = [-10, -10];
    deploySmoke(id: number): boolean {
        const a = this.actors[id];
        if (!a || a.hp <= 0 || a.smokeReady > this.tick || this.paused || this.result !== null)
            return false;
        a.smokeReady = this.tick + 540;
        a.cannon.recoverFromSmoke();
        this.smokes.push({ id: this.nextEvidence++, x: a.x, y: a.y, expires: this.tick + 150 });
        this.sound(a, 'smoke', 200);
        this.groundDirty = true;
        return true;
    }
    private sound(a: Actor, kind: SoundCue['kind'], radius: number): void { this.rawSounds.push({ id: this.nextEvidence++, source: a.id, team: a.team, x: a.x, y: a.y, kind, radius, expires: this.tick + 12 }); this.rawSounds = this.rawSounds.slice(-96); }
    private observers(team: Team): Actor[] { return this.actors.filter(a => a.team === team && a.hp > 0); }
    private visibleTank(team: Team, a: Actor): boolean { return a.hp > 0 && this.observers(team).some(o => tankSight(this.map, this.smokes, o, a, this.tick)); }
    private visibleGround(team: Team, p: {
        x: number;
        y: number;
    }): boolean { return this.observers(team).some(o => groundSight(this.map, this.smokes, o, p)); }
    private updateEvidence(): void {
        this.smokes = this.smokes.filter(s => s.expires > this.tick);
        this.tracks = this.tracks.filter(t => t.expires > this.tick).slice(-640);
        this.rawSounds = this.rawSounds.filter(s => s.expires > this.tick);
        for (const team of [0, 1] as const) {
            const memory = this.sightings[team];
            for (const a of this.actors)
                if (a.team !== team && this.visibleTank(team, a))
                    memory.set(a.id, { id: a.id, x: a.x, y: a.y, expires: this.tick + 90 });
            for (const [id, s] of memory)
                if (s.expires <= this.tick)
                    memory.delete(id);
            const tracks = this.trackMemory[team];
            for (const t of this.tracks)
                if (!tracks.has(t.id) && this.visibleGround(team, t))
                    tracks.set(t.id, { ...t });
            for (const [id, t] of tracks)
                if (t.expires <= this.tick)
                    tracks.delete(id);
            while (tracks.size > 640)
                tracks.delete(tracks.keys().next().value!);
        }
        this.groundDirty = false;
    }
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
    constructor(readonly map: GameMap, readonly seed = 1,public difficulty:Difficulty='normal') { this.restart(); }
    get sites() { return this.map.sites ?? SOLO_LAYOUT.sites; }
    get spawnPoints() { return this.map.spawns ?? SOLO_LAYOUT.spawns; }
    get zone(): {
        x: number;
        y: number;
    } { return this.sites[Math.floor(this.tick / 1800) % 3]; }
    restart(): void { this.tick = 0; this.scores = [0, 0]; this.result = null; this.sudden = false; this.paused = false; this.shells = []; this.events = []; this.smokes = []; this.tracks = []; this.rawSounds = []; this.trackMemory = [new Map(), new Map()]; this.sightings = [new Map(), new Map()]; this.ground = [[], []]; this.groundTick = [-10, -10]; this.groundDirty = true; this.actors = Array.from({ length: 4 }, (_, id) => { const team = (id < 2 ? 0 : 1) as Team; return { id, team, ...this.spawnPoints[team][id % this.spawnPoints[team].length], hp: 100, hull: team === 0 ? 0 : Math.PI, turret: team === 0 ? 0 : Math.PI, speed: 0, respawn: 0, protection: 60, smokeReady: 0, revealUntil: 0, silent: false, trackDistance: 0, lastTrack: -100, cannon: new CombatSandbox() }; }); this.botStates = this.actors.map(a => newBotState(a.id + 1 + this.seed * 100)); this.updateEvidence(); }
    setPaused(value: boolean): void {
        this.paused = value;
        this.events = [];
        for (const a of this.actors)
            a.cannon.cancel();
        for (const b of this.botStates) {
            b.actions = [];
            b.drive = neutralInput();
        }
    }
    neutralize(): void { this.actors[0].cannon.cancel(); }
    private actorView(a: Actor): ActorView { const w = a.cannon.view(); return { id: a.id, team: a.team, x: a.x, y: a.y, hull: a.hull, turret: a.turret, speed: a.speed, hp: a.hp, respawn: a.respawn, protection: a.protection, weapon: w.weapon, charge: w.charge, remainingTicks: w.remainingTicks, smokeIn: Math.max(0, a.smokeReady - this.tick), quiet: a.silent && a.speed <= speedCap(this.map, a.x, a.y, true) + 0.1, revealed: a.revealUntil > this.tick }; }
    view(team: Team, listenerId = team === 0 ? 0 : 2, includeGround = true): Observation {
        const allies = this.actors.filter(a => a.team === team), observers = allies.filter(a => a.hp > 0);
        const visible = (p: {
            x: number;
            y: number;
        }) => observers.some(a => groundSight(this.map, this.smokes, a, p));
        const listener = observers.find(a => a.id === listenerId);
        const sounds: SoundCue[] = listener ? this.rawSounds.filter(s => s.team !== team && Math.hypot(s.x - listener.x, s.y - listener.y) <= s.radius).map(s => ({ id: s.id, kind: s.kind, sector: (Math.round(Math.atan2(s.y - listener.y, s.x - listener.x) / (Math.PI / 4)) + 8) % 8, band: Math.hypot(s.x - listener.x, s.y - listener.y) <= s.radius * 0.5 ? 'near' : 'far', expires: s.expires })) : [];
        if (includeGround && (this.groundDirty || this.tick - this.groundTick[team] >= 3 || this.groundTick[team] > this.tick)) {
            const cells: number[] = [];
            for (let i = 0; i < this.map.terrain.length; i++) {
                const p = { x: (i % this.map.width + 0.5) * this.map.tileSize, y: (Math.floor(i / this.map.width) + 0.5) * this.map.tileSize };
                if (visible(p))
                    cells.push(i);
            }
            this.ground[team] = cells;
            this.groundTick[team] = this.tick;
        }
        return { difficulty:this.difficulty,smokes: this.smokes.filter(s => observers.some(o => Math.hypot(o.x - s.x, o.y - s.y) <= 100 || groundSight(this.map, this.smokes.filter(c => c.id !== s.id), o, s, 540))).map(s => ({ ...s })), tracks: [...this.trackMemory[team].values()].map(t => ({ ...t, stage: Math.min(2, Math.floor((360 - (t.expires - this.tick)) / 120)) })), sightings: [...this.sightings[team].values()].filter(s => !this.actors.some(a => a.id === s.id && this.visibleTank(team, a))).map(s => ({ ...s })), sounds, ground: includeGround ? [...this.ground[team]] : [], tick: this.tick, paused: this.paused, allies: allies.map(a => this.actorView(a)), enemies: this.actors.filter(a => a.team !== team && a.hp > 0 && this.visibleTank(team, a)).map(a => this.actorView(a)), zone: { ...this.zone }, nextZone: { ...this.sites[(Math.floor(this.tick / 1800) + 1) % 3] }, rotationIn: (1800 - this.tick % 1800) / 30, scores: [...this.scores], secondsLeft: Math.max(0, ((this.sudden ? 14400 : 12600) - this.tick) / 30), sudden: this.sudden, result: this.result, shells: this.shells.filter(visible).map(s => ({ id: s.id, x: s.x, y: s.y, angle: s.angle, speed: s.speed, damage: s.damage, remaining: s.remaining, charge: s.charge, hostile: s.team !== team })), events: this.events.filter(visible).map(e => ({ ...e })) };
    }
    private spawn(a: Actor): void {
        const enemies = this.actors.filter(e => e.team !== a.team && e.hp > 0);
        const options = [...this.spawnPoints[a.team]].sort((p, q) => {
            const score = (v: {
                x: number;
                y: number;
            }) => Math.min(...enemies.map(e => Math.hypot(e.x - v.x, e.y - v.y) - (clearSight(this.map, e, v) ? 300 : 0)), 5000);
            return score(q) - score(p);
        });
        Object.assign(a, options[0], { hp: 100, speed: 0, vx: 0, vy: 0, respawn: 0, protection: 60, smokeReady: 0, revealUntil: 0, trackDistance: 0, lastTrack: -100, silent: false, hull: a.team === 0 ? 0 : Math.PI, turret: a.team === 0 ? 0 : Math.PI });
        a.cannon.reset();
        this.botStates[a.id] = newBotState(a.id + 1 + this.tick + this.seed * 100);
    }
    step(input: DriveInput = neutralInput(), actions: WeaponAction[] = [], smoke = false): void {
        if (this.paused || this.result !== null)
            return;
        this.events = [];
        const smokeIntents = this.actors.map(a => a.id === 0 && smoke);
        const old = new Map(this.actors.map(a => [a.id, { x: a.x, y: a.y }]));
        const intents = this.actors.map(a => ({ drive: a.id === 0 ? input : neutralInput(), actions: a.id === 0 ? actions : [] as WeaponAction[] }));
        if (this.botsEnabled)
            for (const a of this.actors.filter(a => a.id !== 0 && a.hp > 0)) {
                const b = this.botStates[a.id];
                if (this.tick % 5 === a.id % 5)
                    botIntent(this.view(a.team, a.id, false), a.id, this.map, b,this.difficulty);
                smokeIntents[a.id] = !!b.smoke;
                b.smoke = false;
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
            a.silent = intents[a.id].drive.silent;
            driveTank(a, intents[a.id].drive, this.map, a.cannon.mobility);
            const previous = old.get(a.id)!;
            const distance = Math.hypot(a.x - previous.x, a.y - previous.y);
            const surface = terrainAt(this.map, a.x, a.y);
            if (surface === 'mud') {
                a.trackDistance += distance;
                if (a.trackDistance >= 32 && this.tick - a.lastTrack >= 5) {
                    a.trackDistance = 0;
                    a.lastTrack = this.tick;
                    this.tracks.push({ id: 't' + (Math.imul(this.nextEvidence++, 2654435761) >>> 0).toString(36), x: a.x, y: a.y, axis: (Math.round(((Math.atan2(a.vy ?? 0, a.vx ?? 0) % Math.PI + Math.PI) % Math.PI) / (Math.PI / 16)) * (Math.PI / 16)) % Math.PI, expires: this.tick + 360, stage: 0 });
                }
            }
            else
                a.trackDistance = 0;
            if (this.tick % 8 === 0 && a.speed > 8 && !(a.silent && a.speed <= speedCap(this.map, a.x, a.y, true) + 0.1))
                this.sound(a, 'engine', 300 * (surface === 'mud' ? 1.25 : surface === 'brush' ? 0.75 : 1));
            if (this.tick % 15 === 0 && a.cannon.weapon === 'charging')
                this.sound(a, 'charge', 350);
            if (Math.hypot(a.x - this.zone.x, a.y - this.zone.y) <= 90)
                a.protection = 0;
        }
        for (const a of this.actors) {
            if (a.hp <= 0)
                continue;
            if (smokeIntents[a.id])
                this.deploySmoke(a.id);
            a.cannon.hp = a.hp;
            const previousWeapon = a.cannon.weapon;
            a.cannon.advanceWeapon(a, this.map, intents[a.id].actions);
            if (previousWeapon !== 'charging' && a.cannon.weapon === 'charging')
                this.sound(a, 'charge', 350);
            for (const e of a.cannon.view().events) {
                if (e.kind === 'shot') {
                    a.protection = 0;
                    a.revealUntil = this.tick + 36;
                    this.sound(a, 'shot', 700);
                }
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
        this.updateEvidence();
    }
}
