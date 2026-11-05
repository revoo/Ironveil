import {expect,it} from 'vitest';import {planActions,Fact as F,chooseIntention} from '../shared/sim/ai/planner';import {newMemory,updateMemory} from '../shared/sim/ai/memory';import {personality,assignRole,choosePosition} from '../shared/sim/ai/positions';import {interceptAim,dodgeProjectile} from '../shared/sim/ai/combat';import {SoloMatch,clearSight} from '../shared/sim/match';import {trainingMap,type GameMap} from '../shared/content';
const openMap=():GameMap=>({...trainingMap,walls:[],terrain:trainingMap.terrain.map(()=>'grass')});
function scene(){const map=openMap(),m=new SoloMatch(map);Object.assign(m.actors[1],{x:300,y:300});Object.assign(m.actors[2],{x:500,y:300});Object.assign(m.actors[0],{x:200,y:600});return{map,m,o:m.view(0)};}
it('searches action preconditions rather than returning a fixed attack sequence',()=>{
 const actions=[{name:'take-angle',require:F.Contact,add:F.Angle,cost:2},{name:'charge',require:F.Ready|F.Angle,add:F.Charged,remove:F.Ready,cost:1},{name:'fire',require:F.Charged|F.Angle,add:F.Pressure,remove:F.Charged,cost:.2}];
 expect(planActions(F.Contact|F.Ready,F.Pressure,actions)).toEqual(['take-angle','charge','fire']);expect(planActions(F.Contact|F.Angle|F.Charged,F.Pressure,actions)).toEqual(['fire']);expect(planActions(0,F.Pressure,actions)).toEqual([]);
});
it('chooses a cheaper smoke-and-withdraw plan only when smoke is available',()=>{
 const actions=[{name:'move-cover',require:F.Contact,add:F.Safe,cost:5},{name:'smoke',require:F.SmokeReady,add:F.Screened,remove:F.SmokeReady,cost:.5},{name:'withdraw',require:F.Screened,add:F.Safe,cost:1}];
 expect(planActions(F.Contact|F.SmokeReady,F.Safe,actions)).toEqual(['smoke','withdraw']);expect(planActions(F.Contact,F.Safe,actions)).toEqual(['move-cover']);expect(planActions(F.Contact,F.Safe,actions,0)).toEqual([]);
});
it('keeps a committed intention through small utility changes but interrupts for danger',()=>{
 const options=[{key:'attack',score:.8},{key:'flank',score:.9}];expect(chooseIntention(options,{key:'attack',until:45},10).key).toBe('attack');expect(chooseIntention(options,{key:'attack',until:45},46).key).toBe('flank');expect(chooseIntention(options,{key:'attack',until:45},10,true).key).toBe('flank');
});
it('remembers only observed movement and resets velocity after a hidden interval',()=>{
 const {map,o}=scene(),memory=newMemory();updateMemory(o,1,map,memory,90);o.tick=5;o.enemies.find(a=>a.id===2)!.y+=20;updateMemory(o,1,map,memory,90);expect(memory.contacts.find(c=>c.id===2)!.vy).toBeGreaterThan(0);
 o.tick=10;o.enemies=[];updateMemory(o,1,map,memory,90);o.tick=20;o.enemies=[{...new SoloMatch(map).view(0).allies[0],id:2,team:1,x:500,y:400}];updateMemory(o,1,map,memory,90);expect(memory.contacts.find(c=>c.id===2)!.vy).toBe(0);
});
it('expands uncertain last-known positions without following hidden live state and eventually forgets',()=>{
 const {map,o}=scene(),memory=newMemory();o.enemies[0].x=850;updateMemory(o,1,map,memory,90);o.enemies=[];o.tick=30;updateMemory(o,1,map,memory,90);const c=memory.contacts[0];expect(c.visible).toBe(false);expect(c.confidence).toBeLessThan(1);expect(c.hypotheses.length).toBeGreaterThan(1);expect(new Set(c.hypotheses.map(p=>p.x+','+p.y)).size).toBeGreaterThan(1);o.tick=91;updateMemory(o,1,map,memory,90);expect(memory.contacts).toEqual([]);
});
it('clears search hypotheses that are visibly empty and treats tracks as anonymous clues',()=>{
 const {map,o}=scene(),memory=newMemory();updateMemory(o,1,map,memory,90);o.tick=5;o.enemies=[];o.tracks=[{id:'anonymous',x:350,y:320,axis:0,expires:360,stage:0}];updateMemory(o,1,map,memory,90);expect(memory.contacts[0].hypotheses).toEqual([]);const clue=memory.clues.find(c=>c.key==='track:anonymous');expect(clue).toBeDefined();expect(clue).not.toHaveProperty('owner');expect(clue).not.toHaveProperty('targetId');
});
it('derives repeatable personalities and complementary team roles from authorized positions',()=>{
 expect(personality(4)).toEqual(personality(4));expect(personality(4)).not.toEqual(personality(17));const {o}=scene();Object.assign(o.allies[0],{x:450,y:300});expect(assignRole(o,0,{x:500,y:300})).toBe('engage');expect(assignRole(o,1,{x:500,y:300})).toBe('flank');o.allies[0].hp=0;expect(assignRole(o,1,{x:500,y:300})).toBe('engage');
});
it('selects reachable hard cover with escape space for withdrawal',()=>{
 const {map,o}=scene();map.walls=[{id:'cover',x:400,y:240,width:32,height:160}];const self=o.allies.find(a=>a.id===1)!,target={x:600,y:300};const p=choosePosition(map,self,target,o.allies,'engage','retreat',personality(4));expect(p).toBeDefined();expect(p!.path.length).toBeGreaterThan(0);expect(p!.cover).toBe(true);expect(clearSight(map,target,p!)).toBe(false);expect(p!.escape).toBeGreaterThanOrEqual(2);
});
it('takes a different firing angle for the flanker while preserving a reachable shot',()=>{
 const {map,o}=scene(),self=o.allies.find(a=>a.id===1)!,target={x:600,y:300};Object.assign(o.allies[0],{x:400,y:300});const a=choosePosition(map,self,target,o.allies,'engage','attack',personality(4))!,b=choosePosition(map,self,target,o.allies,'flank','attack',personality(4))!;expect(a).toBeDefined();expect(b).toBeDefined();expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThan(80);expect(clearSight(map,b,target)).toBe(true);
});
it('leads visible moving targets and aims directly at stationary ones',()=>{
 expect(interceptAim({x:100,y:100},{x:300,y:100,vx:0,vy:100},600)).toBeGreaterThan(.1);expect(interceptAim({x:100,y:100},{x:300,y:100,vx:0,vy:0},600)).toBe(0);
});
it('reacts to an observed incoming projectile after a delay and ignores friendly or absent shells',()=>{
 const {map,o}=scene(),self=o.allies.find(a=>a.id===1)!,a={noticed:{}};o.shells=[{id:1,x:200,y:300,angle:0,speed:400,damage:22,remaining:900,charge:0,hostile:true}];expect(dodgeProjectile(o,self,map,a,9)).toBeUndefined();o.tick=10;const dodge=dodgeProjectile(o,self,map,a,9);expect(dodge).toBeDefined();expect(Math.abs(dodge!.y-self.y)).toBeGreaterThan(40);o.shells[0].hostile=false;expect(dodgeProjectile(o,self,map,a,9)).toBeUndefined();o.shells=[];expect(dodgeProjectile(o,self,map,a,9)).toBeUndefined();
});

