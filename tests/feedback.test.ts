import {expect,it} from 'vitest';
import {SoloMatch} from '../shared/sim/match';
import {trainingMap,type GameMap} from '../shared/content';
function scenario(){
 const map:GameMap={...trainingMap,walls:[],terrain:trainingMap.terrain.map(()=>'grass')};const m=new SoloMatch(map);m.botsEnabled=false;
 m.actors.forEach(a=>Object.assign(a,{x:1000,y:800,protection:0}));Object.assign(m.actors[0],{x:100,y:100});Object.assign(m.actors[2],{x:180,y:100});
 m.shells=[{id:1,team:0,owner:0,x:140,y:100,angle:0,speed:3000,damage:22,remaining:900,charge:0}];return m;
}
it('confirms the firing player’s actual visible hit, not a teammate’s hit',()=>{
 const m=scenario();m.step();expect(m.view(0).feedback.map(c=>c.kind)).toEqual(['hit']);expect(m.view(0,1).feedback).toEqual([]);
 expect(m.view(1,2).feedback).toMatchObject([{kind:'damage',sector:4}]);
});
it('adds a destruction confirmation for a lethal visible hit, with no hidden identifiers or transforms',()=>{
 const m=scenario();m.actors[2].hp=22;m.step();expect(m.view(0).feedback.map(c=>c.kind)).toEqual(['hit','kill']);
 for(const cue of [...m.view(0).feedback,...m.view(1,2).feedback])expect(Object.keys(cue).sort()).toEqual(cue.kind==='damage'?['expires','id','kind','sector']:['expires','id','kind']);
});
it('does not confirm unseen targets or wall impacts',()=>{
 const hidden=scenario();hidden.actors[2].x=500;hidden.map.terrain[Math.floor(100/32)*hidden.map.width+Math.floor(500/32)]='brush';hidden.shells[0].x=460;
 hidden.step();expect(hidden.actors[2].hp).toBe(78);expect(hidden.view(0).feedback).toEqual([]);
 const wall=scenario();wall.map.walls.push({id:'block',x:150,y:80,width:10,height:40});wall.step();expect(wall.view(0).feedback).toEqual([]);
});
it('only the damaged actor receives coarse incoming direction even when the shooter is hidden',()=>{
 const m=scenario();Object.assign(m.actors[2],{x:1000,y:100});expect(m.view(0).enemies.some(a=>a.id===2)).toBe(false);m.shells=[{...m.shells[0],team:1,owner:2,x:60}];m.step();
 expect(m.view(0).feedback).toMatchObject([{kind:'damage',sector:4}]);expect(m.view(0,1).feedback).toEqual([]);
});
it('expires feedback in simulation time, freezes it on pause and clears it on restart',()=>{
 const m=scenario();m.step();const first=m.view(0).feedback;expect(first.length).toBeGreaterThan(0);m.setPaused(true);for(let i=0;i<60;i++)m.step();expect(m.view(0).feedback).toEqual(first);
 m.setPaused(false);for(let i=0;i<30;i++)m.step();expect(m.view(0).feedback).toEqual([]);m.restart();expect(m.view(0).feedback).toEqual([]);
});

it('does not turn a concealed destruction into an exact-location visual cue',()=>{
 const m=scenario();m.actors[2].x=500;m.actors[2].hp=22;m.map.terrain[Math.floor(100/32)*m.map.width+Math.floor(500/32)]='brush';m.shells[0].x=460;
 m.step();expect(m.view(0).events.filter(e=>e.kind==='destruction')).toEqual([]);expect(m.view(0).feedback).toEqual([]);
});
it('cannot request another team’s feedback by changing the listener id',()=>{
 const m=scenario();m.step();expect(m.view(0,2).feedback).toEqual([]);
});

it('preserves visible destruction effects through simultaneous lethal trades',()=>{
 const m=scenario();m.actors[0].hp=22;m.actors[2].hp=22;
 // Process the player's death first: effect authorization must not depend on damage iteration order.
 m.shells.unshift({...m.shells[0],id:2,team:1,owner:2,x:60});m.step();
 expect(m.view(0).events.some(e=>e.kind==='destruction'&&e.x===180)).toBe(true);
});
