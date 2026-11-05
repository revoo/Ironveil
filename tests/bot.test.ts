import { it, expect } from 'vitest';
import { botIntent, newBotState } from '../shared/sim/bot';
import { SoloMatch } from '../shared/sim/match';
import { trainingMap } from '../shared/content';
it('navigates toward the objective without hidden enemy inputs and is repeatable', () => {
    const m = new SoloMatch(trainingMap), a = newBotState(12), b = newBotState(12), obs = m.view(0);
    expect(obs.enemies).toHaveLength(0);
    botIntent(obs, 1, trainingMap, a);
    botIntent(obs, 1, trainingMap, b);
    expect(a).toEqual(b);
    expect(Math.hypot(a.drive.x, a.drive.y)).toBeGreaterThan(0);
    expect(a.path.length).toBeGreaterThan(0);
    expect(JSON.stringify(obs)).not.toContain('cannon');
});
it('fires only after acquiring a visible aligned target, then releases a charged shot', () => {
    const m = new SoloMatch(trainingMap);
    m.actors[1].x = 300;
    m.actors[1].y = 600;
    m.actors[1].turret = 0;
    m.actors[2].x = 500;
    m.actors[2].y = 600;
    const state = newBotState(9);
    botIntent(m.view(0), 1, trainingMap, state);
    expect(state.actions).not.toContain('press');
    m.tick = 10;
    botIntent(m.view(0), 1, trainingMap, state);
    expect(state.actions).toContain('press');
    m.actors[1].cannon.step(m.actors[1], trainingMap, ['press']);
    for (let i = 0; i < 30; i++)
        m.actors[1].cannon.advanceWeapon(m.actors[1], trainingMap, []);
    botIntent(m.view(0), 1, trainingMap, state);
    expect(state.actions).toContain('release');
});
it('does not attack an enemy known by a teammate through the bots own cover', () => {
    const m = new SoloMatch(trainingMap);
    Object.assign(m.actors[1], { x: 400, y: 320, turret: 0 });
    Object.assign(m.actors[0], { x: 600, y: 400 });
    Object.assign(m.actors[2], { x: 600, y: 320 });
    const s = newBotState(1);
    botIntent(m.view(0), 1, trainingMap, s);
    m.tick = 10;
    botIntent(m.view(0), 1, trainingMap, s);
    expect(s.actions).not.toContain('press');
});
