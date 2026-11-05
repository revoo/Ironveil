import {expect,it} from 'vitest';import {botIntent,newBotState} from '../shared/sim/bot';import {SoloMatch} from '../shared/sim/match';import {trainingMap,type GameMap} from '../shared/content';
const map=():GameMap=>({...trainingMap,walls:[],terrain:trainingMap.terrain.map(()=>'grass')});
function setup(){const m=new SoloMatch(map());Object.assign(m.actors[1],{x:300,y:300,turret:0,protection:0});Object.assign(m.actors[2],{x:500,y:300,protection:0});return m;}
it('executes a planned smoke-and-withdraw sequence at low health',()=>{
 const m=setup(),s=newBotState(4);m.actors[1].hp=20;botIntent(m.view(0),1,m.map,s);expect(s.plan).toEqual(['smoke','withdraw']);expect(s.smoke).toBe(true);expect(s.mode).toBe('reposition');expect(Math.hypot(s.drive.x,s.drive.y)).toBeGreaterThan(0);
});
it('assigns complementary roles and distinct maneuver destinations to teammates engaging one contact',()=>{
 const m=setup();Object.assign(m.actors[0],{x:700,y:450});Object.assign(m.actors[1],{x:100,y:100});Object.assign(m.actors[2],{x:300,y:450});Object.assign(m.actors[3],{x:320,y:550});const a=newBotState(8),b=newBotState(9);
 botIntent(m.view(1),2,m.map,a);botIntent(m.view(1),3,m.map,b);expect([a.role,b.role].sort()).toEqual(['engage','flank']);expect(Math.hypot(a.goal!.x-b.goal!.x,a.goal!.y-b.goal!.y)).toBeGreaterThan(80);expect(a.plan.length).toBeGreaterThan(0);expect(b.plan.length).toBeGreaterThan(0);
});
it('leads motion learned through successive authorized observations',()=>{
 const m=setup(),s=newBotState(9);botIntent(m.view(0),1,m.map,s,'hard');m.tick=5;m.actors[2].y=320;botIntent(m.view(0),1,m.map,s,'hard');expect(s.drive.aim).toBeGreaterThan(Math.atan2(20,200)+.03);
});
it('keeps attention on its current target when a marginally closer enemy appears',()=>{
 const m=setup(),s=newBotState(9);botIntent(m.view(0),1,m.map,s);m.tick=5;Object.assign(m.actors[3],{x:480,y:320});botIntent(m.view(0),1,m.map,s);expect(s.targetId).toBe(2);
});
it('produces identical plans from identical observations regardless of hidden world changes',()=>{
 const m=setup();Object.assign(m.actors[2],{x:1400,y:800});const observation=m.view(0),a=newBotState(8),b=newBotState(8);botIntent(observation,1,m.map,a);Object.assign(m.actors[2],{x:1300,y:800,hp:1,turret:2});botIntent(m.view(0),1,m.map,b);expect(a).toEqual(b);
});

it('preserves each tank’s personality across respawn while resetting its tactical memory',()=>{
 const m=setup();m.botsEnabled=false;m.tick=300;const read=()=> (m as unknown as {botStates:ReturnType<typeof newBotState>[]}).botStates[1];const traits={...read().traits};read().memory.clues.push({key:'old',x:300,y:300,expires:500,confidence:1});Object.assign(m.actors[1],{hp:0,respawn:1});m.step();expect(read().traits).toEqual(traits);expect(read().memory.clues).toEqual([]);
});

it('commits to an investigation when another clue becomes only marginally more attractive',()=>{
 const m=setup(),s=newBotState(9),o=m.view(0);o.enemies=[];s.memory.clues=[{key:'sound:a',x:800,y:300,expires:90,confidence:.5},{key:'sound:b',x:800,y:340,expires:90,confidence:.5}];botIntent(o,1,m.map,s);const key=s.intention!.key,goal={...s.goal!};o.tick=5;o.allies.find(a=>a.id===1)!.y=330;botIntent(o,1,m.map,s);expect(s.intention!.key).toBe(key);expect(s.goal).toEqual(goal);
});
it('reengages after a completed low-health withdrawal instead of retreating forever',()=>{
 const m=setup(),s=newBotState(4),o=m.view(0),self=o.allies.find(a=>a.id===1)!;self.hp=20;botIntent(o,1,m.map,s);expect(s.intention!.key).toBe('survive');Object.assign(self,{...s.goal!,smokeIn:500});o.tick=30;botIntent(o,1,m.map,s);o.tick=35;botIntent(o,1,m.map,s);expect(s.intention!.key).not.toBe('survive');
});
it('moves before charging when a covered firing-angle route is too long to precharge safely',()=>{
 const m=setup(),s=newBotState(9);Object.assign(m.actors[0],{x:700,y:450});Object.assign(m.actors[1],{x:300,y:320});Object.assign(m.actors[2],{x:700,y:320});m.map.walls=[{id:'long-cover',x:400,y:240,width:32,height:160}];botIntent(m.view(0),1,m.map,s);expect(s.plan[0]).toBe('take-angle');
});

it('expresses aggressive pressure versus cautious relocation at the same post-shot opportunity',()=>{
 const m=setup(),o=m.view(0),a=newBotState(9),b=newBotState(9);a.traits={...a.traits,aggression:.9,caution:.2};b.traits={...b.traits,aggression:.2,caution:.9};botIntent(o,1,m.map,a);botIntent(o,1,m.map,b);o.tick=10;botIntent(o,1,m.map,a);botIntent(o,1,m.map,b);Object.assign(o.allies.find(a=>a.id===1)!,{weapon:'reloading',remainingTicks:15});o.tick=15;botIntent(o,1,m.map,a);botIntent(o,1,m.map,b);expect(a.mode).toBe('attack');expect(b.mode).toBe('reposition');
});

it('plans directly to fire when an aligned shot is already charged instead of charging again',()=>{
 const m=setup(),s=newBotState(9);m.actors[1].cannon.advanceWeapon(m.actors[1],m.map,['press']);for(let i=0;i<30;i++)m.actors[1].cannon.advanceWeapon(m.actors[1],m.map,[]);botIntent(m.view(0),1,m.map,s);expect(s.plan).toEqual(['fire']);expect(s.actions).not.toContain('release');m.tick=10;botIntent(m.view(0),1,m.map,s);expect(s.actions).toContain('release');
});

it('invalidates a planned charged shot when its real weapon precondition is interrupted',()=>{
 const m=setup(),s=newBotState(9);m.actors[2].x=700;m.actors[1].cannon.advanceWeapon(m.actors[1],m.map,['press']);for(let i=0;i<35;i++)m.actors[1].cannon.advanceWeapon(m.actors[1],m.map,[]);botIntent(m.view(0),1,m.map,s);expect(s.plan).toEqual(['fire']);m.actors[1].cannon.reset();m.tick=10;botIntent(m.view(0),1,m.map,s);expect(s.actions).not.toContain('release');
});

it('abandons an unproductive firing hold and finds another angle after a bounded wait',()=>{
 const m=setup(),s=newBotState(9),o=m.view(0);o.allies.find(a=>a.id===1)!.turret=Math.PI/2;let moved=false;
 for(let tick=0;tick<=150;tick+=5){o.tick=tick;botIntent(o,1,m.map,s);if(tick>90&&s.mode==='reposition'&&Math.hypot(s.drive.x,s.drive.y)>0)moved=true;}
 expect(moved).toBe(true);
});