it('can route around known exposure instead of always taking the shortest terrain route',async()=>{
 const {findPath}=await import('../shared/sim/navigation');const map={...openMap(),width:10,height:6,terrain:Array(60).fill('grass')} as GameMap;
 const path=findPath(map,{x:48,y:48},{x:240,y:48},p=>p.y<80&&p.x>64&&p.x<224?20:0);expect(path.some(p=>p.y>=80)).toBe(true);
});

it('does not label a position safe cover when another observed enemy still has a clear shot',()=>{
 const {map,o}=scene();map.walls=[{id:'one-sided',x:400,y:240,width:32,height:160}];const target={x:600,y:300};const p=choosePosition(map,o.allies.find(a=>a.id===1)!,target,o.allies,'engage','retreat',personality(4),[target,{x:200,y:300}]);expect(p).toBeDefined();expect(p!.cover).toBe(false);
});

it('updates old memory from a newer authorized teammate sighting',()=>{
 const {map,o}=scene(),memory=newMemory();updateMemory(o,1,map,memory,90);o.tick=30;o.enemies=[];o.sightings=[{id:2,x:800,y:300,expires:115}];updateMemory(o,1,map,memory,90);expect(memory.contacts[0].seen).toBe(25);expect(memory.contacts[0].x).toBe(800);expect(memory.contacts[0].vx).toBe(0);
});
it('accounts for its own observed drift instead of dodging a projectile it is already moving clear of',()=>{
 const {map,o}=scene(),self=o.allies.find(a=>a.id===1)!,a={noticed:{}};self.y=240;o.shells=[{id:1,x:200,y:300,angle:0,speed:400,damage:22,remaining:900,charge:0,hostile:true}];dodgeProjectile(o,self,map,a,9);o.tick=10;self.y=300;expect(dodgeProjectile(o,self,map,a,9)).toBeUndefined();
});

it('gives neighboring bot identities meaningfully different persistent aggression traits',()=>{
 const values=[103,104,105].map(seed=>personality(seed).aggression);expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.1);
});
it('assigns covering pressure to a healthy teammate when the nearer ally is badly hurt',()=>{
 const {o}=scene();Object.assign(o.allies[0],{x:550,y:300,hp:20});Object.assign(o.allies[1],{x:100,y:300,hp:100});expect(assignRole(o,1,{x:600,y:300})).toBe('engage');expect(assignRole(o,0,{x:600,y:300})).toBe('flank');
});

it('escapes an off-grid but physically traversable gap instead of being stranded outside the nav grid',async()=>{
 const {findPath}=await import('../shared/sim/navigation');const {relaySmallMap}=await import('../shared/content/relay-yard');const path=findPath(relaySmallMap,{x:567.2149749357695,y:474.4537915045481},{x:800,y:448});expect(path.length).toBeGreaterThan(0);expect(path[0].y).toBeGreaterThan(480);
});

it('connects a circular hull resting outside a wall corner back to the navigation grid',async()=>{
 const {findPath}=await import('../shared/sim/navigation');const {relaySmallMap}=await import('../shared/content/relay-yard');const path=findPath(relaySmallMap,{x:471.6329758302731,y:365.7971513408883},{x:800,y:256});expect(path.length).toBeGreaterThan(0);
});
