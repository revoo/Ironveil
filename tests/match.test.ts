import { expect, it } from 'vitest';
import { SoloMatch } from '../shared/sim/match';
import { trainingMap } from '../shared/content';
it('starts a local 2v2 and freezes the entire world while paused', () => {
    const m = new SoloMatch(trainingMap);
    expect(m.view(0).allies).toHaveLength(2);
    expect(m.actors.filter(a => a.team === 1)).toHaveLength(2);
    m.setPaused(true);
    const before = JSON.stringify(m);
    for (let i = 0; i < 60; i++)
        m.step();
    expect(JSON.stringify(m)).toBe(before);
});
it('does not award points for occupying a landmark and preserves spawn protection there', () => {
 const m=new SoloMatch(trainingMap);m.botsEnabled=false;
 Object.assign(m.actors[0],{x:800,y:448});for(let i=0;i<30;i++)m.step();
 expect(m.scores).toEqual([0,0]);expect(m.actors[0].protection).toBe(30);
});
it('filters hidden enemies and excludes dead allies from vision', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    expect(m.view(0).enemies).toEqual([]);
    m.actors[1].x = m.actors[2].x - 50;
    m.actors[1].y = m.actors[2].y;
    expect(m.view(0).enemies.map(a => a.id)).toContain(2);
    m.actors[1].hp = 0;
    expect(m.view(0).enemies).toEqual([]);
});
it('respawns after five seconds and restarts with a clean clock and scores', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    m.actors[0].hp = 0;
    m.actors[0].respawn = 150;
    for (let i = 0; i < 149; i++)
        m.step();
    expect(m.actors[0].hp).toBe(0);
    m.step();
    expect(m.actors[0].hp).toBe(100);
    m.restart();
    expect(m.tick).toBe(0);
    expect(m.scores).toEqual([0, 0]);
    expect(m.actors.every(a => a.hp === 100)).toBe(true);
});
it('declares a winner and resolves tied time expiry through sudden death', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    m.scores = [15, 0];
    m.step();
    expect(m.result).toBe(0);
    m.restart();
    m.botsEnabled = false;
    m.tick = 12600 - 1;
    m.step();
    expect(m.sudden).toBe(true);
    expect(m.result).toBeNull();
    Object.assign(m.actors[2],{x:180,y:100,hp:22,protection:0});
    m.shells=[{id:1,team:0,x:140,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0}];m.step();
    expect(m.result).toBe(0);
});
it('allied shells pass through teammates and hit the nearest unprotected enemy', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    m.actors.forEach(a => { a.protection = 0; a.x = 1000; a.y = 800; });
    m.actors[1].x = 140;
    m.actors[1].y = 100;
    m.actors[2].x = 180;
    m.actors[2].y = 100;
    m.shells = [{ id: 1, team: 0, x: 100, y: 100, angle: 0, speed: 3000, damage: 55, remaining: 900, charge: 1 }];
    m.step();
    expect(m.actors[1].hp).toBe(100);
    expect(m.actors[2].hp).toBe(45);
});
it('counts simultaneous lethal trades once for each team', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    m.tick = 29;
    const a = m.actors[0], b = m.actors[2];
    Object.assign(a, { x: 800, y: 448, hp: 22, protection: 0 });
    Object.assign(b, { x: 900, y: 448, hp: 22, protection: 0 });
    m.shells = [{ id: 1, team: 1, x: 750, y: 448, angle: 0, speed: 3000, damage: 22, remaining: 900, charge: 0 }, { id: 2, team: 0, x: 850, y: 448, angle: 0, speed: 3000, damage: 22, remaining: 900, charge: 0 }];
    m.step();
    expect(a.hp).toBe(0);
    expect(b.hp).toBe(0);
    expect(m.scores).toEqual([1, 1]);
});
it('spawn protection ends on firing and tied sudden death can end as a draw', () => {
    const m = new SoloMatch(trainingMap);
    m.botsEnabled = false;
    m.step(undefined, ['press', 'release']);
    expect(m.actors[0].protection).toBe(0);
    m.tick = 14399;
    m.sudden = true;
    m.step();
    expect(m.result).toBe('draw');
});
it('keeps authority isolated from mutation of an observation and never sends hidden enemy events', () => {
    const m = new SoloMatch(trainingMap);
    const obs = m.view(0);
    obs.allies[0].hp = 1;
    obs.allies[0].x = 999;
    expect(m.actors[0].hp).toBe(100);
    expect(m.actors[0].x).toBe(160);
    m.events = [{ id: 1, kind: 'shot', x: 1440, y: 688, charge: 1 }];
    expect(m.view(0).events).toEqual([]);
});
it('does not advance a finished match', () => { const m = new SoloMatch(trainingMap); m.botsEnabled = false; m.scores = [15, 0]; m.step(); const tick = m.tick; m.step(); expect(m.tick).toBe(tick); });

it('landmarks do not end spawn protection before projectile resolution',()=>{
 const m=new SoloMatch(trainingMap);m.botsEnabled=false;Object.assign(m.actors[0],{x:800,y:448,protection:60});
 m.shells=[{id:1,team:1,x:750,y:448,angle:0,speed:3000,damage:22,remaining:900,charge:0}];m.step();expect(m.actors[0].hp).toBe(100);
});

it('respawn clears momentum from the previous life',()=>{const m=new SoloMatch(trainingMap);m.botsEnabled=false;Object.assign(m.actors[0],{hp:0,respawn:1,vx:180,vy:100});m.step();expect(m.actors[0].vx).toBe(0);expect(m.actors[0].vy).toBe(0);expect(m.actors[0].speed).toBe(0);});

it('resolves simultaneous target kills without actor-order bias and gives a full overtime minute',()=>{
 const m=new SoloMatch(trainingMap);m.botsEnabled=false;m.scores=[14,14];
 Object.assign(m.actors[0],{x:100,y:100,hp:22,protection:0});Object.assign(m.actors[2],{x:300,y:100,hp:22,protection:0});
 m.shells=[{id:1,team:1,x:60,y:100,angle:0,speed:3000,damage:55,remaining:900,charge:1},{id:2,team:0,x:260,y:100,angle:0,speed:3000,damage:55,remaining:900,charge:1},{id:3,team:0,x:260,y:100,angle:0,speed:3000,damage:55,remaining:900,charge:1}];
 m.step();expect(m.scores).toEqual([15,15]);expect(m.result).toBeNull();expect(m.sudden).toBe(true);expect(m.view(0).secondsLeft).toBe(60);
 for(let i=0;i<1800;i++)m.step();expect(m.result).toBe('draw');
});
