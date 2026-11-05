import type { Observation } from '../shared/sim/match';
import { terrainAt } from '../shared/sim';
import { relaySmallMap } from '../shared/content/relay-yard';
export const LESSONS = [
    ['Drive and turn', 'Use your movement keys to travel and change direction. Momentum carries through a turn; countersteer to recover.'],
    ['Aim independently', 'Move the mouse to turn the barrel. The crosshair is requested aim; the barrel catches up at its own speed.'],
    ['Tap fire', 'Aim at the orange target, then tap your fire key. Shells travel along the actual barrel, not the cursor.'],
    ['Charge and cancel', 'Hold fire, cancel once with right-click or your cancel key, then charge again and release at 75% or more. Charge costs mobility; holding too long vents.'],
    ['Read mud evidence', 'Drive right through the mud until you leave a pair of tread marks. Stamps suggest a route, without an owner or travel-direction arrow.'],
    ['Use brush', 'Drive down into the brush patch and stop. Brush hides distant occupants; close enemies and firing can reveal you.'],
    ['Approach quietly', 'Hold your quiet key and move at least 20 pixels. Quiet movement starts only after actual speed falls to the quiet cap; it is not invisibility.'],
    ['Smoke escape', 'Deploy smoke, then drive more than 110 pixels from the deployment point. Smoke blocks sight for both teams, but shells pass through.'],
    ['Contest the relay', 'Move into the ring and stay until your team earns a point. Both teams inside means no scoring; kills alone give no points.'],
] as const;
export class TutorialProgress {
    index = 0;
    private start?: {
        x: number;
        y: number;
        hull: number;
        turret: number;
    };
    private aimed = false;
    private cancelled = false;
    private tapFired = false;
    private chargedFired = false;
    aimMoved(): void { this.aimed = true; }
    observe(o: Observation): boolean {
        const me = o.allies[0];
        if (!me || o.paused || this.index >= LESSONS.length)
            return false;
        this.start ??= { x: me.x, y: me.y, hull: me.hull, turret: me.turret };
        const distance = Math.hypot(me.x - this.start.x, me.y - this.start.y);
        let done = false;
        if (this.index === 0)
            done = distance >= 60 && Math.abs(me.hull - this.start.hull) > .3;
        if (this.index === 1)
            done = this.aimed && Math.abs(me.turret - this.start.turret) > .5;
        if (this.index === 2) {
            this.tapFired ||= o.events.some(e => e.kind === 'shot' && e.charge < .1);
            done = this.tapFired && o.enemies.some(a => a.hp < 100);
        }
        if (this.index === 3) {
            this.cancelled ||= me.weapon === 'cancel recovery';
            this.chargedFired ||= o.events.some(e => e.kind === 'shot' && e.charge >= .75);
            done = this.cancelled && this.chargedFired && o.enemies.some(a => a.hp < 100);
        }
        if (this.index === 4)
            done = o.tracks.length > 0;
        if (this.index === 5)
            done = terrainAt(relaySmallMap, me.x, me.y) === 'brush' && me.speed < 2;
        if (this.index === 6)
            done = me.quiet && distance >= 20;
        if (this.index === 7)
            done = me.smokeIn > 0 && distance > 110;
        if (this.index === 8)
            done = o.scores[0] > 0;
        if (done) {
            this.index++;
            this.start = undefined;
            this.aimed = false;
            this.cancelled = false;
            this.tapFired = false;
            this.chargedFired = false;
        }
        return done;
    }
}
