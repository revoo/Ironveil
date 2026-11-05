import { it, expect } from 'vitest';
import { botIntent, newBotState } from '../shared/sim/bot';
import { SoloMatch } from '../shared/sim/match';
import { trainingMap } from '../shared/content';
it('navigates between search areas without hidden enemy inputs and is repeatable', () => {
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

it('uses smoke to reposition at low health and investigates only historical evidence after contact breaks',()=>{
 const m=new SoloMatch(trainingMap);Object.assign(m.actors[1],{x:300,y:600,hp:20});Object.assign(m.actors[2],{x:500,y:600});
 const state=newBotState(4);botIntent(m.view(0),1,trainingMap,state);expect(state.smoke).toBe(true);expect(state.mode).toBe('reposition');
 const observation=m.view(0);observation.enemies=[];observation.tick=100;observation.allies.find(a=>a.id===1)!.hp=100;observation.sightings=[{id:2,x:400,y:600,expires:190}];state.investigateUntil=0;
 botIntent(observation,1,trainingMap,state);expect(state.mode).toBe('investigate');expect(state.targetId).toBeUndefined();
});

it('finds a search route from the obstructed depot approach',async()=>{
 const {relaySmallMap}=await import('../shared/content/relay-yard');const m=new SoloMatch(relaySmallMap);Object.assign(m.actors[3],{x:790,y:400});
 const state=newBotState(1);botIntent(m.view(1),3,relaySmallMap,state);expect(state.path.length).toBeGreaterThan(0);
});

it('moves to another search area after arriving instead of camping a landmark',()=>{
 const m=new SoloMatch(trainingMap);const s=newBotState(12);let o=m.view(0);botIntent(o,1,trainingMap,s);
 const first={...s.goal!};Object.assign(m.actors[1],first);m.tick=5;o=m.view(0);o.enemies=[];o.sightings=[];o.tracks=[];o.sounds=[];botIntent(o,1,trainingMap,s);
 expect(Math.hypot(s.goal!.x-first.x,s.goal!.y-first.y)).toBeGreaterThan(80);expect(Math.hypot(s.drive.x,s.drive.y)).toBeGreaterThan(0);
});

it('resumes searching after reaching historical evidence and does not revisit the same stale contact',()=>{
 const m=new SoloMatch(trainingMap);Object.assign(m.actors[1],{x:300,y:600});const o=m.view(0);o.enemies=[];o.sightings=[{id:2,x:400,y:600,expires:90}];
 const s=newBotState(8);botIntent(o,1,trainingMap,s);expect(s.mode).toBe('investigate');
 Object.assign(o.allies.find(a=>a.id===1)!,{x:400,y:600});o.tick=5;botIntent(o,1,trainingMap,s);
 expect(s.mode).toBe('navigate');expect(Math.hypot(s.drive.x,s.drive.y)).toBeGreaterThan(0);
 o.tick=10;botIntent(o,1,trainingMap,s);expect(s.mode).toBe('navigate');
});
