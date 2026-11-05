import { performance } from 'node:perf_hooks';
import { SoloMatch } from '../shared/sim/match';
import {relaySmallMap as trainingMap} from '../shared/content/relay-yard';
const count = Number(process.argv[2] ?? 100);
if (!Number.isInteger(count) || count < 1 || count > 1000)
    throw new Error('Use 1–1000 matches');
const started = performance.now(), wins = [0, 0];
let draws = 0, deaths = 0, maxShells = 0, maxIdle = 0, totalTicks = 0;
for (let seed = 1; seed <= count; seed++) {
    const match = new SoloMatch(trainingMap, seed), alive = [true, true, true, true], idle = [0, 0, 0, 0], prior = match.actors.map(a => ({ x: a.x, y: a.y }));
    for (let tick = 0; tick < 14400 && match.result === null; tick++) {
        match.step();
        maxShells = Math.max(maxShells, match.shells.length);
        match.actors.forEach((a, i) => {
            if (alive[i] && a.hp === 0)
                deaths++;
            alive[i] = a.hp > 0;
            const distance = Math.hypot(a.x - prior[i].x, a.y - prior[i].y);
            idle[i] = i > 0 && a.hp > 0 && distance < 0.1 && Math.hypot(a.x - match.zone.x, a.y - match.zone.y) > 100 ? idle[i] + 1 : 0;
            maxIdle = Math.max(maxIdle, idle[i]);
            prior[i] = { x: a.x, y: a.y };
            if (!Number.isFinite(a.x) || !Number.isFinite(a.y))
                throw new Error('Invalid tank state');
        });
    }
    if (match.result === null)
        throw new Error('Match did not terminate');
    if (match.result === 'draw')
        draws++;
    else
        wins[match.result]++;
    totalTicks += match.tick;
}
console.log(JSON.stringify({ matches: count, idleHuman: true, wins, draws, deaths, maxShells, maxBotIdleSeconds: maxIdle / 30, totalTicks, elapsedMs: Math.round(performance.now() - started) }, null, 2));
